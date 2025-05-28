import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger';

const logger = new LoggerService();

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end as (...args: any[]) => Response; // Cast to a general signature
  res.end = function(this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;
    
    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0,
      ip: req.ip
    });

    // Call original end method with the same arguments
    originalEnd.apply(this, args);
    return this;
  };

  next();
};

// Log only errors
export const errorOnlyRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  const originalEndErrorLogger = res.end as (...args: any[]) => Response; // Cast to a general signature
  res.end = function(this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;
    
    // Only log if there's an error (status code >= 400)
    if (res.statusCode >= 400) {
      logger.error('Request error', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
    }
 
    // Call original end method with the same arguments
    originalEndErrorLogger.apply(this, args);
    return this;
  };

  next();
};
