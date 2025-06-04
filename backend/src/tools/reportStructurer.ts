import { Tool } from '../types/agent';

interface SectionStructure {
  title: string;
  type: 'introduction' | 'literature_review' | 'methodology' | 'results' | 'discussion' | 'conclusion' | 'references' | 'appendix' | 'custom';
  order: number;
  subsections?: SectionStructure[];
  required: boolean;
  description: string;
  wordCountRange?: [number, number];
  content?: string;
}

interface ReportTemplate {
  name: string;
  description: string;
  sections: SectionStructure[];
  totalWordCount: [number, number];
  citationStyle: 'APA' | 'MLA' | 'Chicago' | 'IEEE' | 'Harvard';
}

interface StructureOptions {
  reportType: 'research_paper' | 'thesis' | 'report' | 'proposal' | 'review' | 'case_study' | 'custom';
  academicLevel: 'undergraduate' | 'graduate' | 'phd' | 'professional';
  fieldOfStudy?: string;
  pageLimit?: number;
  wordLimit?: number;
  citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'IEEE' | 'Harvard';
  includeAppendices?: boolean;
  customSections?: string[];
}

export class ReportStructurerTool implements Tool {
  name = 'report_structurer';
  description = 'Generate academic report structures and templates with proper section organization';

  private templates: Record<string, ReportTemplate> = {
    research_paper: {
      name: 'Research Paper',
      description: 'Standard academic research paper structure',
      sections: [
        {
          title: 'Abstract',
          type: 'introduction',
          order: 1,
          required: true,
          description: 'Concise summary of the research, methodology, and findings',
          wordCountRange: [150, 300]
        },
        {
          title: 'Introduction',
          type: 'introduction',
          order: 2,
          required: true,
          description: 'Background, research questions, and objectives',
          wordCountRange: [500, 1000]
        },
        {
          title: 'Literature Review',
          type: 'literature_review',
          order: 3,
          required: true,
          description: 'Review of existing research and theoretical framework',
          wordCountRange: [1000, 2500]
        },
        {
          title: 'Methodology',
          type: 'methodology',
          order: 4,
          required: true,
          description: 'Research design, data collection, and analysis methods',
          wordCountRange: [500, 1500]
        },
        {
          title: 'Results',
          type: 'results',
          order: 5,
          required: true,
          description: 'Presentation of findings and data analysis',
          wordCountRange: [1000, 2000]
        },
        {
          title: 'Discussion',
          type: 'discussion',
          order: 6,
          required: true,
          description: 'Interpretation of results and implications',
          wordCountRange: [1000, 2000]
        },
        {
          title: 'Conclusion',
          type: 'conclusion',
          order: 7,
          required: true,
          description: 'Summary of findings and future research directions',
          wordCountRange: [300, 800]
        },
        {
          title: 'References',
          type: 'references',
          order: 8,
          required: true,
          description: 'Bibliography and citations',
          wordCountRange: [0, 0]
        }
      ],
      totalWordCount: [4000, 8000],
      citationStyle: 'APA'
    },
    
    thesis: {
      name: 'Thesis',
      description: 'Graduate-level thesis structure',
      sections: [
        {
          title: 'Title Page',
          type: 'introduction',
          order: 1,
          required: true,
          description: 'Title, author, institution, and date'
        },
        {
          title: 'Abstract',
          type: 'introduction',
          order: 2,
          required: true,
          description: 'Comprehensive summary of the thesis',
          wordCountRange: [300, 500]
        },
        {
          title: 'Table of Contents',
          type: 'introduction',
          order: 3,
          required: true,
          description: 'Document structure and page numbers'
        },
        {
          title: 'Introduction',
          type: 'introduction',
          order: 4,
          required: true,
          description: 'Research context, questions, and significance',
          wordCountRange: [2000, 4000],
          subsections: [
            {
              title: 'Problem Statement',
              type: 'custom',
              order: 1,
              required: true,
              description: 'Clear articulation of the research problem'
            },
            {
              title: 'Research Questions',
              type: 'custom',
              order: 2,
              required: true,
              description: 'Specific questions the research addresses'
            },
            {
              title: 'Significance of Study',
              type: 'custom',
              order: 3,
              required: true,
              description: 'Importance and potential impact of the research'
            }
          ]
        },
        {
          title: 'Literature Review',
          type: 'literature_review',
          order: 5,
          required: true,
          description: 'Comprehensive review of relevant literature',
          wordCountRange: [5000, 10000]
        },
        {
          title: 'Methodology',
          type: 'methodology',
          order: 6,
          required: true,
          description: 'Detailed research methodology and design',
          wordCountRange: [3000, 6000]
        },
        {
          title: 'Results',
          type: 'results',
          order: 7,
          required: true,
          description: 'Detailed presentation of findings',
          wordCountRange: [5000, 10000]
        },
        {
          title: 'Discussion',
          type: 'discussion',
          order: 8,
          required: true,
          description: 'Analysis and interpretation of results',
          wordCountRange: [4000, 8000]
        },
        {
          title: 'Conclusion',
          type: 'conclusion',
          order: 9,
          required: true,
          description: 'Summary and future research directions',
          wordCountRange: [1500, 3000]
        },
        {
          title: 'References',
          type: 'references',
          order: 10,
          required: true,
          description: 'Complete bibliography'
        },
        {
          title: 'Appendices',
          type: 'appendix',
          order: 11,
          required: false,
          description: 'Supporting materials and additional data'
        }
      ],
      totalWordCount: [20000, 50000],
      citationStyle: 'APA'
    },

    report: {
      name: 'Professional Report',
      description: 'Business or technical report structure',
      sections: [
        {
          title: 'Executive Summary',
          type: 'introduction',
          order: 1,
          required: true,
          description: 'Key findings and recommendations',
          wordCountRange: [250, 500]
        },
        {
          title: 'Introduction',
          type: 'introduction',
          order: 2,
          required: true,
          description: 'Background and scope',
          wordCountRange: [300, 600]
        },
        {
          title: 'Analysis',
          type: 'results',
          order: 3,
          required: true,
          description: 'Data analysis and findings',
          wordCountRange: [1500, 3000]
        },
        {
          title: 'Recommendations',
          type: 'discussion',
          order: 4,
          required: true,
          description: 'Action items and suggestions',
          wordCountRange: [500, 1000]
        },
        {
          title: 'Conclusion',
          type: 'conclusion',
          order: 5,
          required: true,
          description: 'Summary and next steps',
          wordCountRange: [200, 400]
        },
        {
          title: 'References',
          type: 'references',
          order: 6,
          required: false,
          description: 'Sources and citations'
        }
      ],
      totalWordCount: [2500, 5000],
      citationStyle: 'APA'
    }
  };

