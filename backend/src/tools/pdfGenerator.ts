import { Tool, ToolResult, ToolParameter } from '../shared';
import { latexCompiler } from '../services/latexCompiler';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../services/logger';

export interface PDFGeneratorInput {
  content: string;
  title: string;
  projectId?: string;
  useLatex?: boolean;
  metadata?: {
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    abstract?: string;
  };
  formatting?: {
    fontSize?: number;
    lineHeight?: number;
    margin?: number;
    fontFamily?: string;
    documentClass?: string;
    citationStyle?: string;
  };
  template?: 'minimal' | 'academic' | 'professional' | 'custom';
}

export class PDFGeneratorTool implements Tool {
  public name = 'PDFGenerator';
  public description = 'Generate PDF documents from research paper content using LaTeX or HTML conversion';
  public parameters: ToolParameter[] = [
    {
      name: 'content',
      type: 'string',
      description: 'Markdown, LaTeX, or plain text content to convert to PDF',
      required: true
    },
    {
      name: 'title',
      type: 'string',
      description: 'Document title',
      required: true
    },
    {
      name: 'projectId',
      type: 'string',
      description: 'Project ID for file organization',
      required: false
    },
    {
      name: 'useLatex',
      type: 'boolean',
      description: 'Whether to use LaTeX compilation (default: true)',
      required: false
    },
    {
      name: 'metadata',
      type: 'object',
      description: 'Document metadata (author, subject, keywords, abstract)',
      required: false
    },
    {
      name: 'formatting',
      type: 'object',
      description: 'PDF formatting options',
      required: false
    },
    {
      name: 'template',
      type: 'string',
      description: 'Document template to use',
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
      let outputPath: string;
      let metadata: any = {};

      if (input.useLatex !== false) {
        // Use LaTeX compilation (default)
        const result = await this.generateLatexPDF(input);
        outputPath = result.path;
        metadata = result.metadata;
      } else {
        // Fallback to HTML/Puppeteer method
        outputPath = await this.generateHtmlPDF(input);
        metadata = {
          fileSize: this.getFileSize(outputPath),
          pageCount: this.estimatePageCount(input.content)
        };
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: outputPath,
        metadata: {
          ...metadata,
          duration,
          method: input.useLatex !== false ? 'latex' : 'html'
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

  private async generateLatexPDF(input: PDFGeneratorInput): Promise<{path: string, metadata: any}> {
    const { content, title, projectId, metadata = {}, formatting = {}, template = 'academic' } = input;
    
    // Create output directory
    const outputDir = projectId 
      ? path.join(process.cwd(), 'storage', 'projects', projectId, 'output')
      : path.join(process.cwd(), 'output', 'pdfs');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate LaTeX content
    let latexContent: string;
    
    if (this.isLatexContent(content)) {
      // Content is already LaTeX
      latexContent = content;
    } else {
      // Convert markdown/plain text to LaTeX
      latexContent = this.convertToLatex(content, title, metadata, formatting, template);
    }

    // Compile to PDF
    const filename = this.sanitizeFilename(title);
    const result = await latexCompiler.compileDocument(latexContent, filename, outputDir);

    if (!result.success) {
      throw new Error(`LaTeX compilation failed: ${result.error}`);
    }

    // Save PDF to final location
    const finalPath = path.join(outputDir, `${filename}.pdf`);
    if (result.output) {
      fs.writeFileSync(finalPath, result.output);
    }

    this.logger.info(`LaTeX PDF generated successfully: ${finalPath}`);

    return {
      path: finalPath,
      metadata: {
        fileSize: result.output?.length || 0,
        compilationAttempts: result.attempts,
        compilationLog: result.log
      }
    };
  }

  private async generateHtmlPDF(input: PDFGeneratorInput): Promise<string> {
    // Fallback implementation using Puppeteer (existing jsPDF logic simplified)
    const { content, title, metadata = {}, formatting = {} } = input;
    
    const outputDir = path.join(process.cwd(), 'output', 'pdfs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert content to HTML
    const htmlContent = this.convertToHtml(content, title, metadata, formatting);
    
    // Use Puppeteer to generate PDF (simplified version)
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const filename = `${this.sanitizeFilename(title)}_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      }
    });
    
    await browser.close();

    this.logger.info(`HTML PDF generated successfully: ${outputPath}`);
    return outputPath;
  }

  private isLatexContent(content: string): boolean {
    // Check if content contains LaTeX commands
    return /\\(documentclass|usepackage|begin|end|section|title|author)\b/.test(content);
  }

  private convertToLatex(
    content: string, 
    title: string, 
    metadata: any, 
    formatting: any, 
    template: string
  ): string {
    let latex = this.getLatexPreamble(template, formatting);

    // Add title and metadata
    latex += `\\title{${this.escapeLatex(title)}}\n`;
    latex += `\\author{${this.escapeLatex(metadata.author || 'Research Agent')}}\n`;
    latex += `\\date{\\today}\n\n`;

    latex += `\\begin{document}\n\n`;
    latex += `\\maketitle\n\n`;

    // Add abstract if provided
    if (metadata.abstract) {
      latex += `\\begin{abstract}\n${this.escapeLatex(metadata.abstract)}\n\\end{abstract}\n\\newpage\n\n`;
    }

    // Add table of contents for longer documents
    if (content.length > 5000) {
      latex += `\\tableofcontents\n\\newpage\n\n`;
    }

    // Convert content
    if (this.isMarkdownContent(content)) {
      latex += this.markdownToLatex(content);
    } else {
      latex += this.plainTextToLatex(content);
    }

    latex += `\n\\end{document}`;

    return latex;
  }

  private getLatexPreamble(template: string, formatting: any): string {
    const documentClass = formatting.documentClass || 'article';
    const fontSize = formatting.fontSize || 11;
    
    let preamble = `\\documentclass[${fontSize}pt,a4paper]{${documentClass}}\n`;
    
    // Standard packages
    preamble += `\\usepackage[utf8]{inputenc}
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
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{listings}
\\usepackage{tikz}

`;

    // Template-specific packages and settings
    switch (template) {
      case 'academic':
        preamble += `\\usepackage{natbib}
\\usepackage{abstract}
\\renewcommand{\\abstractname}{Abstract}
\\setlength{\\absleftindent}{0mm}
\\setlength{\\absrightindent}{0mm}
`;
        break;
      case 'professional':
        preamble += `\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\leftmark}
\\fancyhead[R]{\\thepage}
`;
        break;
      case 'minimal':
        // Keep it simple
        break;
    }

    // Geometry and spacing
    const margin = formatting.margin || '1in';
    preamble += `\\geometry{margin=${margin}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

`;

    // Configure hyperref (should be last)
    preamble += `\\hypersetup{
  colorlinks=true,
  linkcolor=blue,
  filecolor=magenta,
  urlcolor=cyan,
  pdftitle={${formatting.title || 'Research Document'}},
  pdfauthor={${formatting.author || 'Research Agent'}}
}

`;

    return preamble;
  }

  private isMarkdownContent(content: string): boolean {
    return /^#{1,6}\s+/.test(content) || /^\*\s+|\d+\.\s+/.test(content);
  }

  private markdownToLatex(content: string): string {
    let latex = content;

    // Headers
    latex = latex.replace(/^#### (.*$)/gim, '\\subsubsection{$1}');
    latex = latex.replace(/^### (.*$)/gim, '\\subsection{$1}');
    latex = latex.replace(/^## (.*$)/gim, '\\section{$1}');
    latex = latex.replace(/^# (.*$)/gim, '\\section{$1}');

    // Bold and italic
    latex = latex.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
    latex = latex.replace(/\*(.*?)\*/g, '\\textit{$1}');

    // Lists
    latex = latex.replace(/^\* (.*)$/gm, '\\item $1');
    latex = latex.replace(/^(\d+)\. (.*)$/gm, '\\item $2');

    // Wrap lists in itemize/enumerate environments
    latex = latex.replace(/(\\item[^\n]*\n?)+/g, (match) => {
      if (match.includes('\\item')) {
        return `\\begin{itemize}\n${match}\\end{itemize}\n\n`;
      }
      return match;
    });

    // Code blocks
    latex = latex.replace(/```([\s\S]*?)```/g, '\\begin{lstlisting}\n$1\n\\end{lstlisting}');
    latex = latex.replace(/`([^`]+)`/g, '\\texttt{$1}');

    // Links
    latex = latex.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\\href{$2}{$1}');

    // Escape special characters
    latex = this.escapeLatex(latex);

    return latex;
  }

  private plainTextToLatex(content: string): string {
    // Split into paragraphs and escape
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs
      .map(para => this.escapeLatex(para.trim()))
      .filter(para => para.length > 0)
      .join('\n\n');
  }

  private convertToHtml(content: string, title: string, metadata: any, formatting: any): string {
    const fontSize = formatting.fontSize || 12;
    const fontFamily = formatting.fontFamily || 'Arial, sans-serif';
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: ${fontFamily};
            font-size: ${fontSize}pt;
            line-height: 1.6;
            margin: 2cm;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.3em; }
        p { margin-bottom: 1em; text-align: justify; }
        ul, ol { margin-bottom: 1em; }
        li { margin-bottom: 0.3em; }
        code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f8f9fa; padding: 1em; border-radius: 5px; overflow-x: auto; }
        .title-page {
            text-align: center;
            margin-bottom: 3em;
        }
        .abstract {
            background-color: #f8f9fa;
            padding: 1em;
            border-left: 4px solid #3498db;
            margin: 2em 0;
        }
    </style>
</head>
<body>`;

    // Title page
    html += `<div class="title-page">
        <h1>${title}</h1>
        <p><strong>Author:</strong> ${metadata.author || 'Research Agent'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>`;

    // Abstract
    if (metadata.abstract) {
      html += `<div class="abstract">
        <h3>Abstract</h3>
        <p>${metadata.abstract}</p>
      </div>`;
    }

    // Convert content
    let bodyContent = content;
    if (this.isMarkdownContent(content)) {
      bodyContent = this.markdownToHtml(content);
    } else {
      bodyContent = this.plainTextToHtml(content);
    }

    html += bodyContent;
    html += `</body></html>`;

    return html;
  }

  private markdownToHtml(content: string): string {
    let html = content;

    // Headers
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Lists (basic implementation)
    html = html.replace(/^\* (.*)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*)$/gm, '<li>$2</li>');

    // Wrap consecutive list items
    html = html.replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<[^>]+>)<\/p>/g, '$1');

    return html;
  }

  private plainTextToHtml(content: string): string {
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs
      .map(para => `<p>${this.escapeHtml(para.trim())}</p>`)
      .filter(para => para !== '<p></p>')
      .join('\n');
  }

  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\textasciitilde{}');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
