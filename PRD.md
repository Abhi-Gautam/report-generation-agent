# 📋 **Research Agent PRD: AI-Powered LaTeX Report Generation with Source Management**

## 🎯 **Executive Summary**

### **Vision**
Transform academic and research writing by providing an AI-powered system that generates professional LaTeX reports directly from user sources and prompts, eliminating the complexity of manual formatting while maintaining full editorial control.

### **Core Value Proposition**
- **1-Click Report Generation**: From topic to professional PDF in minutes
- **Source-Aware AI**: Upload documents, reference with @filename, get contextual content
- **Direct LaTeX Generation**: Skip markdown conversion, get publication-ready output
- **Professional Editor**: Monaco-powered LaTeX editing with real-time preview

### **Target Users**
- **Primary**: Researchers, graduate students, academics
- **Secondary**: Technical writers, consultants, analysts
- **Use Cases**: Research papers, literature reviews, technical reports, thesis chapters

---

## 📊 **Current System Status**

### ✅ **Completed & Working (26/35 features)**

**🏗️ Core Infrastructure:**
- ✅ API integration (Gemini AI, Brave Search)
- ✅ WebSocket progress tracking
- ✅ Docker-based LaTeX compilation
- ✅ Error correction agents (duplicate documentclass, missing packages)
- ✅ 206KB PDF generation with 0.8 quality score

**🤖 AI Pipeline:**
- ✅ Research agent with web search
- ✅ Content generation and section population
- ✅ LaTeX formatter agent
- ✅ Compilation feedback loop with automatic fixes

**🎨 User Interface:**
- ✅ 1-click report creation modal
- ✅ Light/dark theme support with semantic tokens
- ✅ Sticky headers and improved navigation
- ✅ Custom delete confirmation modals
- ✅ Monaco Editor with LaTeX syntax highlighting

### 🔴 **Critical Issues Requiring Fix (9 features)**

