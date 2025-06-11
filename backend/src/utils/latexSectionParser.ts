/**
 * LaTeX Section Parser - Pure LaTeX Processing
 * Eliminates markdown dependency, parses LaTeX sections only
 */

export interface ParsedLatexSection {
  id: string;
  title: string;
  content: string;
  order: number;
  type: 'ABSTRACT' | 'INTRODUCTION' | 'CONCLUSION' | 'REFERENCES' | 'TEXT';
}

/**
 * Parse AI-generated LaTeX content into individual sections
 * Uses \section{} tags instead of markdown headers
 */
export function parseLatexIntoSections(latexContent: string): ParsedLatexSection[] {
  const sections: ParsedLatexSection[] = [];
  
  // Remove document preamble and end
  const cleanContent = extractDocumentBody(latexContent);
  
  // Split by \section{} commands
  const sectionMatches = cleanContent.split(/\\section\{([^}]+)\}/);
  
  // First element is content before any section (skip it)
  for (let i = 1; i < sectionMatches.length; i += 2) {
    const title = sectionMatches[i].trim();
    const content = sectionMatches[i + 1]?.trim() || '';
    
    if (title && content) {
      const section: ParsedLatexSection = {
        id: generateSectionId(title),
        title: cleanLatexTitle(title),
        content: cleanSectionContent(content),
        order: Math.floor(i / 2) + 1,
        type: determineSectionType(title)
      };
      
      sections.push(section);
    }
  }
  
  // If no sections found, try alternative parsing
  if (sections.length === 0) {
    return parseAlternativeFormat(cleanContent);
  }
  
  return sections;
}

/**
 * Extract content between \begin{document} and \end{document}
 */
function extractDocumentBody(latexContent: string): string {
  const beginMatch = latexContent.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (beginMatch) {
    return beginMatch[1].trim();
  }
  
  // If no document environment, return original content
  return latexContent;
}

/**
 * Clean LaTeX title by removing commands and special characters
 */
function cleanLatexTitle(title: string): string {
  return title
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // Remove LaTeX commands
    .replace(/\\[a-zA-Z]+/g, '') // Remove standalone commands
    .replace(/[{}]/g, '') // Remove remaining braces
    .trim();
}

/**
 * Clean section content by removing unwanted commands
 */
function cleanSectionContent(content: string): string {
  // Remove \label{} commands as we handle them separately
  let cleaned = content.replace(/\\label\{[^}]*\}/g, '');
  
  // Remove \newpage commands between sections
  cleaned = cleaned.replace(/\\newpage\s*/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Generate consistent section ID from title
 */
function generateSectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Determine section type based on title
 */
function determineSectionType(title: string): 'ABSTRACT' | 'INTRODUCTION' | 'CONCLUSION' | 'REFERENCES' | 'TEXT' {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('abstract')) return 'ABSTRACT';
  if (lowerTitle.includes('introduction')) return 'INTRODUCTION';
  if (lowerTitle.includes('conclusion') || lowerTitle.includes('summary')) return 'CONCLUSION';
  if (lowerTitle.includes('reference') || lowerTitle.includes('bibliography') || lowerTitle.includes('citation')) return 'REFERENCES';
  
  return 'TEXT';
}

/**
 * Alternative parsing for content without clear \section{} tags
 */
function parseAlternativeFormat(content: string): ParsedLatexSection[] {
  const sections: ParsedLatexSection[] = [];
  
  // Try to parse by subsection or other patterns
  const patterns = [
    /\\subsection\{([^}]+)\}/g,
    /\\subsubsection\{([^}]+)\}/g,
    /\\paragraph\{([^}]+)\}/g
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(content.matchAll(pattern));
    if (matches.length > 0) {
      matches.forEach((match, index) => {
        const title = match[1];
        const startPos = match.index || 0;
        const nextMatch = matches[index + 1];
        const endPos = nextMatch?.index || content.length;
        
        const sectionContent = content.substring(startPos + match[0].length, endPos).trim();
        
        sections.push({
          id: generateSectionId(title),
          title: cleanLatexTitle(title),
          content: cleanSectionContent(sectionContent),
          order: index + 1,
          type: determineSectionType(title)
        });
      });
      
      break; // Use first successful pattern
    }
  }
  
  // If still no sections, create a single section
  if (sections.length === 0) {
    sections.push({
      id: 'main-content',
      title: 'Main Content',
      content: cleanSectionContent(content),
      order: 1,
      type: 'TEXT'
    });
  }
  
  return sections;
}

/**
 * Validate parsed sections for quality
 */
export function validateParsedSections(sections: ParsedLatexSection[]): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check minimum content length
  sections.forEach(section => {
    if (section.content.length < 50) {
      warnings.push(`Section "${section.title}" is very short (${section.content.length} characters)`);
    }
  });
  
  // Check for required sections
  const sectionTypes = sections.map(s => s.type);
  if (!sectionTypes.includes('INTRODUCTION')) {
    suggestions.push('Consider adding an Introduction section');
  }
  if (!sectionTypes.includes('CONCLUSION')) {
    suggestions.push('Consider adding a Conclusion section');
  }
  
  // Check section order
  const hasIntro = sectionTypes.includes('INTRODUCTION');
  const hasConclusion = sectionTypes.includes('CONCLUSION');
  const introIndex = sections.findIndex(s => s.type === 'INTRODUCTION');
  const conclusionIndex = sections.findIndex(s => s.type === 'CONCLUSION');
  
  if (hasIntro && hasConclusion && introIndex > conclusionIndex) {
    warnings.push('Introduction appears after Conclusion');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Merge sections back into complete LaTeX document
 */
export function mergeSectionsToLatex(
  sections: ParsedLatexSection[], 
  template: string
): string {
  // Sort sections by order
  const sortedSections = sections.sort((a, b) => a.order - b.order);
  
  // Generate LaTeX sections
  const latexSections = sortedSections.map(section => {
    return `\\section{${section.title}}
\\label{sec:${section.id}}

${section.content}

`;
  }).join('\n');
  
  // Replace placeholder in template
  return template.replace('% SECTIONS_PLACEHOLDER', latexSections);
}

/**
 * Extract metadata from LaTeX content
 */
export function extractLatexMetadata(latexContent: string): {
  title: string | undefined;
  author: string | undefined;
  date: string | undefined;
  wordCount: number;
  sectionCount: number;
} {
  const titleMatch = latexContent.match(/\\title\{([^}]+)\}/);
  const authorMatch = latexContent.match(/\\author\{([^}]+)\}/);
  const dateMatch = latexContent.match(/\\date\{([^}]+)\}/);
  
  // Count words (approximate)
  const bodyContent = extractDocumentBody(latexContent);
  const wordCount = bodyContent
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // Remove LaTeX commands
    .replace(/\\[a-zA-Z]+/g, '') // Remove standalone commands
    .replace(/[{}]/g, '') // Remove braces
    .split(/\s+/)
    .filter(word => word.length > 0).length;
  
  // Count sections
  const sectionCount = (latexContent.match(/\\section\{/g) || []).length;
  
  return {
    title: titleMatch?.[1],
    author: authorMatch?.[1],
    date: dateMatch?.[1],
    wordCount,
    sectionCount
  };
}