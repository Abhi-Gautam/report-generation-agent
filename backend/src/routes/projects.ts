import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client'; // Correctly import Prisma namespace
import { ResearchAgent } from '../agents/researchAgent';
import { WebSocketService } from '../services/websocket';
import { LoggerService } from '../services/logger';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/request';
// import { v4 as uuidv4 } from 'uuid'; // Unused

const router = Router();
const prisma = new PrismaClient();
const logger = new LoggerService();

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(500),
  preferences: z.object({
    detailLevel: z.enum(['BRIEF', 'MODERATE', 'COMPREHENSIVE']).optional(),
    citationStyle: z.enum(['APA', 'MLA', 'CHICAGO', 'IEEE']).optional(),
    maxSources: z.number().min(1).max(50).optional(),
    includeImages: z.boolean().optional()
  }).optional()
});

const generateResearchSchema = z.object({
  projectId: z.string(), // Accept any string (CUID or UUID)
  options: z.object({
    includeImages: z.boolean().optional(),
    maxSources: z.number().min(1).max(50).optional(),
    citationStyle: z.enum(['APA', 'MLA', 'CHICAGO', 'IEEE']).optional(),
    outputFormat: z.enum(['PDF', 'DOCX', 'MARKDOWN']).optional()
  }).optional()
});

// GET /api/projects - List user's projects
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const projects = await prisma.project.findMany({
      where: { userId: userId },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        files: {
          where: { fileType: 'PDF' },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: projects,
      total: projects.length
    });

  } catch (error) {
    logger.error('Failed to fetch projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
    return;
  }
});

// POST /api/projects - Create new project
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const validatedData = createProjectSchema.parse(req.body);
    const userId = req.user!.id;

    const project = await prisma.project.create({
      data: {
        title: validatedData.title,
        topic: validatedData.topic,
        userId,
        metadata: validatedData.preferences || {}
      }
    });

    logger.info(`Created new project: ${project.id} for user: ${userId}`);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
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

    logger.error('Failed to create project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
    return;
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId
      },
      include: {
        sessions: {
          include: {
            tools: true
          },
          orderBy: { createdAt: 'desc' }
        },
        files: true,
        sections: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    res.json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.error('Failed to fetch project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
    return;
  }
});

