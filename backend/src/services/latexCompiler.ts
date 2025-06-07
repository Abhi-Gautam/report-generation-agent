import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

const execAsync = promisify(exec);

interface CompilationResult {
  success: boolean;
  output?: Buffer;
  error?: string;
  log?: string;
  attempts: number;
}

interface LaTeXError {
  pattern: RegExp;
  fix: string;
  description: string;
}

export class LaTeXCompiler {
  private tempDir: string;
  private maxRetries = 3;
  
  // Common LaTeX error patterns and their fixes
  private errorPatterns: LaTeXError[] = [
    {
      pattern: /! LaTeX Error: File `(.+?)' not found\./,
      fix: 'usepackage',
      description: 'Missing package'
    },
    {
      pattern: /! Undefined control sequence\.\s*l\.\d+\s+\\(\w+)/,
      fix: 'usepackage',
      description: 'Undefined command'
    },
    {
      pattern: /! Package babel Error: Unknown option `(.+?)'/,
      fix: 'babel',
      description: 'Babel language option'
    },
    {
      pattern: /! LaTeX Error: Option clash for package/,
      fix: 'package-conflict',
      description: 'Package option conflict'
    },
    {
      pattern: /! LaTeX Error: Environment (.+?) undefined/,
      fix: 'environment',
      description: 'Undefined environment'
    }
  ];

  // Common package mappings for missing commands
  private packageMappings: Record<string, string> = {
    'includegraphics': 'graphicx',
    'color': 'xcolor',
    'textcolor': 'xcolor',
    'colorbox': 'xcolor',
    'href': 'hyperref',
    'url': 'url',
    'cite': 'natbib',
    'citet': 'natbib',
    'citep': 'natbib',
    'begin{table}': 'array,booktabs',
    'begin{figure}': 'graphicx',
    'begin{lstlisting}': 'listings',
    'begin{minted}': 'minted',
    'begin{algorithm}': 'algorithm,algorithmic',
    'mathbb': 'amsfonts,amssymb',
    'mathcal': 'amsfonts',
    'boldsymbol': 'amsmath',
    'text': 'amsmath',
    'dfrac': 'amsmath',
    'tikz': 'tikz',
    'pgfplots': 'pgfplots'
  };

  constructor(tempDir = '/tmp') {
    this.tempDir = tempDir;
  }

  async compileDocument(
    texContent: string,
    filename = 'document',
    workingDir?: string
  ): Promise<CompilationResult> {
    const targetDir = workingDir || path.join(this.tempDir, `latex_${Date.now()}`);
    
    let attempts = 0;
    
    try {
      // Create working directory
      await fs.mkdir(targetDir, { recursive: true });
      
      let content = texContent;
      
      while (attempts < this.maxRetries) {
        attempts++;
        logger.info(`LaTeX compilation attempt ${attempts} for ${filename}`);
        
        const texFile = path.join(targetDir, `${filename}.tex`);
        await fs.writeFile(texFile, content);
        
        try {
          // First pass with pdflatex - use absolute paths to avoid cd issues
          const { stdout } = await execAsync(
            `pdflatex -interaction=nonstopmode -halt-on-error -output-directory="${targetDir}" "${texFile}"`,
            { timeout: 30000 }
          );
          
          // Check if PDF was created successfully
          const pdfPath = path.join(targetDir, `${filename}.pdf`);
          try {
            const pdfBuffer = await fs.readFile(pdfPath);
            
            // Cleanup temp files
            await this.cleanupTempFiles(targetDir, filename);
            
            return {
              success: true,
              output: pdfBuffer,
              log: stdout,
              attempts
            };
          } catch (pdfError) {
            logger.warn(`PDF not created on attempt ${attempts}:`, pdfError);
          }
          
        } catch (compilationError: any) {
          logger.warn(`Compilation error on attempt ${attempts}:`, compilationError.stderr);
          
          if (attempts === this.maxRetries) {
            return {
              success: false,
              error: compilationError.stderr || compilationError.message,
              log: compilationError.stdout,
              attempts
            };
          }
          
          // Try to fix the error
          const fixedContent = await this.autoFixErrors(content, compilationError.stderr);
          if (fixedContent === content) {
            // No fix applied, break the loop
            return {
              success: false,
              error: compilationError.stderr || compilationError.message,
              log: compilationError.stdout,
              attempts
            };
          }
          content = fixedContent;
        }
      }
      
      return {
        success: false,
        error: 'Maximum retry attempts reached',
        attempts: this.maxRetries
      };
      
    } catch (error: any) {
      logger.error('LaTeX compilation failed:', error);
      return {
        success: false,
        error: error.message,
        attempts: attempts
      };
    } finally {
      // Cleanup if no working directory was provided
      if (!workingDir) {
        try {
          await fs.rmdir(targetDir, { recursive: true });
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp directory:', cleanupError);
        }
      }
    }
  }

