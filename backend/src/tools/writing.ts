import { Tool, ToolResult, ToolParameter, ResearchOutline } from '../shared'; // Path already correct, was 'shared' now '../shared' relative to src/tools
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LoggerService } from '../services/logger';

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
  public description = 'Generate research paper content from outline and research data';
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
      
      let fullContent = '';
      
      // Generate title and abstract
      fullContent += this.generateTitle(outline.title);
      fullContent += this.generateAbstract(outline.abstract, outline.keywords);
      
      // Generate each section
      for (const section of outline.sections) {
        const sectionData = researchData.find(rd => rd.section === section.title);
        const sectionContent = await this.generateSection(section, sectionData, preferences);
        fullContent += sectionContent;
      }
      
      // Add references section
      fullContent += this.generateReferences(researchData, preferences.citationStyle);
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: fullContent,
        metadata: {
          duration,
          wordCount: this.countWords(fullContent),
          sectionCount: outline.sections.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Content writing failed:', error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  private generateTitle(title: string): string {
    return `# ${title}\n\n`;
  }

  private generateAbstract(abstract: string, keywords: string[]): string {
    return `## Abstract\n\n${abstract}\n\n**Keywords:** ${keywords.join(', ')}\n\n---\n\n`;
  }

  private async generateSection(
    section: any, 
    sectionData: any, 
    preferences: any
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Prepare research data for this section
    const researchContent = sectionData ? {
      summary: sectionData.analysis?.summary || '',
      keyPoints: sectionData.analysis?.keyPoints || [],
      quotes: sectionData.analysis?.relevantQuotes || [],
      sources: sectionData.analysis?.sources || []
    } : null;

    const prompt = this.buildSectionPrompt(section, researchContent, preferences);
    
    try {
      const result = await model.generateContent(prompt);
      const content = result.response.text();
      
      return this.formatSectionContent(section.title, content, section.subsections);
      
    } catch (error) {
      this.logger.warn(`Failed to generate AI content for section ${section.title}, using fallback`);
      return this.generateFallbackSection(section, sectionData);
    }
  }

  private buildSectionPrompt(section: any, researchContent: any, preferences: any): string {
    const writingStyle = preferences.writingStyle || 'ACADEMIC';
    const detailLevel = preferences.detailLevel || 'MODERATE';
    
    return `
Write a comprehensive section for a research paper with the following specifications:

Section Title: "${section.title}"
Subsections: ${section.subsections?.join(', ') || 'None specified'}
Target Word Count: ${section.estimatedWords || 500} words
Writing Style: ${writingStyle}
Detail Level: ${detailLevel}

Key Points to Cover:
${section.keyPoints?.map((point: string) => `- ${point}`).join('\n') || 'No specific points provided'}

${researchContent ? `
Research Data Available:
Summary: ${researchContent.summary}

Key Findings:
${researchContent.keyPoints.map((point: string) => `- ${point}`).join('\n')}

Relevant Quotes:
${researchContent.quotes.map((quote: string) => `- ${quote}`).join('\n')}

Sources:
${researchContent.sources.map((source: any) => `- ${source.title} (${source.url})`).join('\n')}
` : 'No specific research data provided for this section.'}

Guidelines:
1. Write in ${writingStyle.toLowerCase()} style
2. Include proper transitions between subsections
3. Integrate research findings naturally
4. Use appropriate citations (indicate with [Source: Title])
5. Maintain academic rigor and clarity
6. Ensure content flows logically
7. Include specific examples and evidence where appropriate

Write the complete section content now:
    `;
  }

  private formatSectionContent(title: string, content: string, subsections?: string[]): string {
    let formatted = `## ${title}\n\n`;
    
    // Clean up the content
    content = content.trim();
    
    // If subsections are defined, try to organize content accordingly
    if (subsections && subsections.length > 0) {
      // Split content into paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      const paragraphsPerSubsection = Math.ceil(paragraphs.length / subsections.length);
      
      subsections.forEach((subsection, index) => {
        formatted += `### ${subsection}\n\n`;
        
        const startIdx = index * paragraphsPerSubsection;
        const endIdx = Math.min(startIdx + paragraphsPerSubsection, paragraphs.length);
        const subsectionParagraphs = paragraphs.slice(startIdx, endIdx);
        
        formatted += subsectionParagraphs.join('\n\n') + '\n\n';
      });
    } else {
      formatted += content + '\n\n';
    }
    
    return formatted;
  }

  private generateFallbackSection(section: any, sectionData: any): string {
    let content = `## ${section.title}\n\n`;
    
    // Use key points as basis for content
    if (section.keyPoints && section.keyPoints.length > 0) {
      section.keyPoints.forEach((point: string) => {
        content += `${point} This is an important aspect that requires further investigation and analysis to understand its full implications and applications.\n\n`;
      });
    }
    
    // Add research summary if available
    if (sectionData?.analysis?.summary) {
      content += `${sectionData.analysis.summary}\n\n`;
    }
    
    // Add subsections if defined
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach((subsection: string) => {
        content += `### ${subsection}\n\nThis subsection covers important aspects related to ${subsection.toLowerCase()}. Further research and analysis are needed to provide comprehensive coverage of this topic.\n\n`;
      });
    }
    
    return content;
  }

  private generateReferences(researchData: any[], citationStyle: string = 'APA'): string {
    let references = '## References\n\n';
    
    const allSources = researchData
      .flatMap(rd => rd.analysis?.sources || [])
      .filter((source, index, self) => 
        index === self.findIndex(s => s.url === source.url)
      );

    allSources.forEach((source, index) => {
      const citation = this.formatCitation(source, citationStyle, index + 1);
      references += `${citation}\n\n`;
    });
    
    return references;
  }

  private formatCitation(source: any, style: string, index: number): string {
    const domain = this.extractDomain(source.url);
    const currentYear = new Date().getFullYear();
    
    switch (style.toUpperCase()) {
      case 'APA':
        return `${index}. ${source.title}. (${currentYear}). Retrieved from ${source.url}`;
      case 'MLA':
        return `${index}. "${source.title}." *${domain}*, ${currentYear}, ${source.url}.`;
      case 'CHICAGO':
        return `${index}. "${source.title}." Accessed ${new Date().toLocaleDateString()}. ${source.url}.`;
      case 'IEEE':
        return `[${index}] "${source.title}," ${domain}, ${currentYear}. [Online]. Available: ${source.url}`;
      default:
        return `${index}. ${source.title} - ${source.url}`;
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Website';
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}