//POST /api/projects/:id/generate - Start research generation
router.post('/:id/generate', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const validatedData = generateResearchSchema.parse({
      projectId: req.params.id,
      options: req.body.options
    });
    
    const userId = req.user!.id;
    const websocket = req.app.get('websocket') as WebSocketService;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: validatedData.projectId,
        userId: userId
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Create research session
    const session = await prisma.researchSession.create({
      data: {
        projectId: project.id,
        status: 'ACTIVE',
        progress: 0,
        currentStep: 'Initializing research'
      }
    });

    // Update project status
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'RESEARCHING' }
    });

    // Start research process asynchronously
    const researchAgent = new ResearchAgent(websocket);
    researchAgent.setSession(session.id);
    // Capture websocket in a variable for closure
    const websocketInstance = websocket;

    // Validate websocket instance
    if (!websocketInstance) {
      logger.error('WebSocket service not available');
      res.status(500).json({
        success: false,
        error: 'WebSocket service not available'
      });
      return;
    }

    // Execute research in background
    setImmediate(async () => {
      try {
        // Use preferences from the request and set defaults for brief papers
        const preferencesForAgent: any = {
          detailLevel: validatedData.options?.maxSources ? 'COMPREHENSIVE' : 'BRIEF', // Default to BRIEF
          maxSources: validatedData.options?.maxSources || 3, // Limit sources for shorter papers
          targetLength: 2000 // Default to ~4 pages (500 words per page)
        };
        
        if (validatedData.options?.citationStyle !== undefined) {
          preferencesForAgent.citationStyle = validatedData.options.citationStyle;
        }
        if (validatedData.options?.includeImages !== undefined) {
          preferencesForAgent.includeImages = validatedData.options.includeImages;
        }

        const result = await researchAgent.execute({
          topic: project.topic,
          preferences: preferencesForAgent
        });

        // Update project with results
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'COMPLETED',
            outline: result.outline as unknown as Prisma.InputJsonValue, // Cast to Prisma.InputJsonValue
            content: result.content,
            metadata: {
              ...((project.metadata && typeof project.metadata === 'object' && !Array.isArray(project.metadata)) ? project.metadata as Prisma.JsonObject : {}), // Spread existing metadata if it's a valid object
              ...(result.metadata as unknown as Prisma.JsonObject), // Spread new metadata, assuming it's an object
              generatedAt: new Date().toISOString() // Store dates as ISO strings for JSON compatibility
            } as Prisma.InputJsonValue // Ensure the final metadata object is compatible
          }
        });

        // Parse AI-generated content into individual sections
        logger.info(`About to parse content into sections for project ${project.id}`);
        await createReportSectionsFromContent(project.id, result.content, result.outline);
        logger.info(`Finished parsing content into sections for project ${project.id}`);

        // Update session
        await prisma.researchSession.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            progress: 100,
            currentStep: 'Research completed',
            completedAt: new Date(),
            memory: researchAgent.exportMemory()
          }
        });

        // Save PDF file if generated
        if (result.pdfPath) {
          await prisma.projectFile.create({
            data: {
              projectId: project.id,
              fileName: `${project.title}.pdf`,
              filePath: result.pdfPath,
              fileType: 'PDF',
              fileSize: 0, // Will be updated with actual size
              metadata: {
                generatedAt: new Date(),
                wordCount: result.metadata.wordCount
              }
            }
          });
        }

        // Notify completion via WebSocket - Send final progress first, then completion
        if (websocketInstance) {
          // Send final progress update
          websocketInstance.sendProgressUpdate(session.id, {
            sessionId: session.id,
            progress: 100,
            currentStep: 'Research completed successfully!',
            message: 'Research completed successfully!'
          });

          // Then send completion
          websocketInstance.sendCompletion(session.id, {
            projectId: project.id,
            sessionId: session.id,
            metadata: {
              wordCount: result.metadata.wordCount,
              sourceCount: result.metadata.sourceCount,
              quality: result.metadata.quality
            },
            pdfPath: result.pdfPath
          });
        }

      } catch (error) {
        logger.error('Research generation failed:', error);

        // Update project and session with error
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'FAILED' }
        });

        await prisma.researchSession.update({
          where: { id: session.id },
          data: {
            status: 'FAILED',
            currentStep: 'Research failed'
          }
        });

        // Notify error via WebSocket
        if (websocketInstance) {
          websocketInstance.sendError(session.id, {
            message: error instanceof Error ? error.message : 'Research generation failed',
            projectId: project.id,
            sessionId: session.id
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        message: 'Research generation started',
        estimatedDuration: 300000 // 5 minutes estimate
      }
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

    logger.error('Failed to start research generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start research generation'
    });
    return;
  }
});

// GET /api/projects/:id/status - Get generation status
router.get('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId
      },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    // Type assertion to ensure TypeScript recognizes the included relations
    const typedProject = project as (typeof project & { sessions: { status?: string, progress?: number, currentStep?: string, id?: string }[] });
    const latestSession = typedProject.sessions[0];

    res.json({
      success: true,
      data: {
        projectStatus: project.status,
        sessionStatus: latestSession?.status,
        progress: latestSession?.progress || 0,
        currentStep: latestSession?.currentStep || 'Not started',
        updatedAt: project.updatedAt,
        sessionId: latestSession?.id
      }
    });

  } catch (error) {
    logger.error('Failed to fetch project status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project status'
    });
    return;
  }
});

// GET /api/projects/:id/download - Download generated PDF
router.get('/:id/download', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId
      },
      include: {
        files: {
          where: { fileType: 'PDF' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to access it'
      });
      return;
    }

    // Type assertion
    const typedProjectForFile = project as (typeof project & { files: { fileName: string, filePath: string }[] });
    const pdfFile = typedProjectForFile.files[0];
    if (!pdfFile) {
      res.status(404).json({
        success: false,
        error: 'PDF file not generated yet'
      });
      return;
    }

    // Check if file exists
    const fs = require('fs');
    
    if (!fs.existsSync(pdfFile.filePath)) {
      res.status(404).json({
        success: false,
        error: 'PDF file not found on disk'
      });
      return;
    }

    // Set headers for file download or viewing
    const viewMode = req.query.view === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    
    if (viewMode) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFile.fileName}"`);
    }

    // Stream file to response
    const fileStream = fs.createReadStream(pdfFile.filePath);
    fileStream.pipe(res);

  } catch (error) {
    logger.error('Failed to download PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF'
    });
    // Note: If headers already sent by pipe, this json response might not be sent.
    // However, if fs.createReadStream fails before pipe, this will be sent.
    return;
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId
      }
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to delete it'
      });
      return;
    }

    // Delete associated files
    await prisma.projectFile.deleteMany({
      where: { projectId }
    });

    // Delete project (cascades to sessions and tool usage)
    await prisma.project.delete({
      where: { id: projectId }
    });

    logger.info(`Deleted project: ${projectId} for user: ${userId}`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
    return;
  }
});

