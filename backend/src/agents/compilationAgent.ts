import { BaseAgent, AgentConfig, AgentMemoryManager } from './base';
import { AgentType } from '../shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LoggerService } from '../services/logger';
import { latexCompiler } from '../services/latexCompiler';

export interface CompilationAttempt {
  attempt: number;
  latexContent: string;
  success: boolean;
  errors: LaTeXError[];
  warnings: string[];
  output?: Buffer;
  log: string;
  fixesApplied: string[];
  processingTime: number;
}

export interface LaTeXError {
  type: 'ERROR' | 'WARNING' | 'INFO';
  line?: number;
  message: string;
  context?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  fixable: boolean;
  suggestedFix?: string;
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
  pdfPath?: string;
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
  private logger: LoggerService;

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
    this.logger = new LoggerService();
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

      // Parse errors from compilation log
      const errors = this.parseCompilationErrors(result.log || '');

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
          message: errorMessage,
          severity: 'CRITICAL',
          fixable: false
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

          errors.push({
            type: 'ERROR',
            line: lineNumber,
            message: errorMatch[1],
            context: lines[i + 1] || undefined,
            severity: this.classifyErrorSeverity(errorMatch[1]),
            fixable: this.isErrorFixable(errorMatch[1])
          });
        }
      } else if (line.includes('LaTeX Warning:')) {
        // LaTeX warning
        const warningMatch = line.match(/LaTeX Warning: (.+)/);
        if (warningMatch) {
          errors.push({
            type: 'WARNING',
            message: warningMatch[1],
            severity: 'LOW',
            fixable: true
          });
        }
      } else if (line.includes('Package') && line.includes('Error:')) {
        // Package error
        const packageErrorMatch = line.match(/Package (.+) Error: (.+)/);
        if (packageErrorMatch) {
          errors.push({
            type: 'ERROR',
            message: `Package ${packageErrorMatch[1]}: ${packageErrorMatch[2]}`,
            severity: 'HIGH',
            fixable: this.isPackageErrorFixable(packageErrorMatch[1])
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
      'Invalid'
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
      'Underfull'
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
    let fixedContent = latexContent;
    const appliedFixes: string[] = [];

    // Apply rule-based fixes first
    for (const error of errors.filter(e => e.fixable && e.severity !== 'LOW')) {
      const ruleBasedFix = this.applyRuleBasedFix(fixedContent, error);
      if (ruleBasedFix.fixed && ruleBasedFix.content !== fixedContent) {
        fixedContent = ruleBasedFix.content;
        appliedFixes.push(ruleBasedFix.description);
      }
    }

    // Apply AI-based fixes for complex errors
    const complexErrors = errors.filter(e => 
      e.fixable && 
      e.severity === 'HIGH' && 
      !appliedFixes.length
    );

    if (complexErrors.length > 0 && attemptNumber <= 3) {
      try {
        const aiFix = await this.applyAIBasedFix(fixedContent, complexErrors);
        if (aiFix.content !== fixedContent) {
          fixedContent = aiFix.content;
          appliedFixes.push(...aiFix.appliedFixes);
        }
      } catch (aiError) {
        this.logger.warn('AI-based fix failed:', aiError);
      }
    }

    this.logger.info(`Applied ${appliedFixes.length} fixes: ${appliedFixes.join(', ')}`);
    return fixedContent;
  }

  private applyRuleBasedFix(content: string, error: LaTeXError): { fixed: boolean; content: string; description: string } {
    let fixedContent = content;
    let description = '';
    let fixed = false;

    const errorMessage = error.message.toLowerCase();

    // Missing package fixes
    if (errorMessage.includes('undefined control sequence')) {
      const commandMatch = error.message.match(/\\(\w+)/);
      if (commandMatch) {
        const command = commandMatch[1];
        const packageFix = this.getPackageForCommand(command);
        if (packageFix && !content.includes(`\\usepackage{${packageFix}}`)) {
          // Add package after last usepackage line
          const lastUsepackageIndex = content.lastIndexOf('\\usepackage');
          if (lastUsepackageIndex !== -1) {
            const nextLineIndex = content.indexOf('\n', lastUsepackageIndex);
            fixedContent = content.slice(0, nextLineIndex) + 
                          `\n\\usepackage{${packageFix}}` + 
                          content.slice(nextLineIndex);
            description = `Added missing package: ${packageFix}`;
            fixed = true;
          }
        }
      }
    }

    // Missing $ fixes
    if (errorMessage.includes('missing $') || errorMessage.includes('math mode')) {
      // Simple heuristic: wrap standalone equations
      fixedContent = fixedContent.replace(/([^$])(\\alpha|\\beta|\\gamma|\\sum|\\int|\\frac{[^}]+}{[^}]+})([^$])/g, '$1$$$2$$$3');
      if (fixedContent !== content) {
        description = 'Added missing math mode delimiters';
        fixed = true;
      }
    }

    // Missing } fixes
    if (errorMessage.includes('missing }')) {
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        fixedContent = content + '}'.repeat(openBraces - closeBraces);
        description = `Added ${openBraces - closeBraces} missing closing braces`;
        fixed = true;
      }
    }

    return { fixed, content: fixedContent, description };
  }

  private getPackageForCommand(command: string): string | null {
    const commandPackageMap: { [key: string]: string } = {
      'includegraphics': 'graphicx',
      'href': 'hyperref',
      'url': 'url',
      'color': 'xcolor',
      'textcolor': 'xcolor',
      'frac': 'amsmath',
      'sum': 'amsmath',
      'int': 'amsmath',
      'alpha': 'amsmath',
      'beta': 'amsmath',
      'gamma': 'amsmath',
      'cite': 'natbib',
      'citep': 'natbib',
      'citet': 'natbib',
      'lstlisting': 'listings',
      'toprule': 'booktabs',
      'midrule': 'booktabs',
      'bottomrule': 'booktabs'
    };

    return commandPackageMap[command] || null;
  }

  private async applyAIBasedFix(content: string, errors: LaTeXError[]): Promise<{ content: string; appliedFixes: string[] }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const errorDescriptions = errors.map(e => `- ${e.message} (Line: ${e.line || 'unknown'})`).join('\n');

    const prompt = `
Fix the following LaTeX compilation errors in this document. Return ONLY the corrected LaTeX code, no explanations.

Errors to fix:
${errorDescriptions}

LaTeX document:
${content}

Focus on:
1. Adding missing packages
2. Fixing syntax errors
3. Correcting brace mismatches
4. Fixing math mode issues
5. Resolving undefined commands

Return the complete corrected document.
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
    input: CompilationAgentInput,
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