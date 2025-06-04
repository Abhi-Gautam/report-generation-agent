import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace
import { LoggerService } from './logger';

export class DatabaseService {
  private prisma: PrismaClient;
  private logger: LoggerService;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    this.logger = new LoggerService();
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.logger.info('Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.logger.info('Disconnected from PostgreSQL database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  // Add direct access to Prisma models
  get project() {
    return this.prisma.project;
  }

  get reportSection() {
    return this.prisma.reportSection;
  }

  get researchSession() {
    return this.prisma.researchSession;
  }

  get projectFile() {
    return this.prisma.projectFile;
  }

  get user() {
    return this.prisma.user;
  }

  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Transaction wrapper
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

// Export singleton instance
export const database = new DatabaseService();
