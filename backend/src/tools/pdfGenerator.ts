import { Tool, ToolResult, ToolParameter } from '../shared';
import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../services/logger';

export interface PDFGeneratorInput {
  content: string;
  title: string;
  metadata?: {
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
  };
  formatting?: {
    fontSize?: number;
    lineHeight?: number;
    margin?: number;
    fontFamily?: string;
  };
}

export class PDFGeneratorTool implements Tool {
  public name = 'PDFGenerator';
  public description = 'Generate PDF documents from research paper content';
  public parameters: ToolParameter[] = [
    {
      name: 'content',
      type: 'string',
      description: 'Markdown or plain text content to convert to PDF',
      required: true
    },
    {
      name: 'title',
      type: 'string',
      description: 'Document title',
      required: true
    },
    {
      name: 'metadata',
      type: 'object',
      description: 'Document metadata (author, subject, keywords)',
      required: false
    },
    {
      name: 'formatting',
      type: 'object',
      description: 'PDF formatting options',
      required: false
    }
  ];

  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
  }

  public async execute(input: PDFGeneratorInput): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const outputPath = await this.generatePDF(input);
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: outputPath,
        metadata: {
          duration,
          fileSize: this.getFileSize(outputPath),
          pageCount: this.estimatePageCount(input.content)
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('PDF generation failed:', error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  private async generatePDF(input: PDFGeneratorInput): Promise<string> {
    const { content, title, metadata = {}, formatting = {} } = input;
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output', 'pdfs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create PDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set document properties
    doc.setProperties({
      title: title,
      subject: metadata.subject || title,
      author: metadata.author || 'Research Agent',
      keywords: metadata.keywords?.join(', ') || '',
      creator: metadata.creator || 'Research Agent PDF Generator'
    });

    // Configure formatting
    const config = {
      fontSize: formatting.fontSize || 12,
      lineHeight: formatting.lineHeight || 1.5,
      margin: formatting.margin || 20,
      fontFamily: formatting.fontFamily || 'helvetica'
    };

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const contentWidth = pageWidth - (config.margin * 2);

    let yPosition = config.margin;
    let currentPage = 1;

    // Parse and render content
    const sections = this.parseMarkdownContent(content);
    
    for (const section of sections) {
      // Check if we need a new page
      if (yPosition > pageHeight - config.margin - 20) {
        doc.addPage();
        yPosition = config.margin;
        currentPage++;
      }

      switch (section.type) {
        case 'title':
          yPosition = this.addTitle(doc, section.content, yPosition, contentWidth, config);
          break;
        case 'heading1':
          yPosition = this.addHeading(doc, section.content, yPosition, contentWidth, config, 16);
          break;
        case 'heading2':
          yPosition = this.addHeading(doc, section.content, yPosition, contentWidth, config, 14);
          break;
        case 'heading3':
          yPosition = this.addHeading(doc, section.content, yPosition, contentWidth, config, 12);
          break;
        case 'paragraph':
          yPosition = this.addParagraph(doc, section.content, yPosition, contentWidth, config);
          break;
        case 'list':
          yPosition = this.addList(doc, section.content, yPosition, contentWidth, config);
          break;
      }

      // Add spacing after each section
      yPosition += 5;
    }

    // Add page numbers
    this.addPageNumbers(doc, currentPage);

    // Generate filename and save
    const filename = `${this.sanitizeFilename(title)}_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));

    this.logger.info(`PDF generated successfully: ${outputPath}`);
    return outputPath;
  }

  private parseMarkdownContent(content: string): Array<{type: string, content: string}> {
    const lines = content.split('\n');
    const sections = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        sections.push({ type: 'title', content: trimmed.substring(2) });
      } else if (trimmed.startsWith('## ')) {
        sections.push({ type: 'heading1', content: trimmed.substring(3) });
      } else if (trimmed.startsWith('### ')) {
        sections.push({ type: 'heading2', content: trimmed.substring(4) });
      } else if (trimmed.startsWith('#### ')) {
        sections.push({ type: 'heading3', content: trimmed.substring(5) });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Collect list items
        const listItems = [trimmed.substring(2)];
        sections.push({ type: 'list', content: JSON.stringify(listItems) });
      } else if (trimmed.length > 0) {
        sections.push({ type: 'paragraph', content: trimmed });
      }
    }
    
    return sections;
  }

  private addTitle(doc: jsPDF, text: string, yPos: number, width: number, config: any): number {
    doc.setFont(config.fontFamily, 'bold');
    doc.setFontSize(20);
    
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, config.margin, yPos);
    
    // Add underline
    const textWidth = doc.getTextWidth(text);
    doc.line(config.margin, yPos + 5, config.margin + textWidth, yPos + 5);
    
    return yPos + (lines.length * 8) + 10;
  }

  private addHeading(doc: jsPDF, text: string, yPos: number, width: number, config: any, fontSize: number): number {
    doc.setFont(config.fontFamily, 'bold');
    doc.setFontSize(fontSize);
    
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, config.margin, yPos);
    
    return yPos + (lines.length * (fontSize * 0.5)) + 8;
  }

  private addParagraph(doc: jsPDF, text: string, yPos: number, width: number, config: any): number {
    doc.setFont(config.fontFamily, 'normal');
    doc.setFontSize(config.fontSize);
    
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, config.margin, yPos);
    
    return yPos + (lines.length * (config.fontSize * config.lineHeight * 0.35)) + 5;
  }

  private addList(doc: jsPDF, itemsJson: string, yPos: number, width: number, config: any): number {
    doc.setFont(config.fontFamily, 'normal');
    doc.setFontSize(config.fontSize);
    
    try {
      const items = JSON.parse(itemsJson);
      let currentY = yPos;
      
      for (const item of items) {
        const lines = doc.splitTextToSize(`• ${item}`, width - 10);
        doc.text(lines, config.margin + 5, currentY);
        currentY += lines.length * (config.fontSize * config.lineHeight * 0.35) + 2;
      }
      
      return currentY + 3;
    } catch {
      return yPos;
    }
  }

  private addPageNumbers(doc: jsPDF, totalPages: number): void {
    // const totalPagesExp = '{total_pages_count_string}'; // Unused variable
      
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `Page ${i} of ${totalPages}`,
        210 - 20, // X position (right aligned)
        297 - 10, // Y position (bottom)
        { align: 'right' }
      );
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase()
      .substring(0, 50);
  }

  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private estimatePageCount(content: string): number {
    const wordsPerPage = 500; // Rough estimate
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerPage);
  }
}