  async execute(input: {
    options: StructureOptions;
  }): Promise<{
    structure: ReportTemplate;
    latex_template: string;
    guidelines: string[];
  }> {
    const { options } = input;
    
    // Get base template
    let template = this.getBaseTemplate(options.reportType);
    
    // Customize template based on options
    template = this.customizeTemplate(template, options);
    
    // Generate LaTeX template
    const latexTemplate = this.generateLatexTemplate(template, options);
    
    // Generate writing guidelines
    const guidelines = this.generateGuidelines(template, options);
    
    return {
      structure: template,
      latex_template: latexTemplate,
      guidelines
    };
  }

  private getBaseTemplate(reportType: string): ReportTemplate {
    return JSON.parse(JSON.stringify(this.templates[reportType] || this.templates.research_paper));
  }

  private customizeTemplate(template: ReportTemplate, options: StructureOptions): ReportTemplate {
    // Adjust word counts based on limits
    if (options.wordLimit) {
      template = this.adjustWordCounts(template, options.wordLimit);
    }

    // Set citation style
    if (options.citationStyle) {
      template.citationStyle = options.citationStyle;
    }

    // Add custom sections
    if (options.customSections?.length) {
      options.customSections.forEach((sectionTitle, index) => {
        template.sections.splice(-1, 0, {
          title: sectionTitle,
          type: 'custom',
          order: template.sections.length + index,
          required: false,
          description: `Custom section: ${sectionTitle}`,
          wordCountRange: [500, 1500]
        });
      });
    }

    // Add appendices if requested
    if (options.includeAppendices && !template.sections.find(s => s.type === 'appendix')) {
      template.sections.push({
        title: 'Appendices',
        type: 'appendix',
        order: template.sections.length + 1,
        required: false,
        description: 'Supporting materials and additional data'
      });
    }

    // Adjust complexity based on academic level
    template = this.adjustForAcademicLevel(template, options.academicLevel);

    return template;
  }

