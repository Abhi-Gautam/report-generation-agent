import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  sessionId?: string;
}

export interface ProgressUpdate {
  sessionId: string;
  progress: number;
  currentStep: string;
  message: string;
  eta?: number;
}

export interface WebSocketHookReturn {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  joinSession: (sessionId: string) => void;
  joinProject: (projectId: string) => void;
  leaveSession: (sessionId: string) => void;
  leaveProject: (projectId: string) => void;
}

export function useWebSocket(url?: string): WebSocketHookReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const defaultUrl = process.env.NODE_ENV === 'production' 
    ? 'ws://localhost:4000' 
    : 'http://localhost:4000';
  
  const socketUrl = url || defaultUrl;

  useEffect(() => {
    // Create socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Message handler - this is extensible for all message types
    newSocket.on('message', (message: WebSocketMessage) => {
      console.log('WebSocket message received:', message);
      setLastMessage(message);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [socketUrl]);

  // Extensible room management functions
  const joinSession = useCallback((sessionId: string) => {
    if (socket && isConnected) {
      console.log('Joining session room:', sessionId);
      socket.emit('join-session', sessionId);
    }
  }, [socket, isConnected]);

  const joinProject = useCallback((projectId: string) => {
    if (socket && isConnected) {
      console.log('Joining project room:', projectId);
      socket.emit('join-project', projectId);
    }
  }, [socket, isConnected]);

  const leaveSession = useCallback((sessionId: string) => {
    if (socket && isConnected) {
      console.log('Leaving session room:', sessionId);
      socket.emit('leave-session', sessionId);
    }
  }, [socket, isConnected]);

  const leaveProject = useCallback((projectId: string) => {
    if (socket && isConnected) {
      console.log('Leaving project room:', projectId);
      socket.emit('leave-project', projectId);
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    lastMessage,
    joinSession,
    joinProject,
    leaveSession,
    leaveProject
  };
}

// Specialized hook for progress tracking (can be reused for different progress types)
export function useProgressTracking(sessionId?: string) {
  const { lastMessage, joinSession, leaveSession, isConnected } = useWebSocket();
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (sessionId && isConnected) {
      joinSession(sessionId);
      
      return () => {
        leaveSession(sessionId);
      };
    }
  }, [sessionId, isConnected, joinSession, leaveSession]);

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'PROGRESS_UPDATE':
        const progressUpdate = lastMessage.payload as ProgressUpdate;
        setProgress(progressUpdate);
        setError(null);
        
        // Check if complete
        if (progressUpdate.progress >= 100) {
          setIsComplete(true);
        }
        break;
        
      case 'ERROR':
        setError(lastMessage.payload.message || 'An error occurred');
        break;
        
      case 'COMPLETION':
        setIsComplete(true);
        setProgress(prev => prev ? { ...prev, progress: 100 } : null);
        break;
        
      case 'STATUS_CHANGE':
        // Handle status changes if needed
        break;
    }
  }, [lastMessage]);

  return {
    progress,
    error,
    isComplete,
    isConnected
  };
}

// Export message types for type safety
export const MessageTypes = {
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  AGENT_LOG: 'AGENT_LOG',
  TOOL_USAGE: 'TOOL_USAGE',
  ERROR: 'ERROR',
  COMPLETION: 'COMPLETION',
  STATUS_CHANGE: 'STATUS_CHANGE'
} as const;