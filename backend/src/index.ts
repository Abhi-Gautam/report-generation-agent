import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
// import { PrismaClient } from '@prisma/client'; // Unused

// Import routes
import projectRoutes from './routes/projects';
import userRoutes from './routes/users';
import researchRoutes from './routes/research';
import authRoutes from './routes/auth';
import sectionsRoutes from './routes/sections';

// Import services
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { WebSocketService } from './services/websocket';
import { LoggerService } from './services/logger';
import { chromaService } from './services/chromaService';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

class Application {
  public app: express.Application;
  public server: any;
  public io!: SocketIOServer;
  public database!: DatabaseService;
  public redis!: RedisService;
  public websocket!: WebSocketService;
  public logger: LoggerService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.logger = new LoggerService();
    
    this.initializeDatabase();
    this.initializeRedis();
    this.initializeChroma();
    this.initializeSocket();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.database = new DatabaseService();
      await this.database.connect();
      this.logger.info('Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      process.exit(1);
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new RedisService();
      await this.redis.connect();
      this.logger.info('Connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      // Redis is optional, continue without it
    }
  }

  private async initializeChroma(): Promise<void> {
    try {
      await chromaService.initialize();
      this.logger.info('Connected to ChromaDB');
    } catch (error) {
      this.logger.error('Failed to connect to ChromaDB:', error);
      // ChromaDB is optional, continue without it
    }
  }

  private initializeSocket(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.websocket = new WebSocketService(this.io);
    this.app.set('websocket', this.websocket); // <-- Make websocket available to routes
    this.logger.info('WebSocket server initialized');
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Health check endpoint
    this.app.get('/api/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      });
    });
  }

  private initializeRoutes(): void {
    // Public routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);

    // Make projects route public for demo (remove auth middleware)
    this.app.use('/api/projects', projectRoutes);
    this.app.use('/api/research', researchRoutes);
    this.app.use('/api/sections', sectionsRoutes);

    // Catch-all route
    this.app.use('/{*any}', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist.`
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = process.env.PORT || 4000;
    this.server.listen(port, () => {
      this.logger.info(`🚀 Server running on port ${port}`);
      this.logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      this.logger.info(`🔗 API URL: http://localhost:${port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.info('Starting graceful shutdown...');

    // Close server
    this.server.close(() => {
      this.logger.info('HTTP server closed');
    });

    // Close database connections
    try {
      await this.database.disconnect();
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection:', error);
    }

    // Close Redis connection
    try {
      await this.redis.disconnect();
      this.logger.info('Redis connection closed');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }

    process.exit(0);
  }
}

// Create and start the application
const app = new Application();
app.listen();

export default app;