**🚨 High Priority - Broken Functionality:**
- ❌ Preview buttons not working (report cards + edit page)
- ❌ Export/Save placeholders in edit page
- ❌ Section creation methodology (### parsing issues)
- ❌ Markdown-to-LaTeX conversion errors
- ❌ LaTeX package incompatibility

**🟡 Medium Priority - UX Issues:**
- ⚠️ Suggestions button no visual feedback
- ⚠️ Duplicate Save buttons
- ⚠️ Monaco LaTeX features need enhancement

### 🆕 **Missing Core Features (Major Gaps)**
- ❌ **File upload system** - No source management
- ❌ **@filename referencing** - No source-aware prompts
- ❌ **Source preview panel** - No file management in editor
- ❌ **Direct LaTeX generation** - Still using broken markdown pipeline

---

## 🎯 **Core User Journey**

### **Primary Workflow: Source-Aware Report Generation**

```
1. CREATE PROJECT
   ↓
2. UPLOAD SOURCES (NEW)
   │ • Drag-drop PDF, images, text files
   │ • Add descriptions for each source
   │ • Preview uploaded content
   ↓
3. DEFINE REPORT SCOPE
   │ • Title and research topic
   │ • Reference sources with @filename
   │ • Select report type and style
   ↓
4. AI GENERATION (ENHANCED)
   │ • AI analyzes all uploaded sources
   │ • Generates LaTeX content directly
   │ • Creates proper section hierarchy
   │ • Includes citations and references
   ↓
5. EDIT & REFINE
   │ • Monaco editor with LaTeX support
   │ • Source panel for reference
   │ • Real-time PDF preview
   │ • Section-level regeneration
   ↓
6. EXPORT & PUBLISH
   │ • Download PDF
   │ • Export LaTeX source
   │ • Save project for later
```

### **User Stories**

**As a researcher, I want to:**
- Upload multiple PDFs and reference them in my AI prompt with @filename
- Have AI generate LaTeX content that cites my sources appropriately
- Edit the generated content in a professional LaTeX editor
- Preview my document as a PDF in real-time
- Export both the PDF and LaTeX source files

**As a graduate student, I want to:**
- Upload my research notes and have AI synthesize them into sections
- Reference specific figures from uploaded images in the AI prompt
- Generate literature reviews that properly cite uploaded papers
- Edit citations and formatting in LaTeX without learning complex syntax

---

## 📁 **Feature Specification: File Upload & Source Management**

### **File Upload System**

**Supported Formats:**
- **Documents**: PDF, TXT, MD, DOCX
- **Images**: JPG, PNG, GIF, SVG
- **Data**: CSV, JSON, XML
- **Presentations**: PPTX (future)

**Upload Interface:**
```typescript
interface UploadedSource {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'image' | 'text' | 'document' | 'data';
  size: number;
  uploadedAt: Date;
  description: string;
  extractedText?: string;
  metadata: {
    author?: string;
    title?: string;
    pages?: number;
    wordCount?: number;
  };
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
}
```

**Processing Pipeline:**
1. **File Validation**: Size limits, format checking, virus scanning
2. **Text Extraction**: OCR for images, PDF text extraction, document parsing
3. **Metadata Extraction**: Author, title, creation date, page count
4. **Content Analysis**: Summarization, key topic extraction
5. **Storage**: Secure file storage with database metadata

**File Management Panel:**
- **Grid/List View**: Thumbnails with file info
- **Search & Filter**: By type, date, keywords
- **Quick Actions**: Preview, edit description, delete
- **Bulk Operations**: Select multiple, organize

### **@Filename Autocomplete System**

**Autocomplete Interface:**
```typescript
interface SourceReference {
  trigger: '@';
  filename: string;
  description: string;
  relevance: number;
  lastUsed: Date;
}
```

**Features:**
- **Fuzzy Search**: Find files by partial names
- **Context Awareness**: Suggest relevant sources based on topic
- **Usage History**: Prioritize frequently referenced sources
- **Description Preview**: Show file descriptions in autocomplete
- **Multiple References**: @file1.pdf @notes.txt in same prompt

**AI Prompt Enhancement:**
```
Original: "Write about climate change impacts"
Enhanced: "Using @climate_data.pdf and @ipcc_report.pdf, write about climate change impacts focusing on the temperature trends shown in @figure1.png"
```

### **Source Preview & Integration**

**Preview Capabilities:**
- **PDF Viewer**: Embedded PDF display with page navigation
- **Image Viewer**: Zoomable image preview with annotations
- **Text Preview**: Syntax-highlighted text with search
- **Document Summary**: AI-generated summary of key points

**Editor Integration:**
- **Side Panel**: Collapsible source browser alongside editor
- **Quick Insert**: Drag citations/references into LaTeX
- **Cross-References**: Link generated content back to sources
- **Citation Helper**: Auto-format citations in selected style

---

## 🤖 **Feature Specification: Direct LaTeX Generation**

### **Strategic Architecture Change**

**Current (Broken) Pipeline:**
```
AI → Markdown → Section Parser → LaTeX Formatter → PDF
     ↑ Issues: ### parsing, header conversion, package errors
```

**New (Direct) Pipeline:**
```
AI + Sources → LaTeX Content → PDF Compilation
              ↑ Clean, structured, properly formatted
```

### **AI Agent Redesign**

**Enhanced Research Agent:**
```typescript
interface LatexGenerationRequest {
  topic: string;
  reportType: 'research_paper' | 'literature_review' | 'technical_report';
  sources: UploadedSource[];
  sourceReferences: string[]; // @filename mentions in prompt
  citationStyle: 'APA' | 'MLA' | 'Chicago' | 'IEEE';
  sections: string[];
  customInstructions?: string;
}

interface LatexSection {
  id: string;
  title: string;
  latexContent: string; // Direct LaTeX, no markdown
  sourceReferences: string[]; // Which sources were used
  citations: Citation[];
  subsections?: LatexSection[];
}
```

**AI Prompt Template:**
```
You are a LaTeX academic writing expert. Generate professional LaTeX content for a research report.

SOURCES PROVIDED:
${sources.map(s => `- ${s.filename}: ${s.description}\n  Content summary: ${s.summary}`).join('\n')}

TASK: ${topic}
REFERENCED SOURCES: ${sourceReferences}

REQUIREMENTS:
1. Generate valid LaTeX content (no markdown)
2. Use proper section hierarchy (\section{}, \subsection{}, \subsubsection{})
3. Include \cite{} commands for referenced sources
4. Use only Alpine-compatible packages
5. Include proper academic formatting

OUTPUT FORMAT:
\section{Section Title}
Content with proper \cite{source1} citations...

\subsection{Subsection}
More content with \textbf{emphasis} and \emph{italics}...
```

### **LaTeX Template System**

**Document Templates:**
```latex
% Research Paper Template
\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[english]{babel}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{geometry}
\usepackage{natbib} % For citations
\usepackage{url}

\title{${title}}
\author{${author}}
\date{\today}

\begin{document}
\maketitle
\tableofcontents
\newpage

${generatedSections}

\bibliographystyle{${citationStyle}}
\bibliography{references}
\end{document}
```

**Section Templates:**
```latex
% Introduction Template
\section{Introduction}
\label{sec:introduction}

The research presented in this paper addresses ${topic}. According to \cite{${primarySource}}, ${contextualStatement}.

% Methodology Template  
\section{Methodology}
\label{sec:methodology}

This study employs ${methodology} as described in \cite{${methodologySource}}.

\subsection{Data Collection}
${dataCollectionDescription}

\subsection{Analysis Approach}
${analysisDescription}
```

### **Citation Management**

**Automatic Bibliography Generation:**
```typescript
interface Citation {
  key: string; // e.g., "smith2023"
  sourceId: string; // Links to uploaded file
  type: 'article' | 'book' | 'webpage' | 'report';
  bibEntry: string; // BibTeX format
  inlineFormat: string; // \cite{smith2023}
}

// Auto-generate from uploaded PDFs
function extractBibliography(pdfSource: UploadedSource): Citation {
  return {
    key: generateCitationKey(pdfSource.metadata),
    sourceId: pdfSource.id,
    type: detectSourceType(pdfSource),
    bibEntry: generateBibTeX(pdfSource.metadata),
    inlineFormat: `\\cite{${key}}`
  };
}
```

---

## 🔧 **Feature Specification: Enhanced Monaco Editor**

### **LaTeX-Specific Enhancements**

**Custom Language Configuration:**
```typescript
// Monaco LaTeX Configuration
export const latexLanguageConfig = {
  keywords: [
    'begin', 'end', 'section', 'subsection', 'subsubsection',
    'textbf', 'textit', 'emph', 'cite', 'ref', 'label',
    'includegraphics', 'caption', 'maketitle', 'tableofcontents'
  ],
  
  autocomplete: [
    {
      label: 'section',
      insertText: 'section{${1:title}}\n\\label{sec:${2:label}}\n\n$0',
      kind: CompletionItemKind.Snippet,
      documentation: 'Create a new section'
    },
    {
      label: 'cite',
      insertText: 'cite{${1:citation}}',
      kind: CompletionItemKind.Function,
      documentation: 'Insert citation'
    },
    {
      label: 'figure',
      insertText: 'begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${1:filename}}\n\\caption{${2:caption}}\n\\label{fig:${3:label}}\n\\end{figure}',
      kind: CompletionItemKind.Snippet
    }
  ],

  themes: {
    'latex-light': {
      base: 'vs',
      rules: [
        { token: 'keyword.latex', foreground: '#0066CC' },
        { token: 'string.latex', foreground: '#008000' },
        { token: 'comment.latex', foreground: '#808080' }
      ]
    }
  }
};
```

**Enhanced Editor Features:**
- **Real-time Validation**: Highlight LaTeX syntax errors
- **Bracket Matching**: Auto-close \begin{} \end{} pairs
- **Smart Indentation**: Proper LaTeX structure indentation
- **Command Snippets**: Quick insertion of common LaTeX commands
- **Source Integration**: Autocomplete @filename references
- **Math Mode**: Enhanced equation editing support

### **Source Panel Integration**

**Layout Design:**
```
┌─────────────────────────────────────────────────┐
│ Header: Title | Edit | Preview | Save | Export  │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────┐ │
│ │   Sources   │ │         Monaco Editor       │ │
│ │   Panel     │ │         (LaTeX)             │ │
│ │ ┌─────────┐ │ │                             │ │
│ │ │ file1   │ │ │ \section{Introduction}      │ │
│ │ │ file2   │ │ │ According to \cite{file1}   │ │
│ │ │ file3   │ │ │ ...                         │ │
│ │ └─────────┘ │ │                             │ │
│ │             │ │                             │ │
│ └─────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Source Panel Features:**
- **Collapsible Interface**: Toggle panel visibility
- **File Grid**: Thumbnail view with quick info
- **Search Bar**: Find sources quickly
- **Drag & Drop**: Insert citations into editor
- **Preview on Hover**: Quick content preview
- **Usage Tracking**: Show which sources are cited

---

## 🏗️ **Technical Architecture**

### **File Storage & Processing**

**Storage Strategy:**
```typescript
// Database Schema
interface Project {
  id: string;
  title: string;
  topic: string;
  status: 'draft' | 'generating' | 'completed';
  sources: UploadedSource[];
  sections: LaTeXSection[];
  compiledPdf?: string; // File path or URL
  createdAt: Date;
  updatedAt: Date;
}

interface UploadedSource {
  id: string;
  projectId: string;
  filename: string;
  filePath: string; // Storage location
  fileType: string;
  size: number;
  extractedText?: string;
  metadata: SourceMetadata;
  processingStatus: ProcessingStatus;
}
```

**File Processing Pipeline:**
```
Upload → Validation → Text Extraction → Metadata → AI Analysis → Storage
  ↓         ↓            ↓              ↓           ↓          ↓
Queue    Size/Type    OCR/PDF Parse   Author/Title Summary   Database
```

**Background Processing:**
- **Async File Processing**: Queue system for large files
- **Progressive Loading**: Show files immediately, process in background
- **Status Updates**: Real-time processing status via WebSocket
- **Error Handling**: Retry logic and user notifications

### **AI Integration Architecture**

**Source-Aware Generation:**
```typescript
class EnhancedResearchAgent {
  async generateLatexReport(request: LatexGenerationRequest): Promise<LaTeXReport> {
    // 1. Analyze uploaded sources
    const sourceAnalysis = await this.analyzeSources(request.sources);
    
    // 2. Extract relevant content based on @filename references
    const relevantContent = this.extractRelevantContent(
      request.sourceReferences, 
      sourceAnalysis
    );
    
    // 3. Generate LaTeX sections with proper citations
    const sections = await this.generateLatexSections(
      request.topic,
      relevantContent,
      request.citationStyle
    );
    
    // 4. Compile complete document
    return this.compileLatexDocument(sections, request.reportType);
  }
}
```

**Citation Engine:**
```typescript
class CitationEngine {
  extractBibliography(source: UploadedSource): Citation[] {
    switch (source.fileType) {
      case 'pdf':
        return this.extractPdfCitations(source);
      case 'text':
        return this.parsePlainTextCitations(source);
      default:
        return this.generateBasicCitation(source);
    }
  }
  
  formatCitation(citation: Citation, style: CitationStyle): string {
    // Convert to APA, MLA, Chicago, IEEE format
  }
}
```

### **Real-time Features**

**WebSocket Enhancement:**
```typescript
interface SourceProcessingEvent {
  type: 'source_processing' | 'source_complete' | 'source_error';
  sourceId: string;
  progress: number;
  status: string;
  extractedText?: string;
  error?: string;
}

interface GenerationProgressEvent {
  type: 'generation_progress';
  stage: 'analyzing_sources' | 'generating_content' | 'formatting_latex' | 'compiling_pdf';
  progress: number;
  currentSection?: string;
  sourcesUsed?: string[];
}
```

---

## 📋 **Implementation Roadmap**

### **Phase 1: Foundation (4-6 weeks)**
**Priority: Fix Critical Issues + Basic File Upload**

**Week 1-2: Critical Fixes**
- ✅ Fix Preview button functionality (report cards + edit page)
- ✅ Fix Export/Save button implementation
- ✅ Remove duplicate Save buttons
- ✅ Fix Suggestions button visual feedback

**Week 3-4: Basic File Upload**
- ✅ File upload interface with drag-drop
- ✅ Basic file storage and metadata
- ✅ Simple file management panel
- ✅ File preview capabilities

**Week 5-6: Enhanced Monaco**
- ✅ LaTeX autocomplete and snippets
- ✅ Custom LaTeX themes
- ✅ Real-time validation
- ✅ Source panel integration

**Deliverable**: Functional file upload with improved editor

### **Phase 2: Direct LaTeX Generation (6-8 weeks)**
**Priority: Replace Markdown Pipeline**

**Week 1-3: AI Agent Redesign**
- ✅ Redesign Research Agent for LaTeX output
- ✅ Create LaTeX section templates
- ✅ Implement source-aware prompts
- ✅ Remove markdown conversion layer

**Week 4-5: Citation System**
- ✅ Automatic bibliography generation
- ✅ Citation style formatting (APA, MLA, Chicago, IEEE)
- ✅ Source-to-citation mapping
- ✅ BibTeX integration

**Week 6-8: Testing & Refinement**
- ✅ End-to-end testing with various source types
- ✅ LaTeX compilation improvements
- ✅ Error handling and user feedback
- ✅ Performance optimization

**Deliverable**: Complete direct LaTeX generation pipeline

### **Phase 3: Advanced Source Management (4-6 weeks)**
**Priority: @Filename References + Smart Features**

**Week 1-2: @Filename System**
- ✅ Autocomplete implementation
- ✅ Source reference parsing
- ✅ Context-aware suggestions
- ✅ Multiple file referencing

**Week 3-4: Advanced Processing**
- ✅ OCR for images
- ✅ PDF text extraction
- ✅ Metadata extraction
- ✅ Content summarization

**Week 5-6: Smart Features**
- ✅ Source relevance scoring
- ✅ Usage analytics
- ✅ Smart citations
- ✅ Cross-referencing

**Deliverable**: Advanced source-aware report generation

### **Phase 4: Polish & Production (2-4 weeks)**
**Priority: Performance + User Experience**

**Week 1-2: Performance**
- ✅ File processing optimization
- ✅ Large file handling
- ✅ Background processing
- ✅ Caching strategies

**Week 3-4: UX Polish**
- ✅ Error handling improvements
- ✅ Loading states
- ✅ User feedback
- ✅ Documentation

**Deliverable**: Production-ready system

---

## 📊 **Success Metrics & KPIs**

### **Technical Performance**
- **File Upload Success Rate**: >99%
- **PDF Generation Success Rate**: >95%
- **Average Generation Time**: <3 minutes
- **File Processing Time**: <30 seconds for typical documents
- **LaTeX Compilation Success**: >98%

### **User Experience**
- **Source Reference Accuracy**: AI correctly uses @filename references >90%
- **Citation Quality**: Proper citation formatting >95%
- **User Task Completion**: Complete report generation >90%
- **Error Recovery**: Users can fix issues >85%

### **Content Quality**
- **Source Integration**: Generated content references uploaded sources >80%
- **LaTeX Validity**: Generated LaTeX compiles without errors >95%
- **Citation Accuracy**: Citations match source metadata >90%
- **Document Structure**: Proper section hierarchy >95%

### **System Reliability**
- **Uptime**: >99.5%
- **Data Loss**: <0.1%
- **File Corruption**: <0.01%
- **Processing Failures**: <5%

---

## 🔒 **Technical Considerations**

### **File Security**
- **File Scanning**: Virus and malware detection
- **Content Validation**: File type verification
- **Size Limits**: 50MB per file, 500MB per project
- **Storage Encryption**: Files encrypted at rest
- **Access Control**: User-owned files only

### **Performance Optimization**
- **Lazy Loading**: Load sources on demand
- **Background Processing**: Async file analysis
- **Caching**: Source analysis and AI results
- **Compression**: Optimize file storage
- **CDN**: Fast file delivery

### **Error Handling**
- **Graceful Degradation**: System works with partial data
- **User Feedback**: Clear error messages and recovery steps
- **Retry Logic**: Automatic retry for transient failures
- **Fallback Options**: Alternative processing methods

---

## 🎯 **Conclusion**

This PRD outlines the transformation of the Research Agent from a markdown-based system to a sophisticated, source-aware LaTeX report generation platform. The focus on **direct LaTeX generation** and **intelligent source management** addresses the core architectural issues while providing significant value to users.

**Key Success Factors:**
1. **Eliminate conversion layers** - Direct AI-to-LaTeX generation
2. **Source-first workflow** - Everything revolves around user uploads
3. **Professional output** - Publication-ready LaTeX and PDFs
4. **Intuitive editing** - Enhanced Monaco with LaTeX intelligence

The roadmap prioritizes **fixing critical issues first**, then **building the file upload foundation**, followed by **implementing direct LaTeX generation**, and finally **adding advanced source management features**.

This approach ensures we deliver a working, valuable system incrementally while building toward the full vision of AI-powered academic writing with comprehensive source management.