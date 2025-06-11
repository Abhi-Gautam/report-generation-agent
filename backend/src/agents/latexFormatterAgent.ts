import { BaseAgent, AgentConfig, AgentMemoryManager } from './base';
import { AgentType } from '../shared';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ReportSection {
  id: string;
  title: string;
  type: 'ABSTRACT' | 'INTRODUCTION' | 'CONCLUSION' | 'REFERENCES' | 'TEXT';
  content: string;
  order: number;
  metadata?: any;
}

export interface LaTeXFormatterInput {
  sections: ReportSection[];
  title: string;
  author?: string;
  metadata?: {
    citationStyle?: 'APA' | 'MLA' | 'CHICAGO' | 'IEEE';
    documentClass?: string;
    template?: 'academic' | 'professional' | 'minimal';
    bibliography?: any[];
    keywords?: string[];
    abstract?: string;
  };
  formatting?: {
    fontSize?: number;
    margin?: string;
    lineSpacing?: number;
    includeTableOfContents?: boolean;
    includeBibliography?: boolean;
  };
}

export interface LaTeXFormatterOutput {
  latexDocument: string;
  documentStructure: {
    preamble: string;
    titlePage: string;
    tableOfContents?: string;
    abstract?: string;
    mainContent: string;
    bibliography?: string;
  };
  metadata: {
    totalSections: number;
    wordCount: number;
    figureCount: number;
    tableCount: number;
    citationCount: number;
    processingTime: number;
  };
  warnings: string[];
}

