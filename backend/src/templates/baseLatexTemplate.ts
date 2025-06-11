/**
 * Base LaTeX Template with Alpine-Compatible Packages
 * This template uses only packages available in Alpine Linux texlive distribution
 */

export interface LaTeXTemplateOptions {
  title: string;
  author: string;
  date?: string;
  documentClass?: 'article' | 'report' | 'book';
  fontSize?: 10 | 11 | 12;
  paperSize?: 'a4paper' | 'letterpaper';
  citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'IEEE';
  includeTableOfContents?: boolean;
  includeBibliography?: boolean;
}

export interface LaTeXSection {
  id: string;
  title: string;
  content: string; // Pure LaTeX content
  order: number;
}

/**
 * Generate base LaTeX document with Alpine-compatible packages
 */
export function generateBaseLatexTemplate(options: LaTeXTemplateOptions): string {
  const {
    title,
    author,
    date = '\\today',
    documentClass = 'article',
    fontSize = 12,
    paperSize = 'a4paper',
    citationStyle = 'APA',
    includeTableOfContents = true,
    includeBibliography = true
  } = options;

  // Alpine Linux texlive packages that are guaranteed to be available
  // These packages are documented here and used in the template below

  const template = `\\documentclass[${fontSize}pt,${paperSize}]{${documentClass}}

% Essential packages (Alpine Linux compatible)
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}

% Math packages
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}

% Graphics and layout
\\usepackage{graphicx}
\\usepackage[margin=1in]{geometry}
\\usepackage{fancyhdr}
\\usepackage{setspace}

% Text formatting
\\usepackage{url}
\\usepackage[colorlinks=true,linkcolor=blue,urlcolor=blue]{hyperref}

% Citations (TEMPORARILY DISABLED - Alpine compatible)
% \\usepackage{cite}

% Lists and tables
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{booktabs}
\\usepackage{longtable}

% Captions and floats
\\usepackage{caption}
\\usepackage{subcaption}
\\usepackage{float}

% Document metadata
\\title{${title}}
\\author{${author}}
\\date{${date}}

% Page style
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\thepage}
\\lhead{${title}}

% Line spacing
\\onehalfspacing

\\begin{document}

\\maketitle

${includeTableOfContents ? '\\tableofcontents\n\\newpage\n' : ''}

% SECTIONS_PLACEHOLDER

${includeBibliography ? `
\\newpage
\\bibliographystyle{${getCitationStyle(citationStyle)}}
\\bibliography{references}
` : ''}

\\end{document}`;

  return template;
}

/**
 * Get bibliography style based on citation format
 */
function getCitationStyle(style: string): string {
  switch (style.toUpperCase()) {
    case 'APA':
      return 'plain'; // Use plain style as APA-specific might not be available
    case 'MLA':
      return 'alpha';
    case 'CHICAGO':
      return 'abbrv';
    case 'IEEE':
      return 'ieeetr';
    default:
      return 'plain';
  }
}

/**
 * Insert sections into LaTeX template
 */
export function insertSectionsIntoTemplate(
  template: string, 
  sections: LaTeXSection[]
): string {
  // Sort sections by order
  const sortedSections = sections.sort((a, b) => a.order - b.order);
  
  // Generate LaTeX sections
  const latexSections = sortedSections.map(section => {
    // Clean section title for LaTeX
    const cleanTitle = section.title.replace(/[{}\\]/g, '');
    
    return `\\section{${cleanTitle}}
\\label{sec:${section.id}}

${section.content}

`;
  }).join('\n');

  // Replace placeholder with actual sections
  return template.replace('% SECTIONS_PLACEHOLDER', latexSections);
}

/**
 * Validate LaTeX content for Alpine compatibility
 */
export function validateLatexContent(content: string): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for potentially problematic packages
  const problematicPackages = [
    'xcolor',      // Might not be available
    'tikz',        // Complex package
    'pgfplots',    // Plotting package
    'biblatex',    // Modern bib package
    'fontspec',    // XeLaTeX/LuaLaTeX specific
    'microtype'    // Advanced typography
  ];

  problematicPackages.forEach(pkg => {
    if (content.includes(`\\usepackage{${pkg}}`)) {
      warnings.push(`Package '${pkg}' might not be available in Alpine Linux`);
    }
  });

  // Check for basic LaTeX structure
  if (!content.includes('\\begin{document}')) {
    errors.push('Missing \\begin{document}');
  }
  
  if (!content.includes('\\end{document}')) {
    errors.push('Missing \\end{document}');
  }

  // Check for unmatched braces (basic check)
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    warnings.push('Unmatched braces detected');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Generate section-level LaTeX content template
 */
export function generateSectionTemplate(sectionTitle: string, sectionType: string): string {
  const cleanTitle = sectionTitle.replace(/[{}\\]/g, '');
  
  const templates = {
    'ABSTRACT': `% Abstract section
This paper presents ${cleanTitle.toLowerCase()}. The research demonstrates...

\\textbf{Keywords:} keyword1, keyword2, keyword3`,

    'INTRODUCTION': `% Introduction section  
The field of [research area] has seen significant developments in recent years. This paper addresses [research problem] by [approach].

\\subsection{Background}
[Background information here]

\\subsection{Research Objectives}
The main objectives of this research are:
\\begin{enumerate}
    \\item [Objective 1]
    \\item [Objective 2] 
    \\item [Objective 3]
\\end{enumerate}`,

    'METHODOLOGY': `% Methodology section
This section describes the research methodology employed in this study.

\\subsection{Research Design}
[Research design description]

\\subsection{Data Collection}
[Data collection methods]

\\subsection{Analysis Approach}
[Analysis methodology]`,

    'RESULTS': `% Results section
This section presents the findings of the research.

\\subsection{Key Findings}
[Present main results]

\\subsection{Statistical Analysis}
[Statistical results if applicable]`,

    'CONCLUSION': `% Conclusion section
This research has demonstrated [main findings]. The implications of these results suggest [implications].

\\subsection{Future Work}
Future research directions include [future work suggestions].`,

    'REFERENCES': `% References section will be auto-generated`,

    'TEXT': `% Content section
[Your content here. This section can include subsections, figures, tables, and citations as needed.]

\\subsection{Subsection Title}
[Subsection content]`
  };

  return templates[sectionType as keyof typeof templates] || templates['TEXT'];
}