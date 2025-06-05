import { z } from 'zod';

// Zod schemas for validation
export const SectionConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['TEXT', 'CODE', 'MATH', 'TABLE', 'FIGURE']),
  description: z.string(),
  wordCountRange: z.tuple([z.number(), z.number()]),
  required: z.boolean(),
  order: z.number(),
  subsections: z.array(z.string()).optional(),
  guidelines: z.string().optional()
});

export const ReportMetadataSchema = z.object({
  wordCountRange: z.tuple([z.number(), z.number()]),
  defaultCitationStyle: z.enum(['APA', 'MLA', 'CHICAGO', 'IEEE']),
  recommendedAcademicLevels: z.array(z.enum(['high_school', 'undergraduate', 'graduate', 'doctoral', 'professional'])),
  estimatedTimeHours: z.tuple([z.number(), z.number()]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string())
});

export const LaTeXTemplateSchema = z.object({
  documentClass: z.string(),
  packages: z.array(z.string()),
  preamble: z.string(),
  titlePageTemplate: z.string(),
  sectionTemplate: z.string(),
  bibliographyTemplate: z.string()
});

export const ReportTypeConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  longDescription: z.string(),
  enabled: z.boolean(),
  category: z.enum(['academic', 'professional', 'scientific', 'business']),
  template: z.object({
    sections: z.array(SectionConfigSchema),
    metadata: ReportMetadataSchema,
    latexTemplate: LaTeXTemplateSchema
  }),
  examples: z.array(z.object({
    title: z.string(),
    description: z.string(),
    fieldOfStudy: z.string().optional()
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.string()
});

// TypeScript types derived from schemas
export type SectionConfig = z.infer<typeof SectionConfigSchema>;
export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;
export type LaTeXTemplate = z.infer<typeof LaTeXTemplateSchema>;
export type ReportTypeConfig = z.infer<typeof ReportTypeConfigSchema>;

// Report Types Configuration
export const REPORT_TYPES_CONFIG: Record<string, ReportTypeConfig> = {
  research_paper: {
    id: 'research_paper',
    label: 'Research Paper',
    description: 'Academic research paper with methodology and analysis',
    longDescription: 'A comprehensive academic research paper that presents original research, methodology, findings, and analysis. Includes literature review, research methodology, results, and detailed discussion of findings.',
    enabled: true,
    category: 'academic',
    template: {
      sections: [
        {
          id: 'abstract',
          title: 'Abstract',
          type: 'TEXT',
          description: 'Concise summary of the research question, methodology, key findings, and conclusions',
          wordCountRange: [150, 300],
          required: true,
          order: 1,
          guidelines: 'Should be written last, summarizing the entire paper in a single paragraph. Include research objective, methods, key results, and main conclusion.'
        },
        {
          id: 'introduction',
          title: 'Introduction',
          type: 'TEXT',
          description: 'Background information, research problem, objectives, and paper structure',
          wordCountRange: [500, 1000],
          required: true,
          order: 2,
          guidelines: 'Start broad and narrow down to your specific research question. Clearly state the problem, why it matters, and your research objectives.'
        },
        {
          id: 'literature_review',
          title: 'Literature Review',
          type: 'TEXT',
          description: 'Critical analysis of existing research and theoretical framework',
          wordCountRange: [1000, 2500],
          required: true,
          order: 3,
          guidelines: 'Synthesize existing research, identify gaps, and position your work within the field. Organize thematically, not chronologically.'
        },
        {
          id: 'methodology',
          title: 'Methodology',
          type: 'TEXT',
          description: 'Research design, data collection methods, and analytical procedures',
          wordCountRange: [500, 1500],
          required: true,
          order: 4,
          subsections: ['Research Design', 'Data Collection', 'Data Analysis', 'Limitations'],
          guidelines: 'Describe your approach in enough detail for replication. Justify your choices and acknowledge limitations.'
        },
        {
          id: 'results',
          title: 'Results',
          type: 'TEXT',
          description: 'Presentation of findings with tables, figures, and statistical analysis',
          wordCountRange: [1000, 2000],
          required: true,
          order: 5,
          guidelines: 'Present findings objectively without interpretation. Use tables and figures effectively. Report all relevant results, including non-significant findings.'
        },
        {
          id: 'discussion',
          title: 'Discussion',
          type: 'TEXT',
          description: 'Interpretation of results, implications, and connection to existing literature',
          wordCountRange: [1000, 2000],
          required: true,
          order: 6,
          subsections: ['Key Findings', 'Implications', 'Limitations', 'Future Research'],
          guidelines: 'Interpret your results, explain their significance, and relate back to your research questions and existing literature.'
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          type: 'TEXT',
          description: 'Summary of key findings, contributions, and future research directions',
          wordCountRange: [300, 800],
          required: true,
          order: 7,
          guidelines: 'Summarize key findings, restate their significance, and suggest concrete directions for future research.'
        },
        {
          id: 'references',
          title: 'References',
          type: 'TEXT',
          description: 'Complete bibliography of all cited sources',
          wordCountRange: [0, 0], // Not counted in word limit
          required: true,
          order: 8,
          guidelines: 'Follow citation style guidelines precisely. Include all and only cited sources.'
        }
      ],
      metadata: {
        wordCountRange: [4000, 8000],
        defaultCitationStyle: 'APA',
        recommendedAcademicLevels: ['undergraduate', 'graduate', 'doctoral'],
        estimatedTimeHours: [40, 80],
        difficulty: 'intermediate',
        tags: ['academic', 'research', 'empirical', 'peer-reviewed']
      },
      latexTemplate: {
        documentClass: 'article',
        packages: [
          'geometry',
          'amsmath',
          'amsfonts',
          'amssymb',
          'graphicx',
          'booktabs',
          'array',
          'parskip',
          'fancyhdr',
          'titlesec',
          'natbib',
          'url',
          'hyperref'
        ],
        preamble: `
\\geometry{margin=1in}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{times}
\\usepackage{setspace}
\\doublespacing

% Header and footer
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\thepage}
\\renewcommand{\\headrulewidth}{0pt}

% Section formatting
\\titleformat{\\section}{\\normalfont\\Large\\bfseries}{\\thesection}{1em}{}
\\titleformat{\\subsection}{\\normalfont\\large\\bfseries}{\\thesubsection}{1em}{}

% Hyperref setup
\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    filecolor=magenta,      
    urlcolor=blue,
    citecolor=black
}
        `,
        titlePageTemplate: `
\\begin{titlepage}
\\centering
\\vspace*{1in}

{\\Large \\textbf{{{TITLE}}} \\par}
\\vspace{0.5in}
{\\large {{AUTHOR}} \\par}
\\vspace{0.3in}
{\\large {{INSTITUTION}} \\par}
\\vspace{0.5in}
{\\large {{DATE}} \\par}

\\vfill
\\end{titlepage}
        `,
        sectionTemplate: `
\\section{{{SECTION_TITLE}}}
{{SECTION_CONTENT}}
        `,
        bibliographyTemplate: `
\\bibliographystyle{apalike}
\\bibliography{references}
        `
      }
    },
    examples: [
      {
        title: 'The Impact of Social Media on Academic Performance',
        description: 'Quantitative study examining the relationship between social media usage and GPA among college students',
        fieldOfStudy: 'Psychology'
      },
      {
        title: 'Machine Learning Approaches to Climate Prediction',
        description: 'Comparative analysis of different ML algorithms for long-term climate forecasting',
        fieldOfStudy: 'Computer Science'
      },
      {
        title: 'Economic Effects of Remote Work Policies',
        description: 'Mixed-methods research on productivity and cost implications of remote work arrangements',
        fieldOfStudy: 'Economics'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  }
};

// Helper functions
export function getEnabledReportTypes(): ReportTypeConfig[] {
  return Object.values(REPORT_TYPES_CONFIG).filter(config => config.enabled);
}

export function getReportTypeConfig(id: string): ReportTypeConfig | null {
  return REPORT_TYPES_CONFIG[id] || null;
}

export function validateReportTypeConfig(config: unknown): ReportTypeConfig {
  return ReportTypeConfigSchema.parse(config);
}

export function getReportTypesForDropdown() {
  return getEnabledReportTypes().map(config => ({
    value: config.id,
    label: config.label,
    description: config.description,
    category: config.category,
    difficulty: config.template.metadata.difficulty,
    estimatedTime: config.template.metadata.estimatedTimeHours
  }));
}

// Export all report type IDs for validation
export const VALID_REPORT_TYPE_IDS = Object.keys(REPORT_TYPES_CONFIG);