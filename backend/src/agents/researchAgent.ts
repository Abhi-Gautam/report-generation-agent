import { BaseAgent, AgentConfig, AgentMemoryManager } from './base';
import { AgentType, ResearchOutline, ResearchContext } from '../shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WebSearchTool } from '../tools/webSearch';
import { OutlineGeneratorTool } from '../tools/outlineGenerator';
import { ContentAnalyzerTool } from '../tools/contentAnalyzer';
import { WritingTool } from '../tools/writing';
import { PDFGeneratorTool } from '../tools/pdfGenerator';

export interface ResearchAgentInput {
  topic: string;
  preferences?: {
    detailLevel?: 'BRIEF' | 'MODERATE' | 'COMPREHENSIVE';
    citationStyle?: 'APA' | 'MLA' | 'CHICAGO' | 'IEEE';
    maxSources?: number;
    includeImages?: boolean;
  };
}

export interface ResearchAgentOutput {
  outline: ResearchOutline;
  content: string;
  sources: any[];
  citations: any[];
  pdfPath: string | undefined;
  metadata: {
    wordCount: number;
    sourceCount: number;
    processingTime: number;
    quality: number;
  };
}

export class ResearchAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private memory: AgentMemoryManager;

  constructor(websocket?: any) {
    const config: AgentConfig = {
      name: 'Research Agent',
      type: AgentType.RESEARCH,
      description: 'Main orchestrator for research paper generation',
      tools: [
        new WebSearchTool(),
        new OutlineGeneratorTool(),
        new ContentAnalyzerTool(),
        new WritingTool(),
        new PDFGeneratorTool()
      ],
      maxIterations: 20,
      timeout: 600000 // 10 minutes
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

  public async execute(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
    const startTime = Date.now();
    this.logger.info(`Starting research for topic: ${input.topic}`);

    try {
      // Step 1: Initialize context and memory
      await this.initializeResearchContext(input);
      this.updateProgress(5, 'Initializing research context');

      // Step 2: Generate research outline
      const outline = await this.generateOutline(input.topic);
      this.updateProgress(20, 'Generated research outline');

      // Step 3: Conduct research for each section
      const researchData = await this.conductResearch(outline);
      this.updateProgress(65, 'Completed research phase');

      // Step 4: Generate content
      const content = await this.generateContent(outline, researchData);
      this.updateProgress(85, 'Generated paper content');

      // Step 5: Skip PDF generation (handled by dedicated agents later)
      this.updateProgress(85, 'Content generation completed');

      // Step 6: Finalize and return results (no PDF from ResearchAgent)
      const result = await this.finalizeResults(outline, content, researchData, undefined);
      this.updateProgress(85, 'Research completed successfully');

      const processingTime = Date.now() - startTime;
      await this.logAction(
        'Complete Research',
        input,
        result,
        true,
        processingTime
      );

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logAction(
        'Complete Research',
        input,
        null,
        false,
        processingTime,
        errorMessage
      );

      if (this.websocket && this.sessionId) {
        this.websocket.sendError(this.sessionId, {
          message: errorMessage,
          step: 'Research Agent Execution'
        });
      }

      throw error;
    }
  }

  private async initializeResearchContext(input: ResearchAgentInput): Promise<void> {
    const context: ResearchContext = {
      topic: input.topic,
      relatedTopics: [],
      keyEntities: [],
      researchQuestions: [],
      timeframe: undefined,
      geographicScope: undefined
    };

    // Use AI to extract key entities and generate research questions
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Analyze the research topic: "${input.topic}"
      
      Please provide:
      1. 5 related subtopics
      2. Key entities or concepts
      3. 5 important research questions
      4. Suggested timeframe (if applicable)
      5. Geographic scope (if applicable)
      
      Format as JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      const analysis = JSON.parse(response);
      context.relatedTopics = analysis.relatedTopics || [];
      context.keyEntities = analysis.keyEntities || [];
      context.researchQuestions = analysis.researchQuestions || [];
      context.timeframe = analysis.timeframe;
      context.geographicScope = analysis.geographicScope;
    } catch (parseError) {
      this.logger.warn('Failed to parse AI analysis, using defaults');
    }

    this.memory.setContext('researchContext', context);
    this.memory.setShortTerm('preferences', input.preferences || {});
  }

  private async generateOutline(topic: string): Promise<ResearchOutline> {
    const preferences = this.memory.getShortTerm('preferences') || {};
    const result = await this.executeTool('OutlineGenerator', { 
      topic,
      detailLevel: preferences.detailLevel || 'BRIEF',
      targetLength: preferences.targetLength || 2000
    });

    if (!result.success) {
      throw new Error(`Failed to generate outline: ${result.error}`);
    }

    const outline = result.data as ResearchOutline;
    this.memory.setLongTerm('outline', outline, 1.0);
    return outline;
  }

  private async conductResearch(outline: ResearchOutline): Promise<any[]> {
    const allResearchData: any[] = [];
    // Reduce research in development mode
    const sectionsToResearch = process.env.NODE_ENV === 'development' 
      ? Math.min(3, outline.sections.length) 
      : outline.sections.length;

    const baseProgress = 20; // Starting progress after outline
    const researchProgressRange = 45; // Progress range for research (20% to 65%)

    for (let i = 0; i < sectionsToResearch; i++) {
      const section = outline.sections[i];
      const sectionProgress = baseProgress + (researchProgressRange * ((i + 1) / sectionsToResearch));
      
      this.updateProgress(
        Math.round(sectionProgress),
        `Researching: ${section.title}`
      );

      // Search for information about this section
      const searchResult = await this.executeTool('WebSearch', {
        query: `${outline.title} ${section.title}`,
        maxResults: process.env.NODE_ENV === 'development' ? 2 : 5
      });

      if (searchResult.success && searchResult.data) {
        // Analyze the content
        const analysisResult = await this.executeTool('ContentAnalyzer', {
          content: searchResult.data,
          section: section.title
        });

        if (analysisResult.success) {
          allResearchData.push({
            section: section.title,
            searchResults: searchResult.data,
            analysis: analysisResult.data
          });
        }
      }
    }

    this.memory.setLongTerm('researchData', allResearchData, 1.0);
    return allResearchData;
  }

  private async generateContent(outline: ResearchOutline, researchData: any[]): Promise<string> {
    // const writingTool = this.config.tools.find(t => t.name === 'Writing') as WritingTool; // Unused
    
    const result = await this.executeTool('Writing', {
      outline,
      researchData,
      preferences: this.memory.getShortTerm('preferences')
    });

    if (!result.success) {
      throw new Error(`Failed to generate content: ${result.error}`);
    }

    return result.data as string;
  }


  private async finalizeResults(
    outline: ResearchOutline,
    content: string,
    researchData: any[],
    pdfPath?: string
  ): Promise<ResearchAgentOutput> {
    // Count words
    const wordCount = content.split(/\s+/).length;
    
    // Extract sources and citations
    const sources = researchData.flatMap(rd => rd.searchResults || []);
    const citations = sources.map(source => ({
      id: source.id || Math.random().toString(36),
      title: source.title,
      url: source.url,
      type: 'WEBSITE'
    }));

    // Calculate quality score based on various factors
    const quality = this.calculateQualityScore(outline, content, sources);

    return {
      outline,
      content,
      sources,
      citations,
      pdfPath,
      metadata: {
        wordCount,
        sourceCount: sources.length,
        processingTime: 0, // Will be set by caller
        quality
      }
    };
  }

  private calculateQualityScore(outline: ResearchOutline, content: string, sources: any[]): number {
    let score = 0.5; // Base score

    // Factor in outline completeness
    if (outline.sections.length >= 5) score += 0.1;
    if (outline.keywords.length >= 5) score += 0.1;

    // Factor in content length and structure
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 2000) score += 0.1;
    if (wordCount >= 5000) score += 0.1;

    // Factor in source diversity and quality
    if (sources.length >= 10) score += 0.1;
    if (sources.length >= 20) score += 0.1;

    return Math.min(1.0, score);
  }

  private updateProgress(progress: number, message: string): void {
    // this.currentProgress = progress; // Unused
    
    if (this.websocket && this.sessionId) {
      this.websocket.sendProgressUpdate(this.sessionId, {
        sessionId: this.sessionId,
        progress,
        currentStep: message,
        message,
        eta: this.estimateTimeRemaining(progress)
      });
    }
  }

  private estimateTimeRemaining(progress: number): number {
    if (progress <= 0) return 600; // 10 minutes max estimate
    
    const elapsed = Date.now() - (this.memory.getShortTerm('startTime') || Date.now());
    const estimatedTotal = (elapsed / progress) * 100;
    return Math.max(0, estimatedTotal - elapsed);
  }

  // Get current memory state for persistence
  public exportMemory(): any {
    return this.memory.exportMemory();
  }

  // Restore memory from persistence
  public importMemory(data: any): void {
    this.memory.importMemory(data);
  }
}