  private async autoFixErrors(content: string, errorLog: string): Promise<string> {
    let fixedContent = content;
    
    for (const errorPattern of this.errorPatterns) {
      const match = errorLog.match(errorPattern.pattern);
      if (match) {
        logger.info(`Applying fix for: ${errorPattern.description}`);
        
        switch (errorPattern.fix) {
          case 'usepackage':
            fixedContent = this.addMissingPackage(fixedContent, match[1]);
            break;
          case 'babel':
            fixedContent = this.fixBabelError(fixedContent, match[1]);
            break;
          case 'package-conflict':
            fixedContent = this.resolvePackageConflict(fixedContent);
            break;
          case 'environment':
            fixedContent = this.addEnvironmentPackage(fixedContent, match[1]);
            break;
        }
      }
    }
    
    // Check for missing commands and add appropriate packages
    fixedContent = this.addMissingCommandPackages(fixedContent, errorLog);
    
    return fixedContent;
  }

  private addMissingPackage(content: string, packageOrCommand: string): string {
    // Check if it's a command that needs a specific package
    const packageName = this.packageMappings[packageOrCommand] || packageOrCommand;
    
    // Check if package is already included
    const packageRegex = new RegExp(`\\\\usepackage(?:\\[.*?\\])?\\{${packageName.split(',')[0]}\\}`);
    if (packageRegex.test(content)) {
      return content;
    }
    
    // Add package after documentclass
    const documentClassMatch = content.match(/\\documentclass(?:\[.*?\])?\{.*?\}/);
    if (documentClassMatch) {
      const insertPoint = documentClassMatch.index! + documentClassMatch[0].length;
      const packagesToAdd = packageName.split(',');
      let packages = '';
      
      packagesToAdd.forEach(pkg => {
        packages += `\n\\usepackage{${pkg.trim()}}`;
      });
      
      return content.slice(0, insertPoint) + packages + content.slice(insertPoint);
    }
    
    return content;
  }

  private fixBabelError(content: string, language: string): string {
    // Replace invalid babel option
    const languageMap: Record<string, string> = {
      'english': 'english',
      'en': 'english',
      'german': 'ngerman',
      'de': 'ngerman',
      'french': 'french',
      'fr': 'french',
      'spanish': 'spanish',
      'es': 'spanish'
    };
    
    const mappedLanguage = languageMap[language] || 'english';
    return content.replace(
      /\\usepackage\[.*?\]\{babel\}/,
      `\\usepackage[${mappedLanguage}]{babel}`
    );
  }

  private resolvePackageConflict(content: string): string {
    // Remove duplicate package declarations
    const lines = content.split('\n');
    const seenPackages = new Set();
    const filteredLines: string[] = [];
    
    for (const line of lines) {
      const packageMatch = line.match(/\\usepackage(?:\[.*?\])?\{(.+?)\}/);
      if (packageMatch) {
        const packageName = packageMatch[1];
        if (!seenPackages.has(packageName)) {
          seenPackages.add(packageName);
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n');
  }

  private addEnvironmentPackage(content: string, environment: string): string {
    const environmentPackages: Record<string, string> = {
      'lstlisting': 'listings',
      'minted': 'minted',
      'algorithm': 'algorithm,algorithmic',
      'align': 'amsmath',
      'equation': 'amsmath',
      'matrix': 'amsmath',
      'tikzpicture': 'tikz',
      'tabular': 'array',
      'longtable': 'longtable',
      'multicol': 'multicol'
    };
    
    const packageName = environmentPackages[environment];
    if (packageName) {
      return this.addMissingPackage(content, packageName);
    }
    
    return content;
  }

  private addMissingCommandPackages(content: string, errorLog: string): string {
    let fixedContent = content;
    
    // Look for undefined control sequence errors
    const undefinedMatches = errorLog.matchAll(/! Undefined control sequence\.\s*l\.\d+\s+\\(\w+)/g);
    
    for (const match of undefinedMatches) {
      const command = match[1];
      const packageName = this.packageMappings[command];
      if (packageName) {
        fixedContent = this.addMissingPackage(fixedContent, packageName);
      }
    }
    
    return fixedContent;
  }

  private async cleanupTempFiles(directory: string, filename: string): Promise<void> {
    const extensions = ['.aux', '.log', '.toc', '.out', '.nav', '.snm', '.vrb', '.fls', '.fdb_latexmk'];
    
    for (const ext of extensions) {
      try {
        await fs.unlink(path.join(directory, `${filename}${ext}`));
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
  }

  async createMinimalTemplate(): Promise<string> {
    return `\\documentclass[11pt,a4paper]{article}
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
\\usepackage{natbib}

\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[C]{\\thepage}

\\title{Research Report}
\\author{Generated by Research Agent}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

% Content will be inserted here

\\end{document}`;
  }
}

export const latexCompiler = new LaTeXCompiler();