export class LaTeXFormatterAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private memory: AgentMemoryManager;

  constructor(websocket?: any) {
    const config: AgentConfig = {
      name: 'LaTeX Formatter Agent',
      type: AgentType.RESEARCH,
      description: 'Converts individual report sections into properly structured LaTeX documents',
      tools: [],
      maxIterations: 10,
      timeout: 120000 // 2 minutes
    };

    super(config, websocket);
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.memory = new AgentMemoryManager();
  }

  public getName(): string {
    return this.config.name;
  }

  public getDescription(): string {
    return this.config.description;
  }

  public async execute(input: LaTeXFormatterInput): Promise<LaTeXFormatterOutput> {
    const startTime = Date.now();
    this.logger.info(`Starting LaTeX formatting for ${input.sections.length} sections`);

    try {
      // Step 1: Analyze and organize sections
      await this.analyzeSections(input.sections);
      this.updateProgress(10, 'Analyzed section structure');

      // Step 2: Generate LaTeX preamble
      const preamble = await this.generatePreamble(input);
      this.updateProgress(25, 'Generated LaTeX preamble');

      // Step 3: Generate title page
      const titlePage = await this.generateTitlePage(input);
      this.updateProgress(35, 'Generated title page');

      // Step 4: Generate table of contents (if needed)
      const tableOfContents = input.formatting?.includeTableOfContents 
        ? await this.generateTableOfContents()
        : undefined;
      this.updateProgress(45, 'Generated table of contents');

      // Step 5: Format abstract (if exists)
      const abstractSection = await this.formatAbstract(input.sections);
      this.updateProgress(55, 'Formatted abstract');

      // Step 6: Format main content sections
      const mainContent = await this.formatMainSections(input.sections, input.metadata);
      this.updateProgress(80, 'Formatted main content sections');

      // Step 7: Generate bibliography (TEMPORARILY DISABLED)
      // Bibliography disabled until proper source pipeline is implemented
      const bibliography = undefined; // Temporarily disabled
      this.updateProgress(90, 'Skipped bibliography generation (temporarily disabled)');

      // Step 8: Assemble final document
      const documentParts: {
        preamble: string;
        titlePage: string;
        tableOfContents?: string;
        abstract?: string;
        mainContent: string;
        bibliography?: string;
      } = {
        preamble,
        titlePage,
        mainContent
      };

      if (tableOfContents) {
        documentParts.tableOfContents = tableOfContents;
      }
      if (abstractSection) {
        documentParts.abstract = abstractSection;
      }
      if (bibliography) {
        documentParts.bibliography = bibliography;
      }

      const result = await this.assembleDocument(documentParts, input);
      this.updateProgress(100, 'LaTeX document formatting completed');

      this.logger.info(`LaTeX formatting completed in ${Date.now() - startTime}ms`);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('LaTeX formatting failed:', error);

      if (this.websocket && this.sessionId) {
        this.websocket.sendError(this.sessionId, {
          message: errorMessage,
          step: 'LaTeX Formatter Agent'
        });
      }

      throw error;
    }
  }

  private async analyzeSections(sections: ReportSection[]): Promise<void> {
    // Sort sections by order
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    
    // Analyze section types and structure
    const sectionAnalysis = {
      hasAbstract: sortedSections.some(s => s.type === 'ABSTRACT'),
      hasIntroduction: sortedSections.some(s => s.type === 'INTRODUCTION'),
      hasConclusion: sortedSections.some(s => s.type === 'CONCLUSION'),
      hasReferences: sortedSections.some(s => s.type === 'REFERENCES'),
      mainSections: sortedSections.filter(s => s.type === 'TEXT'),
      totalWordCount: sortedSections.reduce((acc, s) => acc + s.content.split(/\s+/).length, 0)
    };

    this.memory.setContext('sectionAnalysis', sectionAnalysis);
    this.memory.setShortTerm('sortedSections', sortedSections);
  }

  private async generatePreamble(input: LaTeXFormatterInput): Promise<string> {
    const template = input.metadata?.template || 'academic';
    const documentClass = input.metadata?.documentClass || 'article';
    const fontSize = input.formatting?.fontSize || 11;
    const margin = input.formatting?.margin || '1in';

    let preamble = `\\documentclass[${fontSize}pt,a4paper]{${documentClass}}\n\n`;
    
    // Essential packages (only those confirmed available in Alpine texlive)
    preamble += `% Essential packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{geometry}
\\usepackage{url}

`;

    // Template-specific packages (only confirmed available)
    switch (template) {
      case 'academic':
        preamble += `% Academic template
\\renewcommand{\\abstractname}{Abstract}

`;
        break;
      case 'professional':
        preamble += `% Professional template (basic)

`;
        break;
    }

    // TEMPORARILY DISABLED: Basic citation style
    // preamble += `% Basic citations
    // \\bibliographystyle{plain}
    // 
    // `;

    // Geometry and formatting
    preamble += `% Page geometry and formatting
\\geometry{margin=${margin}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

`;

    // Line spacing (manual since setspace package not available)
    if (input.formatting?.lineSpacing) {
      const spacing = input.formatting.lineSpacing;
      preamble += `\\renewcommand{\\baselinestretch}{${spacing}}

`;
    }

    // Basic document setup
    preamble += `% Document formatting
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

`;

    return preamble;
  }

  private async generateTitlePage(input: LaTeXFormatterInput): Promise<string> {
    let titlePage = `% Title page
\\title{${this.escapeLatex(input.title)}}
\\author{${this.escapeLatex(input.author || 'Research Agent')}}
\\date{\\today}

\\begin{document}

\\maketitle

`;

    return titlePage;
  }

  private async generateTableOfContents(): Promise<string> {
    return `% Table of contents
\\tableofcontents
\\newpage

`;
  }

  private async formatAbstract(sections: ReportSection[]): Promise<string | undefined> {
    const abstractSection = sections.find(s => s.type === 'ABSTRACT');
    if (!abstractSection) return undefined;

    return `% Abstract
\\begin{abstract}
${abstractSection.content}
\\end{abstract}
\\newpage

`;
  }

  private async formatMainSections(sections: ReportSection[], metadata?: any): Promise<string> {
    const mainSections = sections
      .filter(s => s.type !== 'ABSTRACT' && s.type !== 'REFERENCES')
      .sort((a, b) => a.order - b.order);

    let content = `% Main content\n\n`;

    for (const section of mainSections) {
      content += await this.formatIndividualSection(section, metadata);
      content += '\n\n';
    }

    return content;
  }

  private async formatIndividualSection(section: ReportSection, metadata?: any): Promise<string> {
    let formattedContent = '';

    // Determine section level based on type and title
    const sectionLevel = this.determineSectionLevel(section);
    const sectionCommand = this.getSectionCommand(sectionLevel);

    // Format section title
    formattedContent += `${sectionCommand}{${this.escapeLatex(section.title)}}\n`;
    
    // Add label for cross-referencing
    const label = this.generateSectionLabel(section.title);
    formattedContent += `\\label{${label}}\n\n`;

    // Format section content
    const processedContent = await this.processSectionContent(section.content, metadata);
    formattedContent += processedContent;

    return formattedContent;
  }

  private async processSectionContent(content: string, metadata?: any): Promise<string> {
    let processed = content;

    // Use AI to enhance LaTeX formatting for complex content
    if (this.needsAIProcessing(content)) {
      processed = await this.enhanceContentWithAI(content, metadata);
    }

    // Apply standard formatting
    processed = this.formatMarkdownToLatex(processed);
    processed = this.formatCitations(processed);
    processed = this.formatFiguresAndTables(processed);

    return processed;
  }

  private needsAIProcessing(content: string): boolean {
    // Check if content has complex structures that benefit from AI processing
    return (
      content.includes('```') || // Code blocks
      content.includes('|') || // Tables
      content.includes('![') || // Images
      content.length > 2000 || // Long content
      /\d+\.\s/.test(content) // Numbered lists
    );
  }

  private async enhanceContentWithAI(content: string, _metadata?: any): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
