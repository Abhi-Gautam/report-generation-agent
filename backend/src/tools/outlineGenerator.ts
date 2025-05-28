import { Tool, ToolResult, ToolParameter, ResearchOutline, OutlineSection } from '../shared'; // Path already correct
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LoggerService } from '../services/logger';

export interface OutlineGeneratorInput {
  topic: string;
  detailLevel?: 'BRIEF' | 'MODERATE' | 'COMPREHENSIVE';
  targetLength?: number;
  academicField?: string;
}

export class OutlineGeneratorTool implements Tool {
  public name = 'OutlineGenerator';
  public description = 'Generate a structured research paper outline using AI';
  public parameters: ToolParameter[] = [
    {
      name: 'topic',
      type: 'string',
      description: 'The research topic to create an outline for',
      required: true
    },
    {
      name: 'detailLevel',
      type: 'string',
      description: 'Level of detail for the outline',
      required: false,
      default: 'MODERATE'
    },
    {
      name: 'targetLength',
      type: 'number',
      description: 'Target word count for the final paper',
      required: false,
      default: 3000
    },
    {
      name: 'academicField',
      type: 'string',
      description: 'Academic field or discipline',
      required: false
    }
  ];

  private genAI: GoogleGenerativeAI;
  private logger: LoggerService;

  constructor() {
    this.logger = new LoggerService();
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  public async execute(input: OutlineGeneratorInput): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = this.buildPrompt(input);
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse the AI response into a structured outline
      const outline = await this.parseOutlineResponse(response, input);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: outline,
        metadata: {
          duration,
          tokens: this.estimateTokens(prompt + response)
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Outline generation failed:', error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  private buildPrompt(input: OutlineGeneratorInput): string {
    const { topic, detailLevel, targetLength, academicField } = input;

    return `
Create a comprehensive research paper outline for the topic: "${topic}"

Requirements:
- Detail Level: ${detailLevel || 'MODERATE'} 
- Target Length: ${targetLength || 3000} words
- Academic Field: ${academicField || 'General'}
- Include 6-8 main sections with subsections
- Provide key points for each section
- Estimate word count per section
- Generate relevant keywords
- Include an abstract summary
- Rate difficulty level (BEGINNER/INTERMEDIATE/ADVANCED)

Please format the response as a JSON object with the following structure:
{
  "title": "Research Paper Title",
  "abstract": "Brief abstract summary",
  "sections": [
    {
      "id": "section_1",
      "title": "Section Title",
      "subsections": ["Subsection 1", "Subsection 2"],
      "estimatedWords": 500,
      "keyPoints": ["Key point 1", "Key point 2"]
    }
  ],
  "keywords": ["keyword1", "keyword2"],
  "estimatedLength": 3000,
  "difficulty": "INTERMEDIATE"
}

Make the outline academically rigorous and well-structured.
    `;
  }

  private async parseOutlineResponse(response: string, input: OutlineGeneratorInput): Promise<ResearchOutline> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsedOutline = JSON.parse(jsonMatch[0]);

      // Validate and structure the outline
      const outline: ResearchOutline = {
        title: parsedOutline.title || `Research Paper: ${input.topic}`,
        abstract: parsedOutline.abstract || `A comprehensive research paper on ${input.topic}`,
        sections: parsedOutline.sections?.map((section: any, index: number) => ({
          id: section.id || `section_${index + 1}`,
          title: section.title || `Section ${index + 1}`,
          subsections: Array.isArray(section.subsections) ? section.subsections : [],
          estimatedWords: section.estimatedWords || Math.floor((input.targetLength || 3000) / 8),
          keyPoints: Array.isArray(section.keyPoints) ? section.keyPoints : [],
          sources: []
        })) || this.generateDefaultSections(input),
        keywords: Array.isArray(parsedOutline.keywords) ? parsedOutline.keywords : this.generateDefaultKeywords(input.topic),
        estimatedLength: parsedOutline.estimatedLength || input.targetLength || 3000,
        difficulty: parsedOutline.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' || 'INTERMEDIATE'
      };

      return outline;

    } catch (parseError) {
      this.logger.warn('Failed to parse AI outline response, generating default structure');
      return this.generateDefaultOutline(input);
    }
  }

  private generateDefaultOutline(input: OutlineGeneratorInput): ResearchOutline {
    const sections = this.generateDefaultSections(input);
    
    return {
      title: `Research Paper: ${input.topic}`,
      abstract: `A comprehensive research paper examining ${input.topic}, analyzing key aspects, methodologies, and implications.`,
      sections,
      keywords: this.generateDefaultKeywords(input.topic),
      estimatedLength: input.targetLength || 3000,
      difficulty: 'INTERMEDIATE'
    };
  }

  private generateDefaultSections(input: OutlineGeneratorInput): OutlineSection[] {
    const wordsPerSection = Math.floor((input.targetLength || 3000) / 7);
    
    return [
      {
        id: 'introduction',
        title: 'Introduction',
        subsections: ['Background', 'Problem Statement', 'Research Questions', 'Objectives'],
        estimatedWords: wordsPerSection,
        keyPoints: ['Context setting', 'Problem identification', 'Research scope'],
        sources: []
      },
      {
        id: 'literature_review',
        title: 'Literature Review',
        subsections: ['Historical Context', 'Current Research', 'Research Gaps'],
        estimatedWords: wordsPerSection,
        keyPoints: ['Previous studies', 'Theoretical framework', 'Knowledge gaps'],
        sources: []
      },
      {
        id: 'methodology',
        title: 'Methodology',
        subsections: ['Research Design', 'Data Collection', 'Analysis Methods'],
        estimatedWords: wordsPerSection,
        keyPoints: ['Research approach', 'Data sources', 'Analytical framework'],
        sources: []
      },
      {
        id: 'analysis',
        title: 'Analysis and Results',
        subsections: ['Findings', 'Data Analysis', 'Key Insights'],
        estimatedWords: wordsPerSection * 2,
        keyPoints: ['Main findings', 'Data interpretation', 'Significant patterns'],
        sources: []
      },
      {
        id: 'discussion',
        title: 'Discussion',
        subsections: ['Interpretation', 'Implications', 'Limitations'],
        estimatedWords: wordsPerSection,
        keyPoints: ['Result interpretation', 'Practical implications', 'Study limitations'],
        sources: []
      },
      {
        id: 'conclusion',
        title: 'Conclusion',
        subsections: ['Summary', 'Recommendations', 'Future Research'],
        estimatedWords: Math.floor(wordsPerSection * 0.8),
        keyPoints: ['Key takeaways', 'Recommendations', 'Future directions'],
        sources: []
      }
    ];
  }

  private generateDefaultKeywords(topic: string): string[] {
    const words = topic.toLowerCase().split(/\s+/);
    const keywords = [...words];
    
    // Add some generic academic keywords
    keywords.push('research', 'analysis', 'study', 'methodology', 'findings');
    
    return keywords.slice(0, 10);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
