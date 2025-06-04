import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';
import { database } from './database';
import archiver from 'archiver';

interface ProjectStructure {
  mainDir: string;
  sectionsDir: string;
  assetsDir: string;
  outputDir: string;
  tempDir: string;
}

interface ProjectMetadata {
  id: string;
  title: string;
  topic: string;
  created: string;
  lastModified: string;
  sectionsCount: number;
  totalPages?: number;
  wordCount?: number;
}

export class ProjectStorageService {
  private baseStorageDir: string;
  
  constructor(baseDir = '/app/storage') {
    this.baseStorageDir = baseDir;
  }

  async initializeProject(projectId: string): Promise<ProjectStructure> {
    const projectDir = path.join(this.baseStorageDir, 'projects', projectId);
    
    const structure: ProjectStructure = {
      mainDir: projectDir,
      sectionsDir: path.join(projectDir, 'sections'),
      assetsDir: path.join(projectDir, 'assets'),
      outputDir: path.join(projectDir, 'output'),
      tempDir: path.join(projectDir, 'temp')
    };

    // Create directory structure
    for (const dir of Object.values(structure)) {
      await fs.mkdir(dir, { recursive: true });
    }

    logger.info(`Initialized project structure for ${projectId}`);
    return structure;
  }

  async saveSection(
    projectId: string, 
    sectionId: string, 
    content: string, 
    metadata: any = {}
  ): Promise<void> {
    const structure = await this.getProjectStructure(projectId);
    const filename = `section_${sectionId}.tex`;
    const filePath = path.join(structure.sectionsDir, filename);
    
    // Add LaTeX section formatting if not present
    const formattedContent = this.formatSectionContent(content, metadata);
    
    await fs.writeFile(filePath, formattedContent, 'utf8');
    logger.info(`Saved section ${sectionId} for project ${projectId}`);
  }

  async loadSection(projectId: string, sectionId: string): Promise<string | null> {
    try {
      const structure = await this.getProjectStructure(projectId);
      const filename = `section_${sectionId}.tex`;
      const filePath = path.join(structure.sectionsDir, filename);
      
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.warn(`Failed to load section ${sectionId} for project ${projectId}:`, error);
      return null;
    }
  }

  async deleteSection(projectId: string, sectionId: string): Promise<void> {
    try {
      const structure = await this.getProjectStructure(projectId);
      const filename = `section_${sectionId}.tex`;
      const filePath = path.join(structure.sectionsDir, filename);
      
      await fs.unlink(filePath);
      logger.info(`Deleted section ${sectionId} for project ${projectId}`);
    } catch (error) {
      logger.warn(`Failed to delete section ${sectionId} for project ${projectId}:`, error);
    }
  }

