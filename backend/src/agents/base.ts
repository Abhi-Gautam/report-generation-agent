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
    
    const now = new Date();
    this.memory.shortTerm.set(key, {
      value,
      timestamp: isNaN(now.getTime()) ? new Date() : now,
      accessCount: 0
    });
  }

  public getShortTerm(key: string): any {
    const item = this.memory.shortTerm.get(key);
    if (item) {
      item.accessCount++;
      const now = new Date();
      item.lastAccessed = isNaN(now.getTime()) ? new Date() : now;
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
    
    const now = new Date();
    this.memory.longTerm.set(key, {
      value,
      importance,
      timestamp: isNaN(now.getTime()) ? new Date() : now,
      accessCount: 0
    });
  }

  public getLongTerm(key: string): any {
    const item = this.memory.longTerm.get(key);
    if (item) {
      item.accessCount++;
      const now = new Date();
      item.lastAccessed = isNaN(now.getTime()) ? new Date() : now;
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

  // Export/Import memory for persistence with safe serialization
  public exportMemory(): any {
    // Completely safe serialization that avoids any date issues
    const safeSerialize = (obj: any): any => {
      try {
        return JSON.parse(JSON.stringify(obj, (_key, value) => {
          // Skip any dates entirely to avoid serialization issues
          if (value instanceof Date) {
            return value.getTime && !isNaN(value.getTime()) ? value.toISOString() : new Date().toISOString();
          }
          // Skip functions and undefined values
          if (typeof value === 'function' || value === undefined) {
            return null;
          }
          return value;
        }));
      } catch (error) {
        console.warn('Serialization failed, returning empty object:', error);
        return {};
      }
    };

    try {
      // Convert Maps to arrays safely
      const shortTermArray: any[] = [];
      const longTermArray: any[] = [];

      // Safe iteration over short-term memory
      try {
        for (const [key, value] of this.memory.shortTerm.entries()) {
          try {
            shortTermArray.push([key, safeSerialize(value)]);
          } catch (error) {
            console.warn(`Skipping problematic short-term memory key: ${key}`, error);
          }
        }
      } catch (error) {
        console.warn('Error processing short-term memory:', error);
      }

      // Safe iteration over long-term memory
      try {
        for (const [key, value] of this.memory.longTerm.entries()) {
          try {
            longTermArray.push([key, safeSerialize(value)]);
          } catch (error) {
            console.warn(`Skipping problematic long-term memory key: ${key}`, error);
          }
        }
      } catch (error) {
        console.warn('Error processing long-term memory:', error);
      }

      return {
        shortTerm: shortTermArray,
        longTerm: longTermArray,
        context: safeSerialize(this.memory.context)
      };
    } catch (error) {
      console.error('Failed to export memory, returning minimal structure:', error);
      return {
        shortTerm: [],
        longTerm: [],
        context: {}
      };
    }
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
