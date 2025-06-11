import { BaseAgent, AgentConfig, AgentMemoryManager } from './base';
import { AgentType } from '../shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { latexCompiler } from '../services/latexCompiler';

export interface CompilationAttempt {
  attempt: number;
  latexContent: string;
  success: boolean;
  errors: LaTeXError[];
  warnings: string[];
  output?: Buffer | undefined;
  log: string;
  fixesApplied: string[];
  processingTime: number;
}

export interface LaTeXError {
  type: 'ERROR' | 'WARNING' | 'INFO';
  line?: number | undefined;
  message: string;
  context?: string | undefined;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  fixable: boolean;
  suggestedFix?: string | undefined;
}

export interface CompilationAgentInput {
  latexDocument: string;
  filename: string;
  outputDir: string;
  maxAttempts?: number;
  enableAIFixes?: boolean;
  strictMode?: boolean;
}

export interface CompilationAgentOutput {
  success: boolean;
  finalDocument: string;
  pdfPath?: string | undefined;
  attempts: CompilationAttempt[];
  totalAttempts: number;
  finalErrors: LaTeXError[];
  metadata: {
    totalProcessingTime: number;
    autoFixesApplied: number;
    manualFixesNeeded: string[];
    qualityScore: number;
  };
}

export class CompilationAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private memory: AgentMemoryManager;

  constructor(websocket?: any) {
    const config: AgentConfig = {
      name: 'Compilation Agent',
      type: AgentType.RESEARCH,
      description: 'Handles LaTeX compilation with automatic error detection and fixing',
      tools: [],
      maxIterations: 10,
      timeout: 300000 // 5 minutes
    };

    super(config, websocket);
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.memory = new AgentMemoryManager();
  }

  public getName(): string {
    return this.config.name;
  }

  public getDescription(): string {
    return this.config.description;
  }

  public async execute(input: CompilationAgentInput): Promise<CompilationAgentOutput> {
    const startTime = Date.now();
    this.logger.info(`Starting LaTeX compilation for: ${input.filename}`);

    const maxAttempts = input.maxAttempts || 5;
    const attempts: CompilationAttempt[] = [];
    let currentDocument = input.latexDocument;
    let success = false;
    let finalPdfPath: string | undefined;

    try {
      this.updateProgress(10, 'Starting LaTeX compilation');

      for (let attemptNum = 1; attemptNum <= maxAttempts && !success; attemptNum++) {
        this.updateProgress(
          10 + (attemptNum / maxAttempts) * 80,
          `Compilation attempt ${attemptNum}/${maxAttempts}`
        );

        const attempt = await this.attemptCompilation(
          currentDocument,
          input.filename,
          input.outputDir,
          attemptNum
        );

        attempts.push(attempt);

        if (attempt.success) {
          success = true;
          finalPdfPath = `${input.outputDir}/${input.filename}.pdf`;
          this.logger.info(`Compilation successful on attempt ${attemptNum}`);
          break;
        }

        // If compilation failed and we have more attempts, try to fix errors
        if (attemptNum < maxAttempts && input.enableAIFixes !== false) {
          this.updateProgress(
            10 + (attemptNum / maxAttempts) * 80 + 5,
            `Analyzing errors and applying fixes (attempt ${attemptNum})`
          );

          const fixedDocument = await this.applyAutomaticFixes(
            currentDocument,
            attempt.errors,
            attemptNum
          );

          if (fixedDocument !== currentDocument) {
            currentDocument = fixedDocument;
            this.logger.info(`Applied automatic fixes for attempt ${attemptNum + 1}`);
          } else {
            this.logger.warn(`No fixes could be applied for attempt ${attemptNum}`);
          }
        }
      }

      this.updateProgress(95, 'Finalizing compilation results');

      const result = await this.finalizeResults(
        input,
        attempts,
        currentDocument,
        success,
        finalPdfPath,
        Date.now() - startTime
      );

      this.updateProgress(100, success ? 'Compilation completed successfully' : 'Compilation failed');

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Compilation process failed:', error);

      if (this.websocket && this.sessionId) {
        this.websocket.sendError(this.sessionId, {
          message: errorMessage,
          step: 'Compilation Agent'
        });
      }

      // Return partial results even on failure
      return {
        success: false,
        finalDocument: currentDocument,
        attempts,
        totalAttempts: attempts.length,
        finalErrors: attempts[attempts.length - 1]?.errors || [],
        metadata: {
          totalProcessingTime: processingTime,
          autoFixesApplied: 0,
          manualFixesNeeded: [errorMessage],
          qualityScore: 0
        }
      };
    }
  }

  private async attemptCompilation(
    latexContent: string,
    filename: string,
    outputDir: string,
    attemptNumber: number
  ): Promise<CompilationAttempt> {
    const startTime = Date.now();

    try {
      this.logger.info(`Compilation attempt ${attemptNumber} for ${filename}`);

      // Use the LaTeX compiler service
      const result = await latexCompiler.compileDocument(latexContent, filename, outputDir);

      // Log detailed compilation results
      this.logger.info(`Compilation result: success=${result.success}, attempts=${result.attempts}`);
      if (result.error) {
        this.logger.error(`LaTeX compilation error: ${result.error}`);
      }
      if (result.log) {
        this.logger.info(`LaTeX compilation log:\n${result.log}`);
      }

      // Parse errors from compilation log
      const errors = this.parseCompilationErrors(result.log || '');
      if (errors.length > 0) {
        this.logger.error(`Parsed ${errors.length} errors from compilation log:`);
        errors.forEach((error, index) => {
          this.logger.error(`  Error ${index + 1}: ${error.message} (Line: ${error.line || 'unknown'})`);
        });
      }

      const attempt: CompilationAttempt = {
        attempt: attemptNumber,
        latexContent,
        success: result.success,
        errors,
        warnings: this.parseWarnings(result.log || ''),
        output: result.output,
        log: result.log || '',
        fixesApplied: [],
        processingTime: Date.now() - startTime
      };

      return attempt;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown compilation error';
      
      return {
        attempt: attemptNumber,
        latexContent,
        success: false,
        errors: [{
          type: 'ERROR',
          line: undefined,
          message: errorMessage,
          context: undefined,
          severity: 'CRITICAL',
          fixable: false,
          suggestedFix: undefined
        }],
        warnings: [],
        log: errorMessage,
        fixesApplied: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  private parseCompilationErrors(log: string): LaTeXError[] {
    const errors: LaTeXError[] = [];
    const lines = log.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse different types of LaTeX errors
      if (line.includes('! ')) {
        // Standard LaTeX error
        const errorMatch = line.match(/! (.+)/);
        if (errorMatch) {
          const lineMatch = line.match(/l\.(\d+)/);
          const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined;

          const errorMessage = errorMatch[1];
          const severity = this.classifyErrorSeverity(errorMessage);
          const fixable = this.isErrorFixable(errorMessage);

          this.logger.info(`Parsed LaTeX error: "${errorMessage}" (severity: ${severity}, fixable: ${fixable}, line: ${lineNumber || 'unknown'})`);

          errors.push({
            type: 'ERROR',
            line: lineNumber,
            message: errorMessage,
            context: lines[i + 1] || undefined,
            severity,
            fixable,
            suggestedFix: undefined
          });
        }
      } else if (line.includes('LaTeX Warning:')) {
        // LaTeX warning
        const warningMatch = line.match(/LaTeX Warning: (.+)/);
        if (warningMatch) {
          errors.push({
            type: 'WARNING',
            line: undefined,
            message: warningMatch[1],
            context: undefined,
            severity: 'LOW',
            fixable: true,
            suggestedFix: undefined
          });
        }
      } else if (line.includes('Package') && line.includes('Error:')) {
        // Package error
        const packageErrorMatch = line.match(/Package (.+) Error: (.+)/);
        if (packageErrorMatch) {
          errors.push({
            type: 'ERROR',
            line: undefined,
            message: `Package ${packageErrorMatch[1]}: ${packageErrorMatch[2]}`,
            context: undefined,
            severity: 'HIGH',
            fixable: this.isPackageErrorFixable(packageErrorMatch[1]),
            suggestedFix: undefined
          });
        }
      }
    }

    return errors;
  }

  private parseWarnings(log: string): string[] {
    const warnings: string[] = [];
    const lines = log.split('\n');

    lines.forEach(line => {
      if (line.includes('Warning:') && !line.includes('LaTeX Warning:')) {
        warnings.push(line.trim());
      }
    });

    return warnings;
  }

  private classifyErrorSeverity(errorMessage: string): LaTeXError['severity'] {
    const criticalPatterns = [
      'File ended while scanning',
      'Emergency stop',
      'Fatal error',
      'Undefined control sequence'
    ];

    const highPatterns = [
      'Missing',
      'Undefined',
      'Not found',
      'Invalid',
      'can be used only in preamble',
      'file.*not found.*\\.png',
      'file.*not found.*\\.jpg',
      'file.*not found.*\\.jpeg',
      'file.*not found.*\\.pdf'
    ];

    const lowMessage = errorMessage.toLowerCase();

    if (criticalPatterns.some(pattern => lowMessage.includes(pattern.toLowerCase()))) {
      return 'CRITICAL';
    }

    if (highPatterns.some(pattern => lowMessage.includes(pattern.toLowerCase()))) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  private isErrorFixable(errorMessage: string): boolean {
    const fixablePatterns = [
      'Undefined control sequence',
      'Missing',
      'Package',
      'File not found',
      'Overfull',
      'Underfull',
      'can be used only in preamble',
      'file.*not found.*\\.png',
      'file.*not found.*\\.jpg',
      'file.*not found.*\\.jpeg',
      'file.*not found.*\\.pdf'
    ];

    const unfixablePatterns = [
      'Emergency stop',
      'Fatal error',
      'File ended while scanning'
    ];

    const lowMessage = errorMessage.toLowerCase();

    if (unfixablePatterns.some(pattern => lowMessage.includes(pattern.toLowerCase()))) {
      return false;
    }

    return fixablePatterns.some(pattern => lowMessage.includes(pattern.toLowerCase()));
  }

  private isPackageErrorFixable(packageName: string): boolean {
    // Most package errors are fixable by adding usepackage or adjusting syntax
    const unfixablePackages = ['fontspec', 'xetex', 'luatex'];
    return !unfixablePackages.includes(packageName.toLowerCase());
  }

  private async applyAutomaticFixes(
    latexContent: string,
    errors: LaTeXError[],
    attemptNumber: number
  ): Promise<string> {
    this.logger.info(`Applying AI-based fixes for ${errors.length} total errors on attempt ${attemptNumber}`);
    
    // Log each error for debugging
    errors.forEach((error, index) => {
      this.logger.info(`Error ${index + 1}: "${error.message}" (severity: ${error.severity}, fixable: ${error.fixable}, line: ${error.line || 'unknown'})`);
    });

    // Filter for fixable errors
    const fixableErrors = errors.filter(e => e.fixable);
    this.logger.info(`Found ${fixableErrors.length} fixable errors to send to LLM`);

    if (fixableErrors.length === 0) {
      this.logger.info('No fixable errors found, returning original content');
      return latexContent;
    }

    // Apply AI-based fixes for all fixable errors
    try {
      this.logger.info(`Sending ${fixableErrors.length} errors to AI for fixing (attempt ${attemptNumber})`);
      const aiFix = await this.applyAIBasedFix(latexContent, fixableErrors);
      
      if (aiFix.content !== latexContent) {
        this.logger.info(`AI successfully applied ${aiFix.appliedFixes.length} fixes to LaTeX document`);
        return aiFix.content;
      } else {
        this.logger.warn('AI did not modify the LaTeX document');
        return latexContent;
      }
    } catch (aiError) {
      this.logger.error('AI-based fix failed:', aiError);
      return latexContent;
    }
  }

  private async applyAIBasedFix(content: string, errors: LaTeXError[]): Promise<{ content: string; appliedFixes: string[] }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const errorDescriptions = errors.map(e => `- ${e.message} (Line: ${e.line || 'unknown'})`).join('\n');

    const prompt = `
You are a LaTeX expert. Fix ALL compilation errors in this document for Alpine Linux texlive.

COMPILATION ERRORS TO FIX:
${errorDescriptions}

LATEX DOCUMENT:
${content}

COMPREHENSIVE FIXING RULES:

1. PACKAGE MANAGEMENT:
   - REMOVE unavailable packages: hyperref, booktabs, listings, setspace, infwarerr, kvoptions, natbib, biblatex, xcolor, tikz, pgfplots, fontspec, microtype
   - ONLY use these safe packages: inputenc, fontenc, babel, amsmath, amssymb, amsfonts, graphicx, geometry, url, cite, enumitem, array, longtable, caption, float, fancyhdr

2. COMMAND SUBSTITUTIONS:
   - Replace \\lstlisting with \\begin{verbatim}...\\end{verbatim}
   - Replace \\toprule, \\midrule, \\bottomrule with \\hline
   - Replace \\href{url}{text} with "text (\\url{url})"
   - Remove \\setstretch, \\singlespacing, \\doublespacing commands
   - Replace \\textcolor{color}{text} with just text
   - Remove \\hypersetup{} commands

3. SPECIAL CHARACTER ESCAPING:
   - Fix ALL unescaped special characters: # & % $ _ ^
   - Examples: C# → C\\#, F# → F\\#, R&D → R\\&D, 95% → 95\\%, user_id → user\\_id, E=mc^2 → E=mc\\^2
   - Be especially careful with programming languages, chemical formulas, and technical terms

4. SYNTAX FIXES:
   - Fix missing closing braces }
   - Fix missing math mode delimiters $
   - Remove duplicate \\documentclass declarations
   - Fix malformed commands and environments
   - Ensure proper nesting of environments

5. IMAGE HANDLING:
   - Remove \\includegraphics commands for missing image files
   - Remove empty figure environments
   - Comment out problematic graphics

6. STRUCTURE INTEGRITY:
   - DO NOT add extra \\documentclass
   - DO NOT modify the document structure
   - ONLY fix the specific errors
   - Keep existing preamble intact

ANALYZE each error message carefully and apply the appropriate fix. Return ONLY the corrected LaTeX document with NO explanations or markdown formatting.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Clean up AI response
      let fixedContent = response
        .replace(/```latex\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Validate that the response is actually LaTeX
      if (!fixedContent.includes('\\documentclass') || !fixedContent.includes('\\begin{document}')) {
        throw new Error('AI response does not contain valid LaTeX structure');
      }

      // Check for duplicate \documentclass declarations (common AI error)
      const documentclassMatches = fixedContent.match(/\\documentclass/g);
      if (documentclassMatches && documentclassMatches.length > 1) {
        this.logger.warn('AI generated multiple \\documentclass declarations, fixing...');
        
        // Keep only the first \documentclass and remove subsequent ones
        const lines = fixedContent.split('\n');
        let foundFirstDocumentclass = false;
        const cleanedLines = lines.filter(line => {
          if (line.includes('\\documentclass')) {
            if (foundFirstDocumentclass) {
              return false; // Remove subsequent \documentclass lines
            } else {
              foundFirstDocumentclass = true;
              return true; // Keep the first one
            }
          }
          return true;
        });
        
        fixedContent = cleanedLines.join('\n');
      }

      return {
        content: fixedContent,
        appliedFixes: ['AI-based error correction']
      };

    } catch (error) {
      this.logger.warn('AI-based fix failed:', error);
      return {
        content,
        appliedFixes: []
      };
    }
  }

  private async finalizeResults(
    _input: CompilationAgentInput,
    attempts: CompilationAttempt[],
    finalDocument: string,
    success: boolean,
    pdfPath: string | undefined,
    totalProcessingTime: number
  ): Promise<CompilationAgentOutput> {

    const autoFixesApplied = attempts.reduce((acc, attempt) => acc + attempt.fixesApplied.length, 0);
    const finalErrors = attempts[attempts.length - 1]?.errors || [];
    const manualFixesNeeded = finalErrors
      .filter(e => !e.fixable && e.severity !== 'LOW')
      .map(e => e.message);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(attempts, success, autoFixesApplied);

    return {
      success,
      finalDocument,
      pdfPath,
      attempts,
      totalAttempts: attempts.length,
      finalErrors,
      metadata: {
        totalProcessingTime,
        autoFixesApplied,
        manualFixesNeeded,
        qualityScore
      }
    };
  }

  private calculateQualityScore(attempts: CompilationAttempt[], success: boolean, autoFixesApplied: number): number {
    let score = 0;

    // Base score for success
    if (success) score += 0.6;

    // Penalty for multiple attempts
    score -= (attempts.length - 1) * 0.1;

    // Bonus for fewer fixes needed
    score += Math.max(0, 0.3 - autoFixesApplied * 0.05);

    // Bonus for first-attempt success
    if (success && attempts.length === 1) score += 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private updateProgress(progress: number, message: string): void {
    if (this.websocket && this.sessionId) {
      this.websocket.sendProgressUpdate(this.sessionId, {
        sessionId: this.sessionId,
        progress,
        currentStep: message,
        message
      });
    }
  }

  // Memory management
  public exportMemory(): any {
    return this.memory.exportMemory();
  }

  public importMemory(data: any): void {
    this.memory.importMemory(data);
  }
}