  async generateMainTexFile(projectId: string): Promise<string> {
    try {
      // Get project data from database
      const project = await database.project.findUnique({
        where: { id: projectId },
        include: { 
          sections: { 
            orderBy: { order: 'asc' } 
          } 
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const structure = await this.getProjectStructure(projectId);
      
      // Generate main.tex content
      const mainTexContent = await this.createMainTexContent(project);
      
      // Save main.tex file
      const mainTexPath = path.join(structure.mainDir, 'main.tex');
      await fs.writeFile(mainTexPath, mainTexContent, 'utf8');
      
      logger.info(`Generated main.tex for project ${projectId}`);
      return mainTexPath;
    } catch (error) {
      logger.error(`Failed to generate main.tex for project ${projectId}:`, error);
      throw error;
    }
  }

  async createZipExport(projectId: string): Promise<Buffer> {
    try {
      const structure = await this.getProjectStructure(projectId);
      
      // Generate main.tex first
      await this.generateMainTexFile(projectId);
      
      // Create README
      await this.generateReadme(projectId);
      
      // Create zip archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      
      archive.on('data', (chunk) => chunks.push(chunk));
      
      // Add all project files to archive
      archive.directory(structure.mainDir, `project_${projectId}`);
      
      await archive.finalize();
      
      const zipBuffer = Buffer.concat(chunks);
      logger.info(`Created ZIP export for project ${projectId}`);
      
      return zipBuffer;
    } catch (error) {
      logger.error(`Failed to create ZIP export for project ${projectId}:`, error);
      throw error;
    }
  }

  async getProjectMetadata(projectId: string): Promise<ProjectMetadata | null> {
    try {
      const project = await database.project.findUnique({
        where: { id: projectId },
        include: { 
          sections: true 
        }
      });

      if (!project) return null;

      const wordCount = await this.calculateWordCount(projectId);

      return {
        id: project.id,
        title: project.title,
        topic: project.topic,
        created: project.createdAt.toISOString(),
        lastModified: project.updatedAt.toISOString(),
        sectionsCount: project.sections.length,
        wordCount
      };
    } catch (error) {
      logger.error(`Failed to get metadata for project ${projectId}:`, error);
      return null;
    }
  }

  async saveAsset(
    projectId: string, 
    filename: string, 
    content: Buffer
  ): Promise<string> {
    const structure = await this.getProjectStructure(projectId);
    const assetPath = path.join(structure.assetsDir, filename);
    
    await fs.writeFile(assetPath, content);
    logger.info(`Saved asset ${filename} for project ${projectId}`);
    
    return assetPath;
  }

  async listAssets(projectId: string): Promise<string[]> {
    try {
      const structure = await this.getProjectStructure(projectId);
      const files = await fs.readdir(structure.assetsDir);
      return files;
    } catch (error) {
      logger.warn(`Failed to list assets for project ${projectId}:`, error);
      return [];
    }
  }

  async cleanupProject(projectId: string): Promise<void> {
    try {
      const projectDir = path.join(this.baseStorageDir, 'projects', projectId);
      await fs.rmdir(projectDir, { recursive: true });
      logger.info(`Cleaned up project directory for ${projectId}`);
    } catch (error) {
      logger.warn(`Failed to cleanup project ${projectId}:`, error);
    }
  }

  private async getProjectStructure(projectId: string): Promise<ProjectStructure> {
    const projectDir = path.join(this.baseStorageDir, 'projects', projectId);
    
    return {
      mainDir: projectDir,
      sectionsDir: path.join(projectDir, 'sections'),
      assetsDir: path.join(projectDir, 'assets'),
      outputDir: path.join(projectDir, 'output'),
      tempDir: path.join(projectDir, 'temp')
    };
  }

  private formatSectionContent(content: string, metadata: any = {}): string {
    const { title, type = 'TEXT', level = 1 } = metadata;
    
    let formattedContent = '';
    
    // Add section header based on level
    if (title) {
      const sectionCommand = level === 1 ? 'section' : 
                            level === 2 ? 'subsection' : 'subsubsection';
      formattedContent += `\\${sectionCommand}{${title}}\n\n`;
    }
    
    // Format content based on type
    switch (type) {
      case 'CODE':
        formattedContent += `\\begin{lstlisting}\n${content}\n\\end{lstlisting}\n`;
        break;
      case 'MATH':
        formattedContent += `\\begin{align}\n${content}\n\\end{align}\n`;
        break;
      case 'TABLE':
        formattedContent += content; // Assume content is already LaTeX table
        break;
      case 'FIGURE':
        formattedContent += content; // Assume content is already LaTeX figure
        break;
      default:
        formattedContent += content;
    }
    
    return formattedContent;
  }

  private async createMainTexContent(project: any): Promise<string> {
    const sections = project.sections || [];
    
    let mainContent = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{longtable}
\\usepackage{url}
\\usepackage{natbib}
\\usepackage{listings}
\\usepackage{tikz}
\\usepackage{pgfplots}

\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[C]{\\thepage}

% Configure listings for code
\\lstset{
  basicstyle=\\ttfamily\\footnotesize,
  breaklines=true,
  frame=single,
  numbers=left,
  numberstyle=\\tiny,
  tabsize=2
}

\\title{${project.title}}
\\author{Generated by Research Agent}
\\date{\\today}

\\begin{document}

\\maketitle

% Abstract
${project.metadata?.abstract ? `\\begin{abstract}\n${project.metadata.abstract}\n\\end{abstract}\n` : ''}

\\tableofcontents
\\newpage

`;

    // Add each section
    for (const section of sections) {
      const sectionContent = await this.loadSection(project.id, section.id);
      if (sectionContent) {
        mainContent += `% Section: ${section.title}\n`;
        mainContent += sectionContent;
        mainContent += '\n\n';
      }
    }

    // Add bibliography if exists
    if (project.metadata?.bibliography) {
      mainContent += `\n\\bibliographystyle{plain}\n\\bibliography{references}\n`;
    }

    mainContent += '\\end{document}';

    return mainContent;
  }

  private async generateReadme(projectId: string): Promise<void> {
    try {
      const metadata = await this.getProjectMetadata(projectId);
      if (!metadata) return;

      const structure = await this.getProjectStructure(projectId);
      
      const readmeContent = `# ${metadata.title}

## Project Information
- **Topic**: ${metadata.topic}
- **Created**: ${new Date(metadata.created).toLocaleDateString()}
- **Last Modified**: ${new Date(metadata.lastModified).toLocaleDateString()}
- **Sections**: ${metadata.sectionsCount}
- **Word Count**: ${metadata.wordCount || 'Unknown'}

## Project Structure
- \`main.tex\` - Main LaTeX document file
- \`sections/\` - Individual section files
- \`assets/\` - Images, figures, and other assets
- \`output/\` - Generated PDFs and compilation outputs
- \`temp/\` - Temporary compilation files

## Compilation Instructions
To compile this LaTeX document:

1. Ensure you have a LaTeX distribution installed (TeX Live, MiKTeX, etc.)
2. Navigate to the project directory
3. Run: \`pdflatex main.tex\`
4. For bibliography support, also run: \`bibtex main\`
5. Re-run pdflatex twice more for cross-references

## Files Description
- The main document is structured with sections imported from the \`sections/\` directory
- All assets and figures are stored in the \`assets/\` directory
- The document uses standard academic formatting with proper headers and page numbering

## Generated by Research Agent
This document was automatically generated by the Research Agent system.
For questions or issues, refer to the system documentation.
`;

      const readmePath = path.join(structure.mainDir, 'README.md');
      await fs.writeFile(readmePath, readmeContent, 'utf8');
      
      logger.info(`Generated README for project ${projectId}`);
    } catch (error) {
      logger.error(`Failed to generate README for project ${projectId}:`, error);
    }
  }

  private async calculateWordCount(projectId: string): Promise<number> {
    try {
      const project = await database.project.findUnique({
        where: { id: projectId },
        include: { sections: true }
      });

      if (!project) return 0;

      let totalWords = 0;
      
      for (const section of project.sections) {
        // Remove LaTeX commands and count words
        const cleanContent = section.content
          .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // Remove LaTeX commands
          .replace(/\\[a-zA-Z]+/g, '') // Remove standalone commands
          .replace(/[{}]/g, '') // Remove braces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        const words = cleanContent.split(' ').filter((word: string) => word.length > 0);
        totalWords += words.length;
      }

      return totalWords;
    } catch (error) {
      logger.error(`Failed to calculate word count for project ${projectId}:`, error);
      return 0;
    }
  }
}

export const projectStorage = new ProjectStorageService();