  private adjustWordCounts(template: ReportTemplate, totalLimit: number): ReportTemplate {
    const currentTotal = template.totalWordCount[1];
    const ratio = totalLimit / currentTotal;
    
    template.sections.forEach(section => {
      if (section.wordCountRange) {
        section.wordCountRange = [
          Math.round(section.wordCountRange[0] * ratio),
          Math.round(section.wordCountRange[1] * ratio)
        ];
      }
    });
    
    template.totalWordCount = [
      Math.round(template.totalWordCount[0] * ratio),
      totalLimit
    ];
    
    return template;
  }

  private adjustForAcademicLevel(template: ReportTemplate, level: string): ReportTemplate {
    switch (level) {
      case 'undergraduate':
        // Simplify requirements, reduce word counts
        template.sections.forEach(section => {
          if (section.wordCountRange) {
            section.wordCountRange = [
              Math.round(section.wordCountRange[0] * 0.7),
              Math.round(section.wordCountRange[1] * 0.8)
            ];
          }
        });
        break;
      
      case 'phd':
        // Increase complexity and depth
        template.sections.forEach(section => {
          if (section.type === 'literature_review' || section.type === 'methodology') {
            if (section.wordCountRange) {
              section.wordCountRange = [
                Math.round(section.wordCountRange[0] * 1.5),
                Math.round(section.wordCountRange[1] * 1.8)
              ];
            }
          }
        });
        break;
    }
    
    return template;
  }

  private generateLatexTemplate(template: ReportTemplate, _options: StructureOptions): string {
    let latex = this.getLatexPreamble(template);
    
    latex += `\\title{${template.name}}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

`;

    // Add table of contents for longer documents
    if (template.totalWordCount[1] > 5000) {
      latex += `\\tableofcontents
\\newpage

`;
    }

    // Generate sections
    template.sections.forEach(section => {
      if (section.type !== 'references') {
        latex += this.generateSectionLatex(section);
      }
    });

    // Add bibliography
    if (template.sections.find(s => s.type === 'references')) {
      latex += this.getBibliographyLatex(template.citationStyle);
    }

    latex += '\\end{document}';
    
    return latex;
  }

