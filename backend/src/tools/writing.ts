import { Tool, ToolResult, ToolParameter, ResearchOutline } from '../shared'; // Path already correct, was 'shared' now '../shared' relative to src/tools
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LoggerService } from '../services/logger';
import { generateBaseLatexTemplate } from '../templates/baseLatexTemplate';
import { parseLatexIntoSections } from '../utils/latexSectionParser';

export interface WritingInput {
  outline: ResearchOutline;
  researchData: any[];
  preferences?: {
    writingStyle?: 'ACADEMIC' | 'JOURNALISTIC' | 'TECHNICAL' | 'CASUAL';
    citationStyle?: 'APA' | 'MLA' | 'CHICAGO' | 'IEEE';
    detailLevel?: 'BRIEF' | 'MODERATE' | 'COMPREHENSIVE';
  };
}

export class WritingTool implements Tool {
  public name = 'Writing';
  public description = 'Generate LaTeX research paper content from outline and research data';
  public parameters: ToolParameter[] = [
    {
      name: 'outline',
      type: 'object',
      description: 'Research paper outline structure',
      required: true
    },
    {
      name: 'researchData',
      type: 'array',
      description: 'Analyzed research data for each section',
      required: true
    },
    {
      name: 'preferences',
      type: 'object',
      description: 'Writing style and formatting preferences',
      required: false
    }
  ];

  private genAI: GoogleGenerativeAI;
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  public async execute(input: WritingInput): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const { outline, researchData, preferences = {} } = input;
      
      this.logger.info('Starting LaTeX content generation');
      
      // Generate complete LaTeX document using AI
      const latexContent = await this.generateLatexDocument(outline, researchData, preferences);
      
      // Parse the generated LaTeX into sections
      const parsedSections = parseLatexIntoSections(latexContent);
      
