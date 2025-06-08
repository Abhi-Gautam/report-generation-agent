import { Router } from 'express';
import { Request, Response } from 'express';
import { database } from '../services/database';
import { logger } from '../services/logger';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/request';

const router = Router();

// Helper function to verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await database.project.findFirst({
    where: { id: projectId, userId }
  });
  return !!project;
}

// GET /api/sections/:projectId - Get all sections for a project
router.get('/:projectId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    
    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }
    
    const sections = await database.reportSection.findMany({
      where: { projectId },
      orderBy: { order: 'asc' }
    });

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    logger.error('Failed to fetch sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sections'
    });
  }
});

// POST /api/sections/:projectId - Create a new section
router.post('/:projectId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { title, content, type = 'TEXT', order, metadata } = req.body;

    if (!title || !content) {
      res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
      return;
    }

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    // Create section in database
    const section = await database.reportSection.create({
      data: {
        title,
        content,
        type,
        order: order || 1,
        metadata: metadata || {},
        projectId
      }
    });

    // Note: Section files no longer saved to disk with new agent-based system
    // All section data is stored in database and used by agents as needed


    res.status(201).json({
      success: true,
      data: section
    });
  } catch (error) {
    logger.error('Failed to create section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create section'
    });
  }
});

// PUT /api/sections/:projectId/:sectionId - Update a section
router.put('/:projectId/:sectionId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sectionId } = req.params;
    const userId = req.user!.id;
    const { title, content, type, order, metadata } = req.body;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (order !== undefined) updateData.order = order;
    if (metadata !== undefined) updateData.metadata = metadata;

    const section = await database.reportSection.update({
      where: { 
        id: sectionId,
        projectId 
      },
      data: updateData
    });

    // Note: Section files no longer saved to disk with new agent-based system
    // All section data is stored in database and used by agents as needed

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    logger.error('Failed to update section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update section'
    });
  }
});

// DELETE /api/sections/:projectId/:sectionId - Delete a section
router.delete('/:projectId/:sectionId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sectionId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    await database.reportSection.delete({
      where: { 
        id: sectionId,
        projectId 
      }
    });

    // Note: No section files to delete with new agent-based system
    // All data managed through database


    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete section'
    });
  }
});

// GET /api/sections/:projectId/:sectionId - Get a specific section
router.get('/:projectId/:sectionId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sectionId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    const section = await database.reportSection.findUnique({
      where: { 
        id: sectionId,
        projectId 
      }
    });

    if (!section) {
      res.status(404).json({
        success: false,
        error: 'Section not found'
      });
      return;
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    logger.error('Failed to fetch section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch section'
    });
  }
});

// POST /api/sections/:projectId/reorder - Reorder sections
router.post('/:projectId/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { sectionOrders } = req.body; // Array of { id, order }

    if (!Array.isArray(sectionOrders)) {
      res.status(400).json({
        success: false,
        error: 'sectionOrders must be an array'
      });
      return;
    }

    // Update section orders in transaction
    await database.$transaction(
      sectionOrders.map(({ id, order }) =>
        database.reportSection.update({
          where: { id, projectId },
          data: { order }
        })
      )
    );

    const sections = await database.reportSection.findMany({
      where: { projectId },
      orderBy: { order: 'asc' }
    });

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    logger.error('Failed to reorder sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder sections'
    });
  }
});

// POST /api/sections/:projectId/compile - Compile all sections to PDF using new agent system
router.post('/:projectId/compile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { format = 'pdf' } = req.body;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    // Get project details
    const project = await database.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    if (format === 'latex') {
      // Use agent-based LaTeX generation for LaTeX format
      const { LaTeXFormatterAgent } = await import('../agents/latexFormatterAgent');
      const websocket = req.app.get('websocket');
      
      // Fetch sections
      const sections = await database.reportSection.findMany({
        where: { projectId },
        orderBy: { order: 'asc' }
      });

      if (sections.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No sections found for compilation'
        });
        return;
      }

      const latexFormatter = new LaTeXFormatterAgent(websocket);
      const result = await latexFormatter.execute({
        sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          type: section.type as 'ABSTRACT' | 'INTRODUCTION' | 'CONCLUSION' | 'REFERENCES' | 'TEXT',
          content: section.content,
          order: section.order,
          metadata: section.metadata
        })),
        title: project.title,
        author: 'Research Agent',
        metadata: {
          citationStyle: 'APA',
          template: 'academic'
        }
      });

      res.json({
        success: true,
        data: { 
          content: result.latexDocument,
          warnings: result.warnings,
          metadata: result.metadata
        }
      });
    } else {
      // Redirect to PDF generation endpoint in projects route
      res.status(302).json({
        success: false,
        error: 'PDF compilation moved to /api/projects/:id/generate endpoint',
        redirect: `/api/projects/${projectId}/generate`
      });
    }
  } catch (error) {
    logger.error('Failed to compile sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compile sections'
    });
  }
});

