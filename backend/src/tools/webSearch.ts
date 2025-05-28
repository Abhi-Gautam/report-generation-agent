import { Tool, ToolResult, ToolParameter, SearchResult } from '../shared'; // Path already correct
import axios from 'axios';
import { LoggerService } from '../services/logger';

export interface WebSearchInput {
  query: string;
  maxResults?: number;
  safeSearch?: boolean;
  region?: string;
  timeRange?: string;
}

export class WebSearchTool implements Tool {
  public name = 'WebSearch';
  public description = 'Search the web for relevant information using Brave Search API';
  public parameters: ToolParameter[] = [
    {
      name: 'query',
      type: 'string',
      description: 'Search query string',
      required: true
    },
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of results to return',
      required: false,
      default: 10
    },
    {
      name: 'safeSearch',
      type: 'boolean',
      description: 'Enable safe search filtering',
      required: false,
      default: true
    },
    {
      name: 'region',
      type: 'string',
      description: 'Geographic region for search results',
      required: false,
      default: 'US'
    }
  ];

  private logger: LoggerService;
  private apiKey: string;

  constructor() {
    this.logger = new LoggerService();
    this.apiKey = process.env.BRAVE_SEARCH_API_KEY || '';
    
    if (!this.apiKey) {
      this.logger.warn('BRAVE_SEARCH_API_KEY not configured');
    }
  }

  public async execute(input: WebSearchInput): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Brave Search API key not configured',
          metadata: { duration: Date.now() - startTime }
        };
      }

      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          q: input.query,
          count: input.maxResults || 10,
          safesearch: input.safeSearch ? 'strict' : 'off',
          country: input.region || 'US'
        },
        timeout: 10000
      });

      const results: SearchResult[] = response.data.web?.results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        source: this.extractDomain(result.url),
        relevanceScore: this.calculateRelevanceScore(result, input.query),
        publishedDate: result.age ? new Date(result.age) : undefined
      })) || [];

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: results,
        metadata: {
          duration,
          totalResults: response.data.web?.results?.length || 0
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Web search failed:', error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private calculateRelevanceScore(result: any, query: string): number {
    let score = 0.5; // Base score

    const queryTerms = query.toLowerCase().split(/\s+/);
    const title = result.title?.toLowerCase() || '';
    const description = result.description?.toLowerCase() || '';
    
    // Check for query terms in title (higher weight)
    queryTerms.forEach(term => {
      if (title.includes(term)) score += 0.2;
      if (description.includes(term)) score += 0.1;
    });

    // Boost score for academic or authoritative sources
    const domain = this.extractDomain(result.url).toLowerCase();
    if (domain.includes('edu') || domain.includes('gov') || domain.includes('org')) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }
}