      this.logger.info(`Generated ${parsedSections.length} LaTeX sections`);
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: latexContent,
        metadata: {
          duration,
          wordCount: this.countWords(latexContent),
          sectionCount: parsedSections.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('LaTeX content generation failed:', error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  /**
   * Generate complete LaTeX document using AI
   */
  private async generateLatexDocument(
    outline: ResearchOutline, 
    researchData: any[], 
    preferences: any
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = this.buildLatexPrompt(outline, researchData, preferences);
    
    try {
      const result = await model.generateContent(prompt);
      let latexContent = result.response.text();
      
      // Validate and enhance the LaTeX content
      latexContent = this.validateAndEnhanceLatex(latexContent, outline);
      
      return latexContent;
      
    } catch (error) {
      this.logger.warn('Failed to generate AI LaTeX content, using fallback');
      return this.generateFallbackLatex(outline, researchData, preferences);
    }
  }

  /**
   * Build comprehensive prompt for LaTeX generation
   */
  private buildLatexPrompt(outline: ResearchOutline, researchData: any[], preferences: any): string {
    const writingStyle = preferences.writingStyle || 'ACADEMIC';
    const detailLevel = preferences.detailLevel || 'MODERATE';
    const citationStyle = preferences.citationStyle || 'APA';
    
    // Prepare research summaries
    const researchSummaries = researchData.map(rd => ({
      section: rd.section,
      summary: rd.analysis?.summary || '',
      keyPoints: rd.analysis?.keyPoints || [],
      sources: rd.analysis?.sources || []
    }));

    return `You are a LaTeX academic writing expert. Generate ONLY the document content sections in pure LaTeX format.

DOCUMENT REQUIREMENTS:
- Title: "${outline.title}"
- Abstract: "${outline.abstract}"
- Keywords: ${outline.keywords.join(', ')}
- Writing Style: ${writingStyle}
- Detail Level: ${detailLevel}
- Citation Style: ${citationStyle}

SECTIONS TO INCLUDE:
${outline.sections.map(section => `
- ${section.title}
  Key Points: ${section.keyPoints?.join(', ') || 'General coverage'}
  Estimated Words: ${section.estimatedWords || 500}
`).join('')}

RESEARCH DATA AVAILABLE:
${researchSummaries.map(rd => `
Section: ${rd.section}
Summary: ${rd.summary}
Key Findings: ${rd.keyPoints.join(', ')}
Sources: ${rd.sources.map((s: any) => s.title).join(', ')}
`).join('')}

LATEX REQUIREMENTS:
1. Generate ONLY section content - NO document structure (\\documentclass, \\begin{document}, etc.)
2. Use \\section{Title} commands for main sections
3. DO NOT include \\cite{} commands for now (citations are temporarily disabled)
4. Use academic LaTeX formatting (\\textbf{}, \\emph{}, \\subsection{}, etc.)
5. Include \\label{sec:sectionname} for each section
6. Write complete, publication-ready content for each section
7. Subsections should be inside section content, not separate sections
8. Use ONLY Alpine Linux compatible commands

EXAMPLE OUTPUT FORMAT:
\\section{Introduction}
\\label{sec:introduction}

This paper presents comprehensive research on [topic]. The study addresses [research problem] through [methodology].

\\subsection{Background}
Relevant background information and context...

\\section{Literature Review}
\\label{sec:literature-review}

Extensive review of existing research...

Generate ONLY the section content (not the full document structure) with substantial, well-researched content for each section:`;
  }

  /**
   * Validate and enhance generated LaTeX content
   */
  private validateAndEnhanceLatex(latexContent: string, outline: ResearchOutline): string {
    let enhanced = latexContent.trim();
    
    // Clean up AI response (remove markdown code blocks if present)
    enhanced = enhanced.replace(/```latex\n?/g, '').replace(/```\n?/g, '');
    
    // Always wrap content in complete document template
    // This prevents duplicate \documentclass issues
    const template = generateBaseLatexTemplate({
      title: outline.title,
      author: 'Research Agent',
      citationStyle: 'APA',
      includeTableOfContents: true,
      includeBibliography: false // Temporarily disable bibliography
    });
    
    // If AI generated a complete document, extract only the body content
    const bodyMatch = enhanced.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (bodyMatch) {
      // Extract content between \begin{document} and \end{document}
      let bodyContent = bodyMatch[1].trim();
      
      // Remove title and toc if present (template will add these)
      bodyContent = bodyContent.replace(/\\maketitle\s*/g, '');
      bodyContent = bodyContent.replace(/\\tableofcontents\s*/g, '');
      bodyContent = bodyContent.replace(/\\newpage\s*/g, '');
      
      enhanced = template.replace('% SECTIONS_PLACEHOLDER', bodyContent);
    } else {
      // Content is just sections, wrap in template
      enhanced = template.replace('% SECTIONS_PLACEHOLDER', enhanced);
    }
    
    // Ensure sections have proper labels (only if missing)
    enhanced = enhanced.replace(/\\section\{([^}]+)\}(?!\s*\\label)/g, (match, title) => {
      const labelId = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      return `${match}\n\\label{sec:${labelId}}`;
    });
    
    return enhanced;
  }

  /**
   * Generate fallback LaTeX content when AI fails
   */
  private generateFallbackLatex(
    outline: ResearchOutline, 
    researchData: any[], 
    preferences: any
  ): string {
    this.logger.info('Generating fallback LaTeX content');
    
    const template = generateBaseLatexTemplate({
      title: outline.title,
      author: 'Research Agent',
      citationStyle: preferences.citationStyle || 'APA',
      includeTableOfContents: true,
      includeBibliography: false // Temporarily disable bibliography
    });

    // Generate basic sections
    const sections = outline.sections.map((section) => {
      const sectionData = researchData.find(rd => rd.section === section.title);
      
      let content = `\\section{${section.title}}
\\label{sec:${section.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}}

`;

      // Add section content based on key points
      if (section.keyPoints && section.keyPoints.length > 0) {
        section.keyPoints.forEach(point => {
          content += `${point} This represents an important aspect that requires comprehensive analysis and investigation to understand its full implications and applications in the research context.\n\n`;
        });
      }

      // Add research summary if available
      if (sectionData?.analysis?.summary) {
        content += `\\subsection{Research Findings}\n\n${sectionData.analysis.summary}\n\n`;
      }

      // Add subsections if defined
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach(subsection => {
          content += `\\subsection{${subsection}}\n\nThis subsection covers important aspects related to ${subsection.toLowerCase()}. Further research and analysis are needed to provide comprehensive coverage of this topic.\n\n`;
        });
      }

      return content;
    }).join('\n');

    return template.replace('% SECTIONS_PLACEHOLDER', sections);
  }

  // Removed unused extractDomain method

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}
