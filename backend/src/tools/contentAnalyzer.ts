import { Tool, ToolResult, ToolParameter } from '../shared'; // Path already correct
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { LoggerService } from '../services/logger';

export interface ContentAnalyzerInput {
  content: any[];
  section: string;
  analysisType?: 'SUMMARY' | 'KEY_POINTS' | 'QUOTES' | 'COMPREHENSIVE';
}

export interface AnalyzedContent {
  summary: string;
  keyPoints: string[];
  relevantQuotes: string[];
  sources: any[];
  qualityScore: number;
  insights: string[];
}

export class ContentAnalyzerTool implements Tool {
  public name = 'ContentAnalyzer';
  public description = 'Analyze and extract insights from web content for research';
  public parameters: ToolParameter[] = [
    {
      name: 'content',
      type: 'array',
      description: 'Array of search results or content to analyze',
      required: true
    },
    {
      name: 'section',
      type: 'string',
      description: 'Research section this content relates to',
      required: true
    },
    {
      name: 'analysisType',
      type: 'string',
      description: 'Type of analysis to perform',
      required: false,
      default: 'COMPREHENSIVE'
    }
  ];

  private genAI: GoogleGenerativeAI;
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  public async execute(input: ContentAnalyzerInput): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Extract full content from URLs
      const enrichedContent = await this.enrichContentWithFullText(input.content);
      
      // Analyze content using AI
      // const analysis = await this.analyzeContentWithAI(enrichedContent, input.section, input.analysisType);
      const analysis = await this.analyzeContentWithAI(enrichedContent, input.section /*, input.analysisType */); // analysisType currently unused
      
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: analysis,
        metadata: {
          duration,
          contentItems: enrichedContent.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Content analysis failed:', error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  private async enrichContentWithFullText(searchResults: any[]): Promise<any[]> {
    const enriched = [];
    
    for (const result of searchResults.slice(0, 5)) { // Limit to top 5 results
      try {
        const fullContent = await this.extractContentFromUrl(result.url);
        enriched.push({
          ...result,
          fullContent: fullContent.content,
          wordCount: fullContent.wordCount,
          extractedAt: new Date()
        });
      } catch (error) {
        // If we can't extract content, use the snippet
        enriched.push({
          ...result,
          fullContent: result.snippet || '',
          wordCount: (result.snippet || '').split(/\s+/).length,
          extractedAt: new Date()
        });
      }
    }

    return enriched;
  }

  private async extractContentFromUrl(url: string): Promise<{ content: string; wordCount: number }> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0)'
        },
        timeout: 10000,
        maxRedirects: 3
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, footer, aside, .advertisement, .ads').remove();
      
      // Extract main content
      let content = '';
      const contentSelectors = [
        'article',
        'main',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        'body'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }

      // Clean up the content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      // Limit content length
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '...';
      }

      return {
        content,
        wordCount: content.split(/\s+/).length
      };

    } catch (error) {
      throw new Error(`Failed to extract content from ${url}: ${error}`);
    }
  }

  private async analyzeContentWithAI(
    enrichedContent: any[],
    section: string
    // analysisType?: string // Parameter is unused in current implementation
  ): Promise<AnalyzedContent> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare content for analysis
    const contentText = enrichedContent
      .map(item => `Source: ${item.title}\nURL: ${item.url}\nContent: ${item.fullContent}`)
      .join('\n\n---\n\n');

    const prompt = `
Analyze the following content for a research paper section titled "${section}":

${contentText}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "summary": "A concise summary of the main points",
  "keyPoints": ["Key point 1", "Key point 2", "..."],
  "relevantQuotes": ["Quote 1 with source", "Quote 2 with source", "..."],
  "qualityScore": 0.8,
  "insights": ["Insight 1", "Insight 2", "..."]
}

Focus on:
1. Extracting the most relevant information for the "${section}" section
2. Identifying key arguments, findings, or data points
3. Finding quotable material with proper attribution
4. Assessing the overall quality and credibility of sources
5. Generating actionable insights for the research

Quality score should be 0.0-1.0 based on source credibility, relevance, and depth.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate and structure the analysis
      return {
        summary: analysis.summary || 'No summary generated',
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        relevantQuotes: Array.isArray(analysis.relevantQuotes) ? analysis.relevantQuotes : [],
        sources: enrichedContent.map(item => ({
          title: item.title,
          url: item.url,
          domain: this.extractDomain(item.url),
          relevanceScore: item.relevanceScore || 0.5,
          wordCount: item.wordCount
        })),
        qualityScore: typeof analysis.qualityScore === 'number' ? analysis.qualityScore : 0.5,
        insights: Array.isArray(analysis.insights) ? analysis.insights : []
      };

    } catch (parseError) {
      this.logger.warn('Failed to parse AI analysis, generating basic analysis');
      return this.generateBasicAnalysis(enrichedContent, section);
    }
  }

  private generateBasicAnalysis(enrichedContent: any[], section: string): AnalyzedContent {
    // Fallback analysis if AI parsing fails
    const allText = enrichedContent.map(item => item.fullContent).join(' ');
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    return {
      summary: `Analysis of ${enrichedContent.length} sources related to ${section}. ` +
               sentences.slice(0, 3).join('. ') + '.',
      keyPoints: sentences.slice(0, 5).map(s => s.trim()),
      relevantQuotes: sentences
        .filter(s => s.length > 50 && s.length < 200)
        .slice(0, 3)
        .map(s => `"${s.trim()}" - Source`),
      sources: enrichedContent.map(item => ({
        title: item.title,
        url: item.url,
        domain: this.extractDomain(item.url),
        relevanceScore: item.relevanceScore || 0.5,
        wordCount: item.wordCount
      })),
      qualityScore: 0.6,
      insights: [
        `Found ${enrichedContent.length} relevant sources`,
        `Average content length: ${Math.round(allText.length / enrichedContent.length)} characters`,
        `Content focuses on ${section} aspects`
      ]
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }
}
