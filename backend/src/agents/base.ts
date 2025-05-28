import { Tool, ToolResult, AgentType, AgentLog } from '../shared';
import { LoggerService } from '../services/logger';
import { WebSocketService } from '../services/websocket';
import { v4 as uuidv4 } from 'uuid';

export interface AgentConfig {
  name: string;
  type: AgentType;
  description: string;
  tools: Tool[];
  maxIterations?: number;
  timeout?: number;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected logger: LoggerService;
  protected websocket: WebSocketService | undefined;
  protected sessionId?: string;

  constructor(config: AgentConfig, websocket?: WebSocketService) {
    this.config = config;
    this.logger = new LoggerService();
    this.websocket = websocket;
  }

  public setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  protected async logAction(
    action: string,
    input: any,
    output: any,
    success: boolean,
    duration: number,
    error?: string
  ): Promise<void> {
    const log: AgentLog = {
      id: uuidv4(),
      timestamp: new Date(),
      agentType: this.config.type,
      action,
      input,
      output,
      success,
      duration,
      error
    };

    this.logger.info(`Agent ${this.config.name} - ${action}`, {
      success,
      duration,
      error
    });

    if (this.websocket && this.sessionId) {
      this.websocket.sendAgentLog(this.sessionId, log);
    }
  }

  protected async executeTool(
    toolName: string,
    input: any
  ): Promise<ToolResult> {
    const tool = this.config.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(input);
      const duration = Date.now() - startTime;

      await this.logAction(
        `Execute Tool: ${toolName}`,
        input,
        result.data,
        result.success,
        duration,
        result.error
      );

      if (this.websocket && this.sessionId) {
        this.websocket.sendToolUsage(this.sessionId, {
          toolName,
          input,
          output: result.data,
          duration,
          success: result.success,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logAction(
        `Execute Tool: ${toolName}`,
        input,
        null,
        false,
        duration,
        errorMessage
      );

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  // Abstract methods that must be implemented by subclasses
  public abstract execute(input: any): Promise<any>;
  public abstract getName(): string;
  public abstract getDescription(): string;
}

export interface AgentMemory {
  shortTerm: Map<string, any>;
  longTerm: Map<string, any>;
  context: any;
}

export class AgentMemoryManager {
  private memory: AgentMemory;
  private maxShortTermItems: number = 100;
  private maxLongTermItems: number = 1000;

  constructor() {
    this.memory = {
      shortTerm: new Map(),
      longTerm: new Map(),
      context: {}
    };
  }

  // Short-term memory operations
  public setShortTerm(key: string, value: any): void {
    if (this.memory.shortTerm.size >= this.maxShortTermItems) {
      const firstKey = this.memory.shortTerm.keys().next().value;
      if (firstKey !== undefined) {
        this.memory.shortTerm.delete(firstKey);
      }
    }
    this.memory.shortTerm.set(key, {
      value,
      timestamp: new Date(),
      accessCount: 0
    });
  }

  public getShortTerm(key: string): any {
    const item = this.memory.shortTerm.get(key);
    if (item) {
      item.accessCount++;
      item.lastAccessed = new Date();
      return item.value;
    }
    return null;
  }

  // Long-term memory operations
  public setLongTerm(key: string, value: any, importance: number = 0.5): void {
    if (this.memory.longTerm.size >= this.maxLongTermItems) {
      // Remove least important/oldest items
      this.cleanupLongTermMemory();
    }
    
    this.memory.longTerm.set(key, {
      value,
      importance,
      timestamp: new Date(),
      accessCount: 0
    });
  }

  public getLongTerm(key: string): any {
    const item = this.memory.longTerm.get(key);
    if (item) {
      item.accessCount++;
      item.lastAccessed = new Date();
      return item.value;
    }
    return null;
  }

  // Context operations
  public setContext(key: string, value: any): void {
    this.memory.context[key] = value;
  }

  public getContext(key?: string): any {
    if (key) {
      return this.memory.context[key];
    }
    return this.memory.context;
  }

  // Memory cleanup
  private cleanupLongTermMemory(): void {
    const items = Array.from(this.memory.longTerm.entries());
    items.sort((a, b) => {
      const scoreA = a[1].importance * a[1].accessCount;
      const scoreB = b[1].importance * b[1].accessCount;
      return scoreA - scoreB;
    });

    // Remove bottom 10% of items
    const itemsToRemove = Math.floor(items.length * 0.1);
    for (let i = 0; i < itemsToRemove; i++) {
      this.memory.longTerm.delete(items[i][0]);
    }
  }

  // Get memory statistics
  public getStats(): any {
    return {
      shortTermCount: this.memory.shortTerm.size,
      longTermCount: this.memory.longTerm.size,
      contextKeys: Object.keys(this.memory.context).length
    };
  }

  // Export/Import memory for persistence with date serialization
  public exportMemory(): any {
    const serializeValue = (value: any): any => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'object' && value !== null) {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = serializeValue(val);
        }
        return result;
      }
      return value;
    };

    const shortTermArray = Array.from(this.memory.shortTerm.entries()).map(([key, value]) => [
      key,
      serializeValue(value)
    ]);

    const longTermArray = Array.from(this.memory.longTerm.entries()).map(([key, value]) => [
      key,
      serializeValue(value)
    ]);

    return {
      shortTerm: shortTermArray,
      longTerm: longTermArray,
      context: serializeValue(this.memory.context)
    };
  }

  public importMemory(data: any): void {
    if (data.shortTerm) {
      this.memory.shortTerm = new Map(data.shortTerm);
    }
    if (data.longTerm) {
      this.memory.longTerm = new Map(data.longTerm);
    }
    if (data.context) {
      this.memory.context = data.context;
    }
  }
}
