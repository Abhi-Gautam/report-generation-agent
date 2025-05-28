import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../services/logger';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/request';

const router = Router();
const prisma = new PrismaClient();
const logger = new LoggerService();


// GET /api/users/profile - Get user profile (requires authentication)
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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

// PUT /api/users/profile - Update user profile (requires authentication)
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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

export default router;