// GET /api/sections/:projectId/download/:format - Download project in various formats
router.get('/:projectId/download/:format', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, format } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    switch (format) {
      case 'pdf':
        // Redirect to PDF download endpoint in projects route (uses existing agent-based PDF)
        res.redirect(`/api/projects/${projectId}/download`);
        break;

      case 'latex':
        // Generate LaTeX using agent-based system
        const { LaTeXFormatterAgent } = await import('../agents/latexFormatterAgent');
        const websocket = req.app.get('websocket');
        
        // Get project details
        const project = await database.project.findFirst({
          where: { id: projectId, userId }
        });

        if (!project) {
          res.status(404).json({
            success: false,
            error: 'Project not found'
          });
          return;
        }

        // Fetch sections
        const sections = await database.reportSection.findMany({
          where: { projectId },
          orderBy: { order: 'asc' }
        });

        if (sections.length === 0) {
          res.status(400).json({
            success: false,
            error: 'No sections found for LaTeX generation'
          });
          return;
        }

        const latexFormatter = new LaTeXFormatterAgent(websocket);
        const result = await latexFormatter.execute({
          sections: sections.map(section => ({
            id: section.id,
            title: section.title,
            type: section.type as 'ABSTRACT' | 'INTRODUCTION' | 'CONCLUSION' | 'REFERENCES' | 'TEXT',
            content: section.content,
            order: section.order,
            metadata: section.metadata
          })),
          title: project.title,
          author: 'Research Agent',
          metadata: {
            citationStyle: 'APA',
            template: 'academic'
          }
        });

        // Set headers for LaTeX file download
        res.set({
          'Content-Type': 'application/x-latex',
          'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.tex"`
        });
        res.send(result.latexDocument);
        break;

      case 'zip':
        // ZIP export not implemented in agent system yet
        res.status(501).json({
          success: false,
          error: 'ZIP export not yet implemented with new agent system'
        });
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid format. Use pdf or latex'
        });
    }
  } catch (error) {
    logger.error('Failed to download project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download project'
    });
  }
});

// GET /api/sections/:projectId/suggestions/:sectionId - Get content suggestions for a section
router.get('/:projectId/suggestions/:sectionId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sectionId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    const section = await database.reportSection.findUnique({
      where: { id: sectionId, projectId }
    });

    if (!section) {
      res.status(404).json({
        success: false,
        error: 'Section not found'
      });
      return;
    }

    // Content suggestions feature removed (previously used ChromaDB)
    const suggestions: any[] = [];

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Failed to get content suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content suggestions'
    });
  }
});

// POST /api/sections/:projectId/generate-structure - Generate report structure
router.post('/:projectId/generate-structure', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }
    const { reportType, academicLevel, fieldOfStudy, wordLimit, customSections } = req.body;

    const { reportStructurer } = await import('../tools/reportStructurer');
    
    const result = await reportStructurer.execute({
      options: {
        reportType: reportType || 'research_paper',
        academicLevel: academicLevel || 'undergraduate',
        fieldOfStudy,
        wordLimit,
        customSections
      }
    });

    if (!result.structure) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate structure'
      });
      return;
    }

    // Create sections based on the structure
    const sections = await Promise.all(
      result.structure.sections.map(async (structureSection, index) => {
        return await database.reportSection.create({
          data: {
            title: structureSection.title,
            content: `% ${structureSection.description}\n% Word count: ${structureSection.wordCountRange ? `${structureSection.wordCountRange[0]}-${structureSection.wordCountRange[1]}` : 'Variable'}\n\n[Your ${structureSection.title.toLowerCase()} content here]`,
            type: structureSection.type.toUpperCase(),
            order: index + 1,
            metadata: {
              description: structureSection.description,
              wordCountRange: structureSection.wordCountRange,
              required: structureSection.required
            },
            projectId
          }
        });
      })
    );

    res.json({
      success: true,
      data: {
        structure: result.structure,
        sections,
        latexTemplate: result.latexTemplate,
        guidelines: result.guidelines
      }
    });
  } catch (error) {
    logger.error('Failed to generate report structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report structure'
    });
  }
});

// POST /api/sections/:projectId/generate-table - Generate table for a section
router.post('/:projectId/generate-table', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }
    const { data, options } = req.body;

    const { tableGenerator } = await import('../tools/tableGenerator');
    
    const result = await tableGenerator.execute({
      data,
      options: {
        format: 'latex',
        ...options
      }
    });


    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to generate table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate table'
    });
  }
});

// POST /api/sections/:projectId/generate-chart - Generate chart for a section
router.post('/:projectId/generate-chart', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership
    const hasAccess = await verifyProjectOwnership(projectId, userId);
    if (!hasAccess) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }
    const { data, options } = req.body;

    const { chartGenerator } = await import('../tools/chartGenerator');
    
    const result = await chartGenerator.execute({
      data,
      options: {
        format: 'latex',
        ...options
      },
      projectId
    });


    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to generate chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chart'
    });
  }
});

export default router;
