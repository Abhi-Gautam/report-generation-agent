import { Router } from 'express';
import { Request, Response } from 'express';
import { database } from '../services/database';
import { projectStorage } from '../services/projectStorage';
import { chromaService } from '../services/chromaService';
import { latexCompiler } from '../services/latexCompiler';
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

    // Save section file
    await projectStorage.saveSection(projectId, section.id, content, {
      title,
      type,
      ...metadata
    });

    // Store in ChromaDB for similarity search
    await chromaService.storeContent({
      id: `section_${section.id}`,
      content: `${title}\n\n${content}`,
      metadata: {
        projectId,
        sectionId: section.id,
        type: 'section',
        title,
        tags: metadata?.tags || [],
        wordCount: content.split(' ').length,
        createdAt: new Date().toISOString()
      }
    });

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

    // Update section file if content changed
    if (content !== undefined) {
      await projectStorage.saveSection(projectId, sectionId, content, {
        title: title || section.title,
        type: type || section.type,
        ...metadata
      });

      // Update in ChromaDB
      await chromaService.updateContent(`section_${sectionId}`, {
        content: `${title || section.title}\n\n${content}`,
        metadata: {
          projectId,
          sectionId,
          type: 'section',
          title: title || section.title,
          tags: metadata?.tags || [],
          wordCount: content.split(' ').length,
          createdAt: section.createdAt.toISOString()
        }
      });
    }

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

    // Delete section file
    await projectStorage.deleteSection(projectId, sectionId);

    // Delete from ChromaDB
    await chromaService.deleteContent(`section_${sectionId}`);

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

// POST /api/sections/:projectId/compile - Compile all sections to PDF
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

    // Generate main.tex file
    const mainTexPath = await projectStorage.generateMainTexFile(projectId);

    if (format === 'latex') {
      // Return LaTeX source
      const latexContent = await projectStorage.loadSection(projectId, 'main');
      res.json({
        success: true,
        data: { content: latexContent, path: mainTexPath }
      });
    } else {
      // Compile to PDF
      const result = await latexCompiler.compileDocument(
        await require('fs').promises.readFile(mainTexPath, 'utf8'),
        'main',
        require('path').dirname(mainTexPath)
      );

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: `Compilation failed: ${result.error}`,
          log: result.log
        });
        return;
      }

      const pdfPath = mainTexPath.replace('.tex', '.pdf');
      res.json({
        success: true,
        data: { 
          path: pdfPath,
          attempts: result.attempts,
          log: result.log
        }
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
        // Compile and download PDF
        const mainTexPath = await projectStorage.generateMainTexFile(projectId);
        const texContent = await require('fs').promises.readFile(mainTexPath, 'utf8');
        
        const result = await latexCompiler.compileDocument(
          texContent,
          'main',
          require('path').dirname(mainTexPath)
        );

        if (!result.success) {
          res.status(500).json({
            success: false,
            error: 'Failed to compile PDF'
          });
          return;
        }

        const pdfPath = mainTexPath.replace('.tex', '.pdf');
        res.download(pdfPath, `project_${projectId}.pdf`);
        break;

      case 'latex':
        // Download LaTeX source
        const latexPath = await projectStorage.generateMainTexFile(projectId);
        res.download(latexPath, `project_${projectId}.tex`);
        break;

      case 'zip':
        // Download complete project as ZIP
        const zipBuffer = await projectStorage.createZipExport(projectId);
        res.set({
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="project_${projectId}.zip"`
        });
        res.send(zipBuffer);
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid format. Use pdf, latex, or zip'
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

    const suggestions = await chromaService.getContentSuggestions(
      section.content,
      projectId
    );

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
    const { data, options, sectionId } = req.body;

    const { tableGenerator } = await import('../tools/tableGenerator');
    
    const result = await tableGenerator.execute({
      data,
      options: {
        format: 'latex',
        ...options
      }
    });

    // Store table in ChromaDB if successful
    if (result.content) {
      await chromaService.storeContent({
        id: `table_${Date.now()}`,
        content: result.content,
        metadata: {
          projectId,
          sectionId,
          type: 'table',
          title: data.caption || 'Generated Table',
          createdAt: new Date().toISOString()
        }
      });
    }

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
    const { data, options, sectionId } = req.body;

    const { chartGenerator } = await import('../tools/chartGenerator');
    
    const result = await chartGenerator.execute({
      data,
      options: {
        format: 'latex',
        ...options
      },
      projectId
    });

    // Store chart in ChromaDB if successful
    if (result.content) {
      await chromaService.storeContent({
        id: `chart_${Date.now()}`,
        content: result.content,
        metadata: {
          projectId,
          sectionId,
          type: 'chart',
          title: options.title || 'Generated Chart',
          createdAt: new Date().toISOString()
        }
      });
    }

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