// Helper function to parse AI-generated content and create individual report sections
async function createReportSectionsFromContent(
  projectId: string, 
  content: string, 
  outline: any
): Promise<void> {
  try {
    logger.info(`Creating sections for project ${projectId}, content length: ${content.length}, outline sections: ${outline.sections?.length || 0}`);
    // Parse the markdown content by section headers
    const sections = parseContentIntoSections(content, outline.sections);
    logger.info(`Parsed ${sections.length} sections from content`);
    
    // Create report sections in database
    if (sections.length > 0) {
      await prisma.reportSection.createMany({
        data: sections.map((section, index) => ({
          projectId,
          order: index + 1,
          title: section.title,
          type: mapSectionTypeFromTitle(section.title),
          content: section.content,
          metadata: {
            generatedByAI: true,
            wordCount: section.content.split(/\s+/).length,
            createdAt: new Date().toISOString()
          }
        }))
      });
      
      logger.info(`Created ${sections.length} report sections for project ${projectId}`);
    }
  } catch (error) {
    logger.error('Failed to create report sections from content:', error);
    // Don't throw - this shouldn't fail the entire generation
  }
}

// Parse markdown content into individual sections
function parseContentIntoSections(content: string, outlineSections: any[]): Array<{title: string, content: string}> {
  const sections: Array<{title: string, content: string}> = [];
  
  // Split content by section headers (## Section Title)
  const sectionParts = content.split(/^## /m).filter(part => part.trim());
  
  // Map outline sections to ensure we have the correct titles
  const outlineTitles = outlineSections.map(section => section.title);
  
  sectionParts.forEach(part => {
    const lines = part.trim().split('\n');
    if (lines.length === 0) return;
    
    const title = lines[0].trim();
    const sectionContent = lines.slice(1).join('\n').trim();
    
    // Only include sections that match our outline or are standard sections
    if (outlineTitles.includes(title) || isStandardSection(title)) {
      sections.push({
        title,
        content: sectionContent
      });
    }
  });
  
  // If no sections found, try to create basic sections from outline
  if (sections.length === 0 && outlineSections.length > 0) {
    // Create basic sections with placeholder content
    outlineSections.forEach(section => {
      sections.push({
        title: section.title,
        content: `### ${section.title}\n\nContent for ${section.title} section. This section covers the key aspects and analysis related to the research topic.\n\n${section.keyPoints ? section.keyPoints.map((point: string) => `- ${point}`).join('\n') : ''}`
      });
    });
  }
  
  return sections;
}

// Map section titles to report section types
function mapSectionTypeFromTitle(title: string): 'ABSTRACT' | 'INTRODUCTION' | 'CONCLUSION' | 'REFERENCES' | 'TEXT' {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('abstract')) return 'ABSTRACT';
  if (lowerTitle.includes('introduction')) return 'INTRODUCTION';
  if (lowerTitle.includes('conclusion')) return 'CONCLUSION';
  if (lowerTitle.includes('reference') || lowerTitle.includes('bibliograph') || lowerTitle.includes('citation')) return 'REFERENCES';
  
  return 'TEXT'; // Default type
}

// Check if title represents a standard academic section
function isStandardSection(title: string): boolean {
  const standardSections = [
    'abstract', 'introduction', 'literature review', 'methodology', 'methods',
    'results', 'findings', 'discussion', 'analysis', 'conclusion', 'references',
    'bibliography', 'appendix'
  ];
  
  return standardSections.some(section => 
    title.toLowerCase().includes(section)
  );
}

export default router;