Convert the following academic content to proper LaTeX format. 
Focus on:
1. Proper sectioning and subsectioning
2. Mathematical equations (use \\begin{equation} for numbered equations)
3. Tables (use standard tabular environment with hlines)
4. Figures and captions
5. Proper citation formatting
6. Code blocks (use verbatim environment)
7. Academic writing conventions

IMPORTANT: Only use basic LaTeX commands. DO NOT use:
- booktabs package commands (toprule, midrule, bottomrule)
- listings package commands (lstlisting)
- setspace package commands (setstretch)

Use verbatim for code blocks and standard tabular with \\hline for tables.

Content to convert:
${content}

Return only the LaTeX-formatted content, no explanations.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      return this.cleanAILatexOutput(response);
    } catch (error) {
      this.logger.warn('AI content enhancement failed, using fallback formatting:', error);
      return content;
    }
  }

  private cleanAILatexOutput(aiOutput: string): string {
    // Remove markdown code block markers if AI included them
    let cleaned = aiOutput.replace(/```latex\n?/g, '').replace(/```\n?/g, '');
    
    // Ensure proper spacing
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  }

  private formatMarkdownToLatex(content: string): string {
    let latex = content;

    // Headers (skip if already LaTeX sections)
    if (!latex.includes('\\section')) {
      latex = latex.replace(/^#### (.*$)/gim, '\\subsubsection{$1}');
      latex = latex.replace(/^### (.*$)/gim, '\\subsection{$1}');
      latex = latex.replace(/^## (.*$)/gim, '\\subsection{$1}');
      latex = latex.replace(/^# (.*$)/gim, '\\subsection{$1}');
    }

    // Text formatting
    latex = latex.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
    latex = latex.replace(/\*(.*?)\*/g, '\\textit{$1}');

    // Lists
    latex = latex.replace(/^\* (.*)$/gm, '\\item $1');
    latex = latex.replace(/^(\d+)\. (.*)$/gm, '\\item $2');

    // Wrap lists in environments
    latex = latex.replace(/(\\item[^\n]*(?:\n|$))+/g, (match) => {
      const items = match.trim();
      return `\\begin{itemize}\n${items}\n\\end{itemize}\n\n`;
    });

    // Code blocks (using verbatim since listings package not available)
    latex = latex.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return `\\begin{verbatim}\n${code}\n\\end{verbatim}`;
    });
    latex = latex.replace(/`([^`]+)`/g, '\\texttt{$1}');

    // Links (without hyperref, use simple formatting)
    latex = latex.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 (\\url{$2})');

    return latex;
  }

  private formatCitations(content: string): string {
    // TEMPORARILY DISABLED: Convert various citation formats to LaTeX
    // Citations are disabled until proper source pipeline is implemented
    let formatted = content;

    // TODO: Re-enable when source list and citation engine is ready
    // (Author, Year) -> \citep{key}
    // formatted = formatted.replace(/\(([^,]+),\s*(\d{4})\)/g, '\\citep{$1$2}');
    
    // [1] -> \cite{ref1}
    // formatted = formatted.replace(/\[(\d+)\]/g, '\\cite{ref$1}');

    return formatted;
  }

  private formatFiguresAndTables(content: string): string {
    let formatted = content;

    // Basic table detection and formatting
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    formatted = formatted.replace(tableRegex, (_match, header, rows) => {
      const headerCells = header.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
      const rowsArray = rows.trim().split('\n').map((row: string) => 
        row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
      );

      let table = '\\begin{center}\n';
      table += `\\begin{tabular}{${'|c'.repeat(headerCells.length)}|}\n`;
      table += '\\hline\n';
      table += headerCells.join(' & ') + ' \\\\\n';
      table += '\\hline\n';
      
      rowsArray.forEach((row: string[]) => {
        if (row.length > 0) {
          table += row.join(' & ') + ' \\\\\n';
          table += '\\hline\n'; // Add line after each row for better formatting
        }
      });
      
      table += '\\end{tabular}\n';
      table += '\\end{center}\n\n';

      return table;
    });

    // Basic figure handling (simplified)
    formatted = formatted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, _src) => {
      return `
\\begin{center}
\\textbf{Figure:} ${alt || 'Image'}
\\end{center}

`;
    });

    return formatted;
  }

  // TEMPORARILY DISABLED - Remove unused method to fix TS error
  // private async generateBibliography(bibliography: any[], citationStyle?: string): Promise<string> {
  //   if (!bibliography || bibliography.length === 0) return '';

  //   let bibContent = `% Bibliography
  // \\newpage
  // \\bibliographystyle{${this.getCitationStyle(citationStyle)}}
  // \\bibliography{references}

  // % References (manual)
  // \\begin{thebibliography}{${bibliography.length}}

  // `;

  //   bibliography.forEach((ref, index) => {
  //     bibContent += `\\bibitem{ref${index + 1}} ${this.formatReference(ref, citationStyle)}

  // `;
  //   });

  //   bibContent += '\\end{thebibliography}\n\n';

  //   return bibContent;
  // }

  // TEMPORARILY DISABLED - Remove unused method to fix TS error
  // private formatReference(ref: any, citationStyle?: string): string {
  //   // Basic reference formatting - can be enhanced based on citation style
  //   const style = citationStyle || 'APA';
    
  //   switch (style) {
  //     case 'APA':
  //       return `${ref.author || 'Unknown'}. (${ref.year || 'n.d.'}). ${ref.title}. ${ref.source || ref.url}`;
  //     case 'MLA':
  //       return `${ref.author || 'Unknown'}. "${ref.title}." ${ref.source || ref.url}, ${ref.year || 'n.d.'}.`;
  //     default:
  //       return `${ref.author || 'Unknown'}. ${ref.title}. ${ref.source || ref.url}. ${ref.year || 'n.d.'}.`;
  //   }
  // }

  private async assembleDocument(
    parts: {
      preamble: string;
      titlePage: string;
      tableOfContents?: string;
      abstract?: string;
      mainContent: string;
      bibliography?: string;
    },
    input: LaTeXFormatterInput
  ): Promise<LaTeXFormatterOutput> {
    
    // Assemble the complete document
    let document = parts.preamble;
    document += parts.titlePage;
    
    if (parts.tableOfContents) {
      document += parts.tableOfContents;
    }
    
    if (parts.abstract) {
      document += parts.abstract;
    }
    
    document += parts.mainContent;
    
    if (parts.bibliography) {
      document += parts.bibliography;
    }
    
    document += '\\end{document}';

    // Calculate metadata
    const wordCount = input.sections.reduce((acc, s) => acc + s.content.split(/\s+/).length, 0);
    const figureCount = (document.match(/\\includegraphics/g) || []).length;
    const tableCount = (document.match(/\\begin{table}/g) || []).length;
    const citationCount = (document.match(/\\cite/g) || []).length;

    return {
      latexDocument: document,
      documentStructure: parts,
      metadata: {
        totalSections: input.sections.length,
        wordCount,
        figureCount,
        tableCount,
        citationCount,
        processingTime: 0 // Will be set by caller
      },
      warnings: this.collectWarnings(document, input)
    };
  }

  private collectWarnings(document: string, input: LaTeXFormatterInput): string[] {
    const warnings: string[] = [];

    // Check for potential issues
    if (!document.includes('\\maketitle')) {
      warnings.push('No title page found in document');
    }

    if (input.sections.length === 0) {
      warnings.push('No sections provided for formatting');
    }

    if (document.includes('TODO') || document.includes('FIXME')) {
      warnings.push('Document contains TODO or FIXME markers');
    }

    // Check for unmatched environments
    const environments = ['itemize', 'enumerate', 'table', 'figure', 'equation'];
    environments.forEach(env => {
      const beginCount = (document.match(new RegExp(`\\\\begin{${env}}`, 'g')) || []).length;
      const endCount = (document.match(new RegExp(`\\\\end{${env}}`, 'g')) || []).length;
      if (beginCount !== endCount) {
        warnings.push(`Unmatched ${env} environment (${beginCount} begin, ${endCount} end)`);
      }
    });

    return warnings;
  }

  // Helper methods
  private determineSectionLevel(section: ReportSection): number {
    switch (section.type) {
      case 'INTRODUCTION':
      case 'CONCLUSION':
        return 1; // \section
      default:
        return 1; // \section (all main sections at same level)
    }
  }

  private getSectionCommand(level: number): string {
    switch (level) {
      case 1: return '\\section';
      case 2: return '\\subsection';
      case 3: return '\\subsubsection';
      default: return '\\section';
    }
  }

  private generateSectionLabel(title: string): string {
    return 'sec:' + title.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // TEMPORARILY DISABLED - Remove unused method to fix TS error
  // private getCitationStyle(style?: string): string {
  //   // Only use basic citation styles available in Alpine texlive
  //   switch (style) {
  //     case 'APA': return 'plain'; // fallback to plain since apalike might not be available
  //     case 'MLA': return 'plain';
  //     case 'CHICAGO': return 'plain';
  //     case 'IEEE': return 'plain';
  //     default: return 'plain';
  //   }
  // }

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

  private updateProgress(progress: number, message: string): void {
    if (this.websocket && this.sessionId) {
      this.websocket.sendProgressUpdate(this.sessionId, {
        sessionId: this.sessionId,
        progress,
        currentStep: message,
        message
      });
    }
  }

  // Memory management
  public exportMemory(): any {
    return this.memory.exportMemory();
  }

  public importMemory(data: any): void {
    this.memory.importMemory(data);
  }
}