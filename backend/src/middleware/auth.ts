import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../services/logger';

const prisma = new PrismaClient();
const logger = new LoggerService();

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string | null; // Allow null for name
      };
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No valid token provided.'
      });
      return; // This return is to exit the function after sending response
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
      return; // Exit function
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as { userId: string; email: string };

      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid token. User not found.'
        });
        return; // Exit function
      }

      // Attach user to request
      req.user = user;
      next(); // Hand over to next middleware
      // No explicit return needed here, as next() handles flow.
      // The function will implicitly complete its void promise.
      return; // Or simply let it fall through. Explicit return for clarity.

    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
      return; // Exit function
    }

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    if (!res.headersSent) {
        res.status(500).json({
        success: false,
        error: 'Authentication failed'
        });
    }
    return; // Exit function
  }
};

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => { // _res indicates it's not used
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(); // Continue without auth
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      next(); // Continue without auth
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as { userId: string; email: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      if (user) {
        req.user = user;
      }

    } catch (jwtError) {
      // Invalid token, but continue without auth
      logger.warn('Invalid token in optional auth:', jwtError);
    }

    next();

  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
};

// Admin auth middleware
export const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // This function needs to be re-evaluated. Calling `auth` like this is problematic
  // because `auth` might send a response and then this function tries to continue.
  // A better pattern is to have `auth` as a standard middleware.
  // For now, let's simplify and assume `auth` will call `next()` or throw/send response.
  auth(req, res, (err?: any) => {
    if (err) {
      // If auth middleware passes an error to next
      return next(err);
    }
    // If auth middleware sent a response (e.g. 401), headersSent will be true.
    if (res.headersSent) {
      return; // Stop processing, response already sent by auth
    }
    // If auth called next() without error and didn't send a response, req.user should be set.
    if (!req.user) {
        // This case should ideally be handled by `auth` sending a 401 or calling next(err)
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
    }

    // Check if user is admin
    const userEmail = req.user?.email || '';
    const isAdmin = userEmail.endsWith('@admin.com') ||
                   process.env.ADMIN_EMAILS?.split(',').includes(userEmail);

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    next(); // Proceed to the route handler
  });
};

// Rate limiting for API keys or specific users 
export const rateLimitByUser = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip || 'unknown_user';
    const now = Date.now();
    
    const userRequests = requests.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return; // Exit after calling next or setting new request
    }
    
    // Existing user requests within window
    if (userRequests.count >= maxRequests) {
      res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
      return; // Exit after sending response
    }
    
    userRequests.count++;
    next();
    // No explicit return needed here, next() handles flow.
  };
};