  private getLatexPreamble(template: ReportTemplate): string {
    let preamble = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
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

`;

    // Add citation packages based on style
    switch (template.citationStyle) {
      case 'APA':
        preamble += `\\usepackage[style=apa,backend=biber]{biblatex}
\\addbibresource{references.bib}
`;
        break;
      case 'MLA':
        preamble += `\\usepackage[style=mla,backend=biber]{biblatex}
\\addbibresource{references.bib}
`;
        break;
      case 'Chicago':
        preamble += `\\usepackage[style=chicago-authordate,backend=biber]{biblatex}
\\addbibresource{references.bib}
`;
        break;
      case 'IEEE':
        preamble += `\\usepackage[style=ieee,backend=biber]{biblatex}
\\addbibresource{references.bib}
`;
        break;
      default:
        preamble += `\\usepackage{natbib}
`;
    }

    preamble += `
\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[C]{\\thepage}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

% Section formatting
\\titleformat{\\section}{\\large\\bfseries}{\\thesection}{1em}{}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{\\thesubsection}{1em}{}

`;

    return preamble;
  }

  private generateSectionLatex(section: SectionStructure): string {
    let latex = '';
    
    if (section.type === 'introduction' && section.title === 'Abstract') {
      latex += `\\begin{abstract}
% ${section.description}
% Word count: ${section.wordCountRange ? `${section.wordCountRange[0]}-${section.wordCountRange[1]}` : 'Variable'}

[Your abstract content here]

\\end{abstract}
\\newpage

`;
    } else {
      const sectionCommand = section.order <= 9 ? 'section' : 'subsection';
      latex += `\\${sectionCommand}{${section.title}}
\\label{sec:${section.title.toLowerCase().replace(/\s+/g, '_')}}

% ${section.description}
% Word count: ${section.wordCountRange ? `${section.wordCountRange[0]}-${section.wordCountRange[1]}` : 'Variable'}

[Your ${section.title.toLowerCase()} content here]

`;

      // Add subsections if they exist
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          latex += `\\subsection{${subsection.title}}
% ${subsection.description}

[Your ${subsection.title.toLowerCase()} content here]

`;
        });
      }
    }
    
    return latex;
  }

  private getBibliographyLatex(citationStyle: string): string {
    switch (citationStyle) {
      case 'APA':
      case 'MLA':
      case 'Chicago':
      case 'IEEE':
        return `\\printbibliography

`;
      default:
        return `\\bibliographystyle{plain}
\\bibliography{references}

`;
    }
  }

  private generateGuidelines(template: ReportTemplate, options: StructureOptions): string[] {
    const guidelines: string[] = [
      `This ${template.name.toLowerCase()} should be approximately ${template.totalWordCount[0]}-${template.totalWordCount[1]} words long.`,
      `Follow ${template.citationStyle} citation style throughout the document.`,
      `Maintain academic tone appropriate for ${options.academicLevel} level writing.`
    ];

    // Add section-specific guidelines
    template.sections.forEach(section => {
      if (section.required) {
        guidelines.push(`${section.title}: ${section.description}${section.wordCountRange ? ` (${section.wordCountRange[0]}-${section.wordCountRange[1]} words)` : ''}`);
      }
    });

    // Add field-specific guidelines
    if (options.fieldOfStudy) {
      guidelines.push(`Ensure content is relevant to ${options.fieldOfStudy} field conventions.`);
    }

    // Add formatting guidelines
    guidelines.push(
      'Use clear, concise language with proper grammar and spelling.',
      'Include proper headings and subheadings for organization.',
      'Use figures, tables, and charts to support your arguments where appropriate.',
      'Ensure all sources are properly cited and referenced.',
      'Proofread carefully before submission.'
    );

    if (options.reportType === 'thesis') {
      guidelines.push(
        'Include a comprehensive literature review that positions your work within existing research.',
        'Clearly describe your methodology and justify your research approach.',
        'Present results objectively with appropriate statistical analysis if applicable.',
        'Discuss limitations and implications of your findings.'
      );
    }

    return guidelines;
  }

  // Helper methods for creating custom structures
  static createCustomStructure(sections: Partial<SectionStructure>[]): ReportTemplate {
    const customSections: SectionStructure[] = sections.map((section, index) => ({
      title: section.title || `Section ${index + 1}`,
      type: section.type || 'custom',
      order: index + 1,
      required: section.required ?? true,
      description: section.description || 'Custom section',
      wordCountRange: section.wordCountRange || [500, 1000]
    }));

    const totalWordCount = customSections.reduce(
      (acc, section) => [
        acc[0] + (section.wordCountRange?.[0] || 0),
        acc[1] + (section.wordCountRange?.[1] || 0)
      ],
      [0, 0]
    ) as [number, number];

    return {
      name: 'Custom Report',
      description: 'User-defined report structure',
      sections: customSections,
      totalWordCount,
      citationStyle: 'APA'
    };
  }

  static validateStructure(template: ReportTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required sections
    const hasIntroduction = template.sections.some(s => s.type === 'introduction');
    const hasConclusion = template.sections.some(s => s.type === 'conclusion');

    if (!hasIntroduction) {
      errors.push('Missing introduction section');
    }

    if (!hasConclusion) {
      errors.push('Missing conclusion section');
    }

    // Check section order
    const orders = template.sections.map(s => s.order);
    const sortedOrders = [...orders].sort((a, b) => a - b);
    if (!orders.every((order, index) => order === sortedOrders[index])) {
      errors.push('Section order is not sequential');
    }

    // Check word count consistency
    const sectionTotal = template.sections
      .filter(s => s.wordCountRange)
      .reduce((sum, s) => sum + (s.wordCountRange![1] || 0), 0);
    
    if (sectionTotal > template.totalWordCount[1] * 1.2) {
      errors.push('Section word counts exceed total word count by more than 20%');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const reportStructurer = new ReportStructurerTool();
