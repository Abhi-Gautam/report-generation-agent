import { Tool } from '../types/agent';
import { 
  getReportTypeConfig, 
  VALID_REPORT_TYPE_IDS,
  ReportTypeConfig,
  SectionConfig,
  ReportMetadata 
} from '../config/reportTypes';

interface StructureOptions {
  reportType: string;
  academicLevel?: string;
  fieldOfStudy?: string;
  wordLimit?: number;
  customSections?: string[];
}

interface StructureResult {
  structure: {
    id: string;
    name: string;
    description: string;
    sections: SectionConfig[];
    metadata: ReportMetadata;
  };
  sections: Array<{
    title: string;
    content: string;
    type: string;
    order: number;
    metadata: {
      description: string;
      wordCountRange?: [number, number];
      required: boolean;
      guidelines?: string;
    };
  }>;
  latexTemplate: string;
  guidelines: string[];
}

export class ReportStructurerTool implements Tool {
  name = 'report_structurer';
  description = 'Generate academic report structures using configurable templates';

  async execute(input: {
    options: StructureOptions;
  }): Promise<StructureResult> {
    const { options } = input;
    
    // Validate report type
    if (!VALID_REPORT_TYPE_IDS.includes(options.reportType)) {
      throw new Error(`Invalid report type: ${options.reportType}. Valid types: ${VALID_REPORT_TYPE_IDS.join(', ')}`);
    }
    
    // Get report type configuration
    const config = getReportTypeConfig(options.reportType);
    if (!config) {
      throw new Error(`Report type configuration not found: ${options.reportType}`);
    }
    
    if (!config.enabled) {
      throw new Error(`Report type is disabled: ${options.reportType}`);
    }
    
    // Customize configuration based on options
    const customizedConfig = this.customizeTemplate(config, options);
    
    // Generate sections for database creation
    const sections = this.generateSections(customizedConfig);
    
    // Generate LaTeX template
    const latexTemplate = this.generateLatexTemplate(customizedConfig);
    
    // Generate writing guidelines
    const guidelines = this.generateGuidelines(customizedConfig, options);
    
    return {
      structure: {
        id: customizedConfig.id,
        name: customizedConfig.label,
        description: customizedConfig.description,
        sections: customizedConfig.template.sections,
        metadata: customizedConfig.template.metadata
      },
      sections,
      latexTemplate,
      guidelines
    };
  }

  private customizeTemplate(config: ReportTypeConfig, options: StructureOptions): ReportTypeConfig {
    // Deep clone the configuration to avoid mutations
    const customized = JSON.parse(JSON.stringify(config));
    
    // Adjust word counts based on word limit
    if (options.wordLimit) {
      customized.template = this.adjustWordCounts(customized.template, options.wordLimit);
    }
    
    // Add custom sections if provided
    if (options.customSections?.length) {
      const maxOrder = Math.max(...customized.template.sections.map((s: SectionConfig) => s.order));
      const referencesIndex = customized.template.sections.findIndex((s: SectionConfig) => s.id === 'references');
      
      options.customSections.forEach((title, index) => {
        const customSection: SectionConfig = {
          id: `custom_${index + 1}`,
          title,
          type: 'TEXT',
          description: `Custom section: ${title}`,
          wordCountRange: [500, 1000],
          required: false,
          order: maxOrder + index + 1,
          guidelines: `Provide relevant content for the ${title} section based on your research topic.`
        };
        
        // Insert before references if it exists, otherwise append
        if (referencesIndex !== -1) {
          customized.template.sections.splice(referencesIndex + index, 0, customSection);
        } else {
          customized.template.sections.push(customSection);
        }
      });
      
      // Reorder sections after adding custom ones
      customized.template.sections.forEach((section: SectionConfig, index: number) => {
        section.order = index + 1;
      });
    }
    
    // Adjust complexity based on academic level
    if (options.academicLevel) {
      customized.template = this.adjustForAcademicLevel(customized.template, options.academicLevel);
    }
    
    return customized;
  }

  private adjustWordCounts(template: any, totalLimit: number): any {
    const currentTotal = template.metadata.wordCountRange[1];
    const ratio = totalLimit / currentTotal;
    
    // Adjust section word counts
    template.sections.forEach((section: any) => {
      if (section.wordCountRange) {
        section.wordCountRange = [
          Math.round(section.wordCountRange[0] * ratio),
          Math.round(section.wordCountRange[1] * ratio)
        ];
      }
    });
    
    // Adjust total word count
    template.metadata.wordCountRange = [
      Math.round(template.metadata.wordCountRange[0] * ratio),
      totalLimit
    ];
    
    return template;
  }

  private adjustForAcademicLevel(template: any, level: string): any {
    const adjustmentFactors: Record<string, number> = {
      'high_school': 0.7,
      'undergraduate': 0.8,
      'graduate': 1.0,
      'doctoral': 1.3,
      'professional': 1.1
    };
    
    const factor = adjustmentFactors[level] || 1.0;
    
    // Adjust word counts based on academic level
    template.sections.forEach((section: any) => {
      if (section.wordCountRange) {
        section.wordCountRange = [
          Math.round(section.wordCountRange[0] * factor),
          Math.round(section.wordCountRange[1] * factor)
        ];
      }
    });
    
    // Adjust total word count
    template.metadata.wordCountRange = [
      Math.round(template.metadata.wordCountRange[0] * factor),
      Math.round(template.metadata.wordCountRange[1] * factor)
    ];
    
    return template;
  }

