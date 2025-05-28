import { Router } from 'express';
import { PrismaClient, ToolUsage, ResearchSession, Project } from '@prisma/client'; // Import necessary types
import { LoggerService } from '../services/logger';

const router = Router();
const prisma = new PrismaClient();
const logger = new LoggerService();

// GET /api/research/sessions/:id - Get research session details
router.get('/sessions/:id', async (req, res): Promise<void> => {
  try {
    const sessionId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const session = await prisma.researchSession.findFirst({
      where: {
        id: sessionId,
        project: {
          userId: userId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            topic: true,
            status: true
          }
        },
        tools: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Research session not found'
      });
      return;
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('Failed to fetch research session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch research session'
    });
    return;
  }
});

// GET /api/research/sessions/:id/logs - Get session agent logs
router.get('/sessions/:id/logs', async (req, res): Promise<void> => {
  try {
    const sessionId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const session = await prisma.researchSession.findFirst({
      where: {
        id: sessionId,
        project: {
          userId: userId
        }
      },
      select: {
        agentLogs: true
      }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Research session not found'
      });
      return;
    }

    const logs = Array.isArray(session.agentLogs) ? session.agentLogs : [];
    const paginatedLogs = logs.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total: logs.length,
          totalPages: Math.ceil(logs.length / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch session logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session logs'
    });
    return;
  }
});

// GET /api/research/sessions/:id/tools - Get session tool usage
router.get('/sessions/:id/tools', async (req, res): Promise<void> => {
  try {
    const sessionId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const session = await prisma.researchSession.findFirst({
      where: {
        id: sessionId,
        project: {
          userId: userId
        }
      },
      include: {
        tools: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Research session not found'
      });
      return;
    }

    // Calculate tool usage statistics
    // Assert session type to include tools
    const currentSession = session as ResearchSession & { tools: ToolUsage[] };
    const toolStats = currentSession.tools.reduce((acc: any, tool: ToolUsage) => {
      const toolName = tool.toolName;
      if (!acc[toolName]) {
        acc[toolName] = {
          name: toolName,
          usageCount: 0,
          successCount: 0,
          totalDuration: 0,
          averageDuration: 0
        };
      }
      
      acc[toolName].usageCount++;
      if (tool.success) acc[toolName].successCount++;
      acc[toolName].totalDuration += tool.duration;
      acc[toolName].averageDuration = acc[toolName].totalDuration / acc[toolName].usageCount;
      
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        tools: currentSession.tools,
        statistics: Object.values(toolStats)
      }
    });

  } catch (error) {
    logger.error('Failed to fetch session tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session tools'
    });
    return;
  }
});

// GET /api/research/sources - Get research sources with search
router.get('/sources', async (req, res): Promise<void> => {
  try {
    const query = req.query.q as string; // No userId check, sources are public
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const whereClause = query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { domain: { contains: query, mode: 'insensitive' } }
      ]
    } : {};

    const [sources, total] = await Promise.all([
      prisma.researchSource.findMany({
        where: whereClause as any,
        orderBy: { relevance: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.researchSource.count({
        where: whereClause as any
      })
    ]);

    res.json({
      success: true,
      data: {
        sources,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch research sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch research sources'
    });
    return;
  }
});

// GET /api/research/analytics - Get research analytics
router.get('/analytics', async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      // Analytics might be public or require auth. Assuming auth for now.
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }
    const timeRange = req.query.timeRange as string || '7d';

    // Calculate date range
    const now = new Date();
    const timeRangeMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const daysBack = timeRangeMap[timeRange] || 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get analytics data
    const [
      totalProjects,
      completedProjects,
      recentSessions,
      toolUsageStats
    ] = await Promise.all([
      prisma.project.count({
        where: {
          userId: userId,
          createdAt: { gte: startDate }
        }
      }),
      prisma.project.count({
        where: {
          userId: userId,
          status: 'COMPLETED',
          updatedAt: { gte: startDate }
        }
      }),
      prisma.researchSession.findMany({
        where: {
          project: { userId: userId },
          createdAt: { gte: startDate }
        },
        include: {
          project: {
            select: { title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.toolUsage.groupBy({
        by: ['toolName'],
        where: {
          session: {
            project: { userId: userId }
          },
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        },
        _avg: {
          duration: true
        }
      })
    ]);

    // Calculate success rate
    const successfulProjects = await prisma.project.count({
      where: {
        userId: userId,
        status: 'COMPLETED',
        updatedAt: { gte: startDate }
      }
    });

    const successRate = totalProjects > 0 ? (successfulProjects / totalProjects) * 100 : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalProjects,
          completedProjects,
          successRate: Math.round(successRate),
          averageProcessingTime: 0 // Calculate from sessions if needed
        },
        recentActivity: recentSessions.map(s => {
          // Assert type of s to include the nested project title
          const typedSession = s as ResearchSession & { project: Pick<Project, 'title'> };
          return {
            id: typedSession.id,
            projectTitle: typedSession.project.title,
            status: typedSession.status,
            progress: typedSession.progress,
            createdAt: typedSession.createdAt
          };
        }),
        toolUsage: toolUsageStats.map(stat => ({
          name: stat.toolName,
          usageCount: (typeof stat._count === 'object' && stat._count?.id) ? stat._count.id : 0,
          averageDuration: Math.round(stat._avg?.duration || 0)
        })),
        timeRange: {
          start: startDate,
          end: now,
          range: timeRange
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch research analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch research analytics'
    });
    return;
  }
});

export default router;
