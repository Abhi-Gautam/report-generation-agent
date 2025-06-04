import { ChromaClient, Collection } from 'chromadb';
import { logger } from './logger';

interface ContentItem {
  id: string;
  content: string;
  metadata: {
    projectId?: string;
    sectionId?: string;
    type: 'section' | 'table' | 'chart' | 'reference' | 'figure';
    title?: string;
    tags?: string;
    wordCount?: number;
    createdAt: string;
    quality_score?: number;
  };
}

interface SimilarContent {
  id: string;
  content: string;
  metadata: any;
  distance: number;
  similarity: number;
}

interface ContentSuggestion {
  type: 'similar_section' | 'relevant_table' | 'related_chart' | 'citation_opportunity';
  content: SimilarContent;
  relevance: number;
  reason: string;
}

export class ChromaService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName = 'research_content';

  constructor() {
    // Initialize ChromaDB client
    this.client = new ChromaClient({
      path: process.env.CHROMA_DB_URL || 'http://localhost:8000'
    });
  }

  async initialize(): Promise<void> {
    try {
      // Create or get collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 
          description: 'Research content storage with embeddings',
          hnsw_space: 'cosine' 
        }
      });
      
      logger.info('ChromaDB service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ChromaDB service:', error);
      throw error;
    }
  }

  async storeContent(item: ContentItem): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      // Convert tags array to string for ChromaDB compatibility
      const metadata = {
        ...item.metadata,
        tags: item.metadata.tags || ''
      };

      await this.collection!.add({
        ids: [item.id],
        documents: [item.content],
        metadatas: [metadata]
      });

      logger.info(`Stored content item ${item.id} in ChromaDB`);
    } catch (error) {
      logger.error(`Failed to store content item ${item.id}:`, error);
      throw error;
    }
  }

  async storeMultipleContent(items: ContentItem[]): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    if (items.length === 0) return;

    try {
      // Convert tags arrays to strings for ChromaDB compatibility
      const metadatas = items.map(item => ({
        ...item.metadata,
        tags: item.metadata.tags || ''
      }));

      await this.collection!.add({
        ids: items.map(item => item.id),
        documents: items.map(item => item.content),
        metadatas: metadatas
      });

      logger.info(`Stored ${items.length} content items in ChromaDB`);
    } catch (error) {
      logger.error(`Failed to store multiple content items:`, error);
      throw error;
    }
  }

  async searchSimilarContent(
    query: string, 
    options: {
      limit?: number;
      projectId?: string;
      contentType?: string[];
      minSimilarity?: number;
      excludeIds?: string[];
    } = {}
  ): Promise<SimilarContent[]> {
    if (!this.collection) {
      await this.initialize();
    }

    const {
      limit = 10,
      projectId,
      contentType,
      minSimilarity = 0.7,
      excludeIds = []
    } = options;

    try {
      // Build where clause for filtering
      let whereClause: any = {};
      
      if (projectId) {
        whereClause.projectId = projectId;
      }
      
      if (contentType && contentType.length > 0) {
        whereClause.type = { $in: contentType };
      }

      const results = await this.collection!.query({
        queryTexts: [query],
        nResults: limit + excludeIds.length, // Get extra to account for exclusions
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined
      });

      if (!results.documents || !results.documents[0]) {
        return [];
      }

      const similarContent: SimilarContent[] = [];
      
      for (let i = 0; i < results.documents[0].length; i++) {
        const id = results.ids![0][i];
        const content = results.documents[0][i];
        const metadata = results.metadatas![0][i];
        const distance = results.distances![0][i];
        
        // Skip excluded IDs
        if (excludeIds.includes(id)) continue;
        
        // Calculate similarity score (1 - distance for cosine similarity)
        const similarity = 1 - distance;
        
        // Filter by minimum similarity
        if (similarity >= minSimilarity) {
          similarContent.push({
            id,
            content: content || '',
            metadata: metadata || {},
            distance,
            similarity
          });
        }

        // Stop if we have enough results
        if (similarContent.length >= limit) break;
      }

      return similarContent;
    } catch (error) {
      logger.error('Failed to search similar content:', error);
      return [];
    }
  }

  async getContentSuggestions(
    currentContent: string,
    projectId: string
  ): Promise<ContentSuggestion[]> {
    const suggestions: ContentSuggestion[] = [];

    try {
      // Search for similar sections
      const similarSections = await this.searchSimilarContent(currentContent, {
        limit: 5,
        contentType: ['section'],
        minSimilarity: 0.6,
        projectId: projectId // Look within same project first
      });

      similarSections.forEach(item => {
        suggestions.push({
          type: 'similar_section',
          content: item,
          relevance: item.similarity,
          reason: `Similar content found with ${Math.round(item.similarity * 100)}% similarity`
        });
      });

      // Search for relevant tables
      const relevantTables = await this.searchSimilarContent(currentContent, {
        limit: 3,
        contentType: ['table'],
        minSimilarity: 0.5
      });

      relevantTables.forEach(item => {
        suggestions.push({
          type: 'relevant_table',
          content: item,
          relevance: item.similarity,
          reason: `Table that might support your content`
        });
      });

      // Search for related charts
      const relatedCharts = await this.searchSimilarContent(currentContent, {
        limit: 3,
        contentType: ['chart'],
        minSimilarity: 0.5
      });

      relatedCharts.forEach(item => {
        suggestions.push({
          type: 'related_chart',
          content: item,
          relevance: item.similarity,
          reason: `Chart that might visualize your data`
        });
      });

      // Search for citation opportunities
      const citations = await this.searchSimilarContent(currentContent, {
        limit: 5,
        contentType: ['reference'],
        minSimilarity: 0.6
      });

      citations.forEach(item => {
        suggestions.push({
          type: 'citation_opportunity',
          content: item,
          relevance: item.similarity,
          reason: `Reference that supports your arguments`
        });
      });

      // Sort by relevance
      suggestions.sort((a, b) => b.relevance - a.relevance);

      return suggestions.slice(0, 10); // Return top 10 suggestions
    } catch (error) {
      logger.error('Failed to get content suggestions:', error);
      return [];
    }
  }

  async categorizeContent(content: string): Promise<{
    type: string;
    confidence: number;
    tags: string[];
  }> {
    // Simple content categorization based on keywords and patterns
    
    // Define patterns for different content types
    const patterns = {
      methodology: /\b(method|approach|procedure|technique|analysis|survey|experiment|study design)\b/g,
      results: /\b(result|finding|data|statistic|significant|correlation|trend|outcome)\b/g,
      literature_review: /\b(according to|previous research|literature|study|author|paper|journal)\b/g,
      introduction: /\b(background|context|problem|research question|objective|purpose)\b/g,
      discussion: /\b(implication|interpretation|limitation|future research|conclusion)\b/g,
      table: /\b(table|column|row|data|percentage|value)\b/g,
      chart: /\b(figure|chart|graph|plot|visualization|trend)\b/g
    };

    let bestMatch = { type: 'general', confidence: 0 };
    const tags: Set<string> = new Set();

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern);
      if (matches) {
        const confidence = matches.length / content.split(' ').length;
        if (confidence > bestMatch.confidence) {
          bestMatch = { type, confidence };
        }
        // Add tags based on matches
        matches.forEach(match => tags.add(match.toLowerCase()));
      }
    }

    // Add additional tags based on content analysis
    const technicalTerms = content.match(/\b[A-Z]{2,}\b/g) || [];
    technicalTerms.forEach(term => tags.add(term.toLowerCase()));

    // Add domain-specific tags
    const domains = {
      machine_learning: /\b(neural network|algorithm|model|training|classification|regression)\b/gi,
      statistics: /\b(hypothesis|p-value|correlation|regression|variance|standard deviation)\b/gi,
      biology: /\b(gene|protein|cell|organism|species|evolution)\b/gi,
      chemistry: /\b(molecule|compound|reaction|element|bond|synthesis)\b/gi,
      physics: /\b(energy|force|mass|velocity|acceleration|quantum)\b/gi,
      economics: /\b(market|price|demand|supply|gdp|inflation|investment)\b/gi
    };

    for (const [domain, pattern] of Object.entries(domains)) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        tags.add(domain);
      }
    }

    return {
      type: bestMatch.type,
      confidence: Math.min(bestMatch.confidence * 10, 1), // Normalize to 0-1
      tags: Array.from(tags).slice(0, 10) // Limit to 10 tags
    };
  }

  async updateContent(id: string, updates: Partial<ContentItem>): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      // ChromaDB doesn't have direct update, so we need to delete and re-add
      await this.collection!.delete({ ids: [id] });
      
      if (updates.content || updates.metadata) {
        const item: ContentItem = {
          id,
          content: updates.content || '',
          metadata: updates.metadata || {
            type: 'section',
            createdAt: new Date().toISOString()
          }
        };
        
        await this.storeContent(item);
      }
      
      logger.info(`Updated content item ${id} in ChromaDB`);
    } catch (error) {
      logger.error(`Failed to update content item ${id}:`, error);
      throw error;
    }
  }

  async deleteContent(id: string): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      await this.collection!.delete({ ids: [id] });
      logger.info(`Deleted content item ${id} from ChromaDB`);
    } catch (error) {
      logger.error(`Failed to delete content item ${id}:`, error);
      throw error;
    }
  }

  async deleteProjectContent(projectId: string): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      await this.collection!.delete({ 
        where: { projectId: projectId }
      });
      logger.info(`Deleted all content for project ${projectId} from ChromaDB`);
    } catch (error) {
      logger.error(`Failed to delete project content ${projectId}:`, error);
      throw error;
    }
  }

  async getContentById(id: string): Promise<ContentItem | null> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const results = await this.collection!.get({
        ids: [id]
      });

      if (results.documents && results.documents.length > 0) {
        return {
          id,
          content: results.documents[0] || '',
          metadata: results.metadatas?.[0] as any || {}
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get content item ${id}:`, error);
      return null;
    }
  }

  async listProjectContent(projectId: string): Promise<ContentItem[]> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const results = await this.collection!.get({
        where: { projectId: projectId }
      });

      if (!results.ids || !results.documents) {
        return [];
      }

      const items: ContentItem[] = [];
      for (let i = 0; i < results.ids.length; i++) {
        items.push({
          id: results.ids[i],
          content: results.documents[i] || '',
          metadata: results.metadatas?.[i] as any || {}
        });
      }

      return items;
    } catch (error) {
      logger.error(`Failed to list content for project ${projectId}:`, error);
      return [];
    }
  }

  async getContentStats(): Promise<{
    totalItems: number;
    byType: Record<string, number>;
    byProject: Record<string, number>;
  }> {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const results = await this.collection!.get();
      
      const stats = {
        totalItems: results.ids?.length || 0,
        byType: {} as Record<string, number>,
        byProject: {} as Record<string, number>
      };

      if (results.metadatas) {
        results.metadatas.forEach(metadata => {
          const meta = metadata as any;
          
          // Count by type
          const type = meta.type || 'unknown';
          stats.byType[type] = (stats.byType[type] || 0) + 1;
          
          // Count by project
          const projectId = meta.projectId || 'unknown';
          stats.byProject[projectId] = (stats.byProject[projectId] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get content stats:', error);
      return {
        totalItems: 0,
        byType: {},
        byProject: {}
      };
    }
  }
}

export const chromaService = new ChromaService();