  private generateSections(config: ReportTypeConfig): Array<{
    title: string;
    content: string;
    type: string;
    order: number;
    metadata: any;
  }> {
    return config.template.sections.map(section => ({
      title: section.title,
      content: this.generateSectionContent(section),
      type: section.type,
      order: section.order,
      metadata: {
        description: section.description,
        wordCountRange: section.wordCountRange,
        required: section.required,
        guidelines: section.guidelines,
        subsections: section.subsections
      }
    }));
  }

  private generateSectionContent(section: SectionConfig): string {
    const wordCountInfo = section.wordCountRange ? 
      `${section.wordCountRange[0]}-${section.wordCountRange[1]} words` : 
      'Variable length';
    
    let content = `% ${section.description}\n`;
    content += `% Word count: ${wordCountInfo}\n`;
    content += `% Required: ${section.required ? 'Yes' : 'No'}\n\n`;
    
    if (section.guidelines) {
      content += `% Guidelines: ${section.guidelines}\n\n`;
    }
    
    if (section.subsections?.length) {
      content += `% Recommended subsections:\n`;
      section.subsections.forEach(subsection => {
        content += `% - ${subsection}\n`;
      });
      content += '\n';
    }
    
    content += `[Your ${section.title.toLowerCase()} content here]`;
    
    return content;
  }

  private generateLatexTemplate(config: ReportTypeConfig): string {
    const { latexTemplate } = config.template;
    
    let latex = `\\documentclass{${latexTemplate.documentClass}}\n\n`;
    
    // Add packages
    latexTemplate.packages.forEach(pkg => {
      latex += `\\usepackage{${pkg}}\n`;
    });
    
    // Add preamble
    latex += latexTemplate.preamble;
    
    // Add title page template
    latex += latexTemplate.titlePageTemplate;
    
    // Add document beginning
    latex += '\n\\begin{document}\n\n';
    latex += '\\maketitle\n\n';
    
    // Add table of contents for longer documents
    if (config.template.metadata.wordCountRange[1] > 5000) {
      latex += '\\tableofcontents\n\\newpage\n\n';
    }
    
    // Generate sections
    config.template.sections.forEach(section => {
      if (section.id !== 'references') {
        latex += latexTemplate.sectionTemplate
          .replace('{{SECTION_TITLE}}', section.title)
          .replace('{{SECTION_CONTENT}}', `% ${section.description}\n[Content for ${section.title}]`);
        latex += '\n\n';
      }
    });
    
    // Add bibliography
    if (config.template.sections.some(s => s.id === 'references')) {
      latex += latexTemplate.bibliographyTemplate;
    }
    
    latex += '\n\\end{document}';
    
    return latex;
  }

  private generateGuidelines(config: ReportTypeConfig, options: StructureOptions): string[] {
    const guidelines: string[] = [];
    const { metadata } = config.template;
    
    // Basic document guidelines
    guidelines.push(
      `This ${config.label.toLowerCase()} should be approximately ${metadata.wordCountRange[0]}-${metadata.wordCountRange[1]} words long.`,
      `Follow ${metadata.defaultCitationStyle} citation style throughout the document.`,
      `Difficulty level: ${metadata.difficulty}`,
      `Estimated time: ${metadata.estimatedTimeHours[0]}-${metadata.estimatedTimeHours[1]} hours`
    );
    
    if (options.academicLevel) {
      guidelines.push(`Academic level: ${options.academicLevel}`);
    }
    
    // Section-specific guidelines
    guidelines.push('\nSection Requirements:');
    config.template.sections
      .filter(section => section.required)
      .forEach(section => {
        const wordCount = section.wordCountRange ? 
          ` (${section.wordCountRange[0]}-${section.wordCountRange[1]} words)` : 
          '';
        guidelines.push(`• ${section.title}: ${section.description}${wordCount}`);
      });
    
    // Field-specific guidelines
    if (options.fieldOfStudy) {
      guidelines.push(`\nField of Study: Ensure content aligns with ${options.fieldOfStudy} conventions and standards.`);
    }
    
    // General writing guidelines
    guidelines.push(
      '\nGeneral Guidelines:',
      '• Use clear, concise, and academic language',
      '• Maintain consistent formatting and structure',
      '• Include proper citations for all sources',
      '• Use figures, tables, and charts to support arguments',
      '• Proofread carefully for grammar and spelling',
      '• Follow institutional guidelines if applicable'
    );
    
    // Category-specific guidelines
    switch (config.category) {
      case 'academic':
        guidelines.push(
          '• Maintain objective, scholarly tone',
          '• Support arguments with peer-reviewed sources',
          '• Present balanced analysis of different perspectives'
        );
        break;
      case 'professional':
        guidelines.push(
          '• Focus on practical applications and recommendations',
          '• Use professional language appropriate for business context',
          '• Include actionable insights and next steps'
        );
        break;
      case 'scientific':
        guidelines.push(
          '• Follow scientific method and reporting standards',
          '• Include detailed methodology and data analysis',
          '• Report results objectively with statistical significance'
        );
        break;
    }
    
    return guidelines;
  }

  // Validation method
  static validateReportType(reportType: string): { valid: boolean; error?: string } {
    if (!VALID_REPORT_TYPE_IDS.includes(reportType)) {
      return {
        valid: false,
        error: `Invalid report type: ${reportType}. Valid types: ${VALID_REPORT_TYPE_IDS.join(', ')}`
      };
    }
    
    const config = getReportTypeConfig(reportType);
    if (!config) {
      return {
        valid: false,
        error: `Report type configuration not found: ${reportType}`
      };
    }
    
    if (!config.enabled) {
      return {
        valid: false,
        error: `Report type is disabled: ${reportType}`
      };
    }
    
    return { valid: true };
  }
}

export const reportStructurer = new ReportStructurerTool();