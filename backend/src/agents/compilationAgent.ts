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
    let fixedContent = latexContent;
    const appliedFixes: string[] = [];

    this.logger.info(`Applying automatic fixes for ${errors.length} total errors on attempt ${attemptNumber}`);
    
    // Log each error for debugging
    errors.forEach((error, index) => {
      this.logger.info(`Error ${index + 1}: "${error.message}" (severity: ${error.severity}, fixable: ${error.fixable}, line: ${error.line || 'unknown'})`);
    });

    // Apply rule-based fixes first
    const fixableErrors = errors.filter(e => e.fixable && e.severity !== 'LOW');
    this.logger.info(`Found ${fixableErrors.length} fixable errors with severity !== 'LOW'`);
    
    for (const error of fixableErrors) {
      const ruleBasedFix = this.applyRuleBasedFix(fixedContent, error);
      if (ruleBasedFix.fixed && ruleBasedFix.content !== fixedContent) {
        fixedContent = ruleBasedFix.content;
        appliedFixes.push(ruleBasedFix.description);
      }
    }

    // Apply AI-based fixes if rule-based fixes didn't work or for complex errors
    const remainingErrors = errors.filter(e => 
      e.fixable && 
      (e.severity === 'HIGH' || e.severity === 'CRITICAL')
    );

    // Use AI if we have serious errors and either no rule fixes applied or it's early attempt
    if (remainingErrors.length > 0 && attemptNumber <= 3) {
      this.logger.info(`Attempting AI-based fix for ${remainingErrors.length} errors (attempt ${attemptNumber})`);
      try {
        const aiFix = await this.applyAIBasedFix(fixedContent, remainingErrors);
        if (aiFix.content !== fixedContent) {
          fixedContent = aiFix.content;
          appliedFixes.push(...aiFix.appliedFixes);
          this.logger.info('AI successfully applied fixes to LaTeX document');
        } else {
          this.logger.warn('AI did not modify the LaTeX document');
        }
      } catch (aiError) {
        this.logger.error('AI-based fix failed:', aiError);
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
    this.logger.info(`Attempting rule-based fix for error: "${error.message}" (severity: ${error.severity})`);

    // Missing image file fixes
    if (errorMessage.includes('file') && errorMessage.includes('not found') && (errorMessage.includes('.png') || errorMessage.includes('.jpg') || errorMessage.includes('.jpeg') || errorMessage.includes('.pdf'))) {
      this.logger.info('Detected missing image file, removing includegraphics commands...');
      
      // Extract the filename from the error message
      const filenameMatch = errorMessage.match(/file `([^']+)' not found/i) || errorMessage.match(/`([^`]+\.(png|jpg|jpeg|pdf))/i);
      
      if (filenameMatch) {
        const filename = filenameMatch[1];
        this.logger.info(`Removing references to missing image: ${filename}`);
        
        // Remove includegraphics commands that reference this file
        const imageRegex = new RegExp(`\\\\includegraphics(?:\\[.*?\\])?\\{[^}]*${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*\\}`, 'g');
        fixedContent = content.replace(imageRegex, '% Image removed: missing file');
        
        // Also remove figure environments that only contain this image
        const figureRegex = new RegExp(`\\\\begin\\{figure\\}[^]*?\\\\includegraphics(?:\\[.*?\\])?\\{[^}]*${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*\\}[^]*?\\\\end\\{figure\\}`, 'g');
        fixedContent = fixedContent.replace(figureRegex, '% Figure with missing image removed');
        
        if (fixedContent !== content) {
          description = `Removed references to missing image file: ${filename}`;
          fixed = true;
        }
      }
    }
    
    // Missing package fixes - handle both undefined commands and missing .sty files
    else if (errorMessage.includes('undefined control sequence') || errorMessage.includes('file') && errorMessage.includes('.sty') && errorMessage.includes('not found')) {
      
      // Handle missing .sty files specifically
      const styMatch = error.message.match(/File `(.+?)\.sty' not found/);
      if (styMatch) {
        const missingPackage = styMatch[1];
        this.logger.info(`Attempting to fix missing package: ${missingPackage}`);
        
        // Check if we can remove this package safely
        const packageRemoval = this.shouldRemovePackage(missingPackage);
        if (packageRemoval.remove) {
          // Remove the problematic usepackage line
          const packageRegex = new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{${missingPackage}\\}\\s*`, 'g');
          fixedContent = fixedContent.replace(packageRegex, '');
          description = `Removed unavailable package: ${missingPackage} - ${packageRemoval.reason}`;
          fixed = true;
        } else {
          // Try to substitute with alternative package
          const alternative = this.getPackageAlternative(missingPackage);
          if (alternative) {
            const packageRegex = new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{${missingPackage}\\}`, 'g');
            fixedContent = fixedContent.replace(packageRegex, `\\usepackage{${alternative}}`);
            description = `Replaced package ${missingPackage} with ${alternative}`;
            fixed = true;
          }
        }
      }
      
      // Handle undefined control sequences
      const commandMatch = error.message.match(/\\(\w+)/);
      if (commandMatch && !fixed) {
        const command = commandMatch[1];
        
        // Special handling for lstlisting environment
        if (command === 'lstlisting' || command === 'begin' && content.includes('lstlisting')) {
          fixedContent = fixedContent.replace(/\\begin\{lstlisting\}.*?\\end\{lstlisting\}/gs, (match) => {
            const codeContent = match.replace(/\\begin\{lstlisting\}[^\n]*\n/, '').replace(/\n\\end\{lstlisting\}/, '');
            return `\\begin{verbatim}\n${codeContent}\n\\end{verbatim}`;
          });
          description = 'Replaced lstlisting environment with verbatim';
          fixed = true;
        } else {
          // Check for commands that need unavailable packages and substitute them
          const substitution = this.getCommandSubstitution(command);
          if (substitution) {
            fixedContent = fixedContent.replace(new RegExp(`\\\\${command}\\b`, 'g'), substitution);
            description = `Substituted unavailable command \\${command} with ${substitution}`;
            fixed = true;
          } else {
            // Try to add package if available
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
      }
    }

    // Preamble errors - multiple \documentclass
    if (errorMessage.includes('can be used only in preamble')) {
      this.logger.info('Detected preamble error, checking for duplicate \\documentclass declarations');
      const documentclassMatches = content.match(/\\documentclass/g);
      this.logger.info(`Found ${documentclassMatches?.length || 0} \\documentclass occurrences in content`);
      
      if (documentclassMatches && documentclassMatches.length > 1) {
        this.logger.info('Multiple \\documentclass found, removing duplicates...');
        // Remove duplicate \documentclass declarations
        const lines = content.split('\n');
        let foundFirstDocumentclass = false;
        const cleanedLines = lines.filter(line => {
          if (line.includes('\\documentclass')) {
            if (foundFirstDocumentclass) {
              this.logger.info(`Removing duplicate \\documentclass line: ${line.trim()}`);
              return false; // Remove subsequent \documentclass lines
            } else {
              this.logger.info(`Keeping first \\documentclass line: ${line.trim()}`);
              foundFirstDocumentclass = true;
              return true; // Keep the first one
            }
          }
          return true;
        });
        fixedContent = cleanedLines.join('\n');
        description = 'Removed duplicate \\documentclass declarations';
        fixed = true;
        this.logger.info('Successfully removed duplicate \\documentclass declarations');
      } else {
        this.logger.warn('Preamble error detected but no duplicate \\documentclass found');
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

  private getCommandSubstitution(command: string): string | null {
    // Map commands from unavailable packages to basic LaTeX equivalents
    const substitutionMap: { [key: string]: string } = {
      'setstretch': '', // Remove line spacing commands
      'toprule': '\\hline',
      'midrule': '\\hline', 
      'bottomrule': '\\hline',
    };

    return substitutionMap[command] || null;
  }

  private shouldRemovePackage(packageName: string): { remove: boolean; reason: string } {
    // Packages that are commonly missing in Alpine and can be safely removed
    const removablePackages: { [key: string]: string } = {
      'infwarerr': 'dependency package not available in Alpine texlive',
      'kvoptions': 'dependency package not available in Alpine texlive', 
      'ltxcmds': 'dependency package not available in Alpine texlive',
      'kvdefinekeys': 'dependency package not available in Alpine texlive',
      'kvsetkeys': 'dependency package not available in Alpine texlive',
      'etexcmds': 'dependency package not available in Alpine texlive',
      'letltxmacro': 'dependency package not available in Alpine texlive',
      'pdftexcmds': 'dependency package not available in Alpine texlive',
      'auxhook': 'dependency package not available in Alpine texlive',
      'nameref': 'dependency package not available in Alpine texlive',
      'refcount': 'dependency package not available in Alpine texlive',
      'gettitlestring': 'dependency package not available in Alpine texlive'
    };

    if (removablePackages[packageName]) {
      return { remove: true, reason: removablePackages[packageName] };
    }

    return { remove: false, reason: 'Package may be needed' };
  }

  private getPackageAlternative(packageName: string): string | null {
    // Map problematic packages to available alternatives
    const alternatives: { [key: string]: string } = {
      'hyperref': '', // Remove hyperref entirely since it has too many dependencies
      'natbib': '', // Remove natbib, use basic citations
      'booktabs': '', // Remove booktabs, use basic tables
      'listings': '' // Remove listings, use verbatim
    };

    return alternatives[packageName] || null;
  }

  private async applyAIBasedFix(content: string, errors: LaTeXError[]): Promise<{ content: string; appliedFixes: string[] }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const errorDescriptions = errors.map(e => `- ${e.message} (Line: ${e.line || 'unknown'})`).join('\n');

    const prompt = `
Fix the following LaTeX compilation errors in this document for Alpine Linux texlive (limited package availability).

Errors to fix:
${errorDescriptions}

LaTeX document:
${content}

IMPORTANT RULES for Alpine Linux compatibility:
1. REMOVE these packages if present: hyperref, booktabs, listings, setspace, infwarerr, kvoptions, natbib
2. Replace \\lstlisting with \\begin{verbatim}...\\end{verbatim}
3. Replace \\toprule, \\midrule, \\bottomrule with \\hline
4. Replace \\href{url}{text} with text (\\url{url})
5. Only use basic packages: inputenc, fontenc, babel, amsmath, amssymb, amsfonts, graphicx, geometry, url
6. Remove \\setstretch commands (not available)
7. Fix syntax errors and brace mismatches

CRITICAL: 
- DO NOT add additional \\documentclass declarations
- DO NOT create new document structure 
- ONLY fix the errors in the existing document
- Keep the existing preamble and document structure intact

Return ONLY the complete corrected LaTeX document, no explanations or markdown formatting.
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