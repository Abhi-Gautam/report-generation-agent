import { Server as SocketIOServer, Socket } from 'socket.io';
import { LoggerService } from './logger';
import { WebSocketMessage, MessageType, ProgressUpdate } from '../shared';

export class WebSocketService {
  private io: SocketIOServer;
  private logger: LoggerService;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.logger = new LoggerService();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Handle client joining a project room
      socket.on('join-project', (projectId: string) => {
        socket.join(`project:${projectId}`);
        this.logger.info(`Client ${socket.id} joined project room: ${projectId}`);
      });

      // Handle client leaving a project room
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project:${projectId}`);
        this.logger.info(`Client ${socket.id} left project room: ${projectId}`);
      });

      // Handle research session joining
      socket.on('join-session', (sessionId: string) => {
        socket.join(`session:${sessionId}`);
        this.logger.info(`Client ${socket.id} joined session room: ${sessionId}`);
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        this.logger.error(`Socket error for client ${socket.id}:`, error);
      });
    });
  }

  // Send message to all clients in a project
  public sendToProject(projectId: string, message: WebSocketMessage): void {
    this.io.to(`project:${projectId}`).emit('message', {
      ...message,
      timestamp: new Date()
    });
  }

  // Send message to all clients in a session
  public sendToSession(sessionId: string, message: WebSocketMessage): void {
    this.io.to(`session:${sessionId}`).emit('message', {
      ...message,
      timestamp: new Date(),
      sessionId
    });
  }

  // Send progress update
  public sendProgressUpdate(sessionId: string, update: ProgressUpdate): void {
    const message: WebSocketMessage = {
      type: MessageType.PROGRESS_UPDATE,
      payload: update,
      timestamp: new Date(),
      sessionId
    };
    this.sendToSession(sessionId, message);
  }

  // Send agent log
  public sendAgentLog(sessionId: string, log: any): void {
    const message: WebSocketMessage = {
      type: MessageType.AGENT_LOG,
      payload: log,
      timestamp: new Date(),
      sessionId
    };
    this.sendToSession(sessionId, message);
  }

  // Send tool usage update
  public sendToolUsage(sessionId: string, toolUsage: any): void {
    const message: WebSocketMessage = {
      type: MessageType.TOOL_USAGE,
      payload: toolUsage,
      timestamp: new Date(),
      sessionId
    };
    this.sendToSession(sessionId, message);
  }

  // Send error message
  public sendError(sessionId: string, error: any): void {
    const message: WebSocketMessage = {
      type: MessageType.ERROR,
      payload: error,
      timestamp: new Date(),
      sessionId
    };
    this.sendToSession(sessionId, message);
  }

  // Send completion message
  public sendCompletion(sessionId: string, result: any): void {
    const message: WebSocketMessage = {
      type: MessageType.COMPLETION,
      payload: result,
      timestamp: new Date(),
      sessionId
    };
    this.sendToSession(sessionId, message);
  }

  // Send status change
  public sendStatusChange(sessionId: string, oldStatus: string, newStatus: string): void {
    const message: WebSocketMessage = {
      type: MessageType.STATUS_CHANGE,
      payload: { oldStatus, newStatus },
      timestamp: new Date(),
      sessionId
    };
    this.sendToSession(sessionId, message);
  }

  // Broadcast to all connected clients
  public broadcast(message: WebSocketMessage): void {
    this.io.emit('message', {
      ...message,
      timestamp: new Date()
    });
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get clients in a specific room
  public getClientsInRoom(room: string): number {
    const roomClients = this.io.sockets.adapter.rooms.get(room);
    return roomClients ? roomClients.size : 0;
  }
}
