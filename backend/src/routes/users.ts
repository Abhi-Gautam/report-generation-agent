import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, User } from '@prisma/client';
import { LoggerService } from '../services/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const logger = new LoggerService();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// POST /api/users/register - Register new user
router.post('/register', async (req, res): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        },
        token
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    logger.error('User registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
    return;
  }
});

// POST /api/users/login - User login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user: User | null = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    if (!user.password) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials (user has no password set)'
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        },
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    logger.error('User login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
    return;
  }
});

// GET /api/users/profile - Get user profile
router.get('/profile', async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        recentProjects: user.projects,
        stats: {
          totalProjects: user.projects.length,
          completedProjects: user.projects.filter(p => p.status === 'COMPLETED').length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
    return;
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatar: z.string().url().optional()
    });

    const validatedData = updateSchema.parse(req.body);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const dataToUpdate: { name?: string; avatar?: string } = {};
    if (validatedData.name !== undefined) {
      dataToUpdate.name = validatedData.name;
    }
    if (validatedData.avatar !== undefined) {
      dataToUpdate.avatar = validatedData.avatar;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          updatedAt: updatedUser.updatedAt
        }
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }

    logger.error('Failed to update user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
    return;
  }
});

// POST /api/users/demo-login - Demo login (no password required)
router.post('/demo-login', async (_req, res): Promise<void> => { // _req as req is unused
  try {
    const email = 'demo@researchagent.com';
    
    // Find or create demo user
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: 'Demo User',
          password: 'demoPassword123' // Added placeholder password for demo user
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    logger.info(`Demo user logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        },
        token
      },
      message: 'Demo login successful'
    });

  } catch (error) {
    logger.error('Demo login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Demo login failed'
    });
    return;
  }
});

export default router;
