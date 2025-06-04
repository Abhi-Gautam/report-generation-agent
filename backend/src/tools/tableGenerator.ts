import { Tool } from '../types/agent';

interface TableData {
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
  label?: string;
}

interface TableOptions {
  format: 'html' | 'latex';
  style?: 'simple' | 'booktabs' | 'fancy';
  alignment?: string; // e.g., 'lcc' for left, center, center
  width?: string;
  position?: string; // for LaTeX: 'h', 't', 'b', 'p'
}

export class TableGeneratorTool implements Tool {
  name = 'table_generator';
  description = 'Generate HTML or LaTeX tables from structured data';

  async execute(input: {
    data: TableData;
    options: TableOptions;
  }): Promise<{ content: string; format: string }> {
    const { data, options } = input;

    if (!data.headers || !data.rows) {
      throw new Error('Table data must include headers and rows');
    }

    if (options.format === 'latex') {
      return {
        content: this.generateLatexTable(data, options),
        format: 'latex'
      };
    } else {
      return {
        content: this.generateHtmlTable(data, options),
        format: 'html'
      };
    }
  }

  private generateLatexTable(data: TableData, options: TableOptions): string {
    const { headers, rows, caption, label } = data;
    const { style = 'booktabs', alignment, position = 'h' } = options;

    // Default alignment if not provided
    const columnAlign = alignment || 'l'.repeat(headers.length);

    let latex = '';

    // Begin table environment
    if (caption || label) {
      latex += `\\begin{table}[${position}]\n`;
      latex += '\\centering\n';
    }

    // Add caption
    if (caption) {
      latex += `\\caption{${this.escapeLatex(caption)}}\n`;
    }

    // Add label
    if (label) {
      latex += `\\label{${label}}\n`;
    }

    // Begin tabular environment
    if (style === 'booktabs') {
      latex += `\\begin{tabular}{${columnAlign}}\n`;
      latex += '\\toprule\n';
      
      // Headers
      latex += headers.map(header => this.escapeLatex(header)).join(' & ');
      latex += ' \\\\\n';
      latex += '\\midrule\n';
      
      // Rows
      rows.forEach(row => {
        latex += row.map(cell => this.escapeLatex(String(cell))).join(' & ');
        latex += ' \\\\\n';
      });
      
      latex += '\\bottomrule\n';
      latex += '\\end{tabular}\n';
    } else if (style === 'fancy') {
      latex += `\\begin{tabular}{|${columnAlign.split('').join('|')}|}\n`;
      latex += '\\hline\n';
      
      // Headers with bold formatting
      latex += headers.map(header => `\\textbf{${this.escapeLatex(header)}}`).join(' & ');
      latex += ' \\\\\n';
      latex += '\\hline\n';
      
      // Rows
      rows.forEach(row => {
        latex += row.map(cell => this.escapeLatex(String(cell))).join(' & ');
        latex += ' \\\\\n';
        latex += '\\hline\n';
      });
      
      latex += '\\end{tabular}\n';
    } else { // simple style
      latex += `\\begin{tabular}{${columnAlign}}\n`;
      
      // Headers
      latex += headers.map(header => this.escapeLatex(header)).join(' & ');
      latex += ' \\\\\n';
      latex += '\\hline\n';
      
      // Rows
      rows.forEach(row => {
        latex += row.map(cell => this.escapeLatex(String(cell))).join(' & ');
        latex += ' \\\\\n';
      });
      
      latex += '\\end{tabular}\n';
    }

    // End table environment
    if (caption || label) {
      latex += '\\end{table}\n';
    }

    return latex;
  }

  private generateHtmlTable(data: TableData, options: TableOptions): string {
    const { headers, rows, caption } = data;
    const { style = 'simple', width } = options;

    let html = '';
    let tableClass = '';
    let tableStyle = '';

    // Set styling based on style option
    switch (style) {
      case 'booktabs':
        tableClass = 'table-booktabs';
        tableStyle = `
          border-collapse: collapse;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          margin: 1em auto;
        `;
        break;
      case 'fancy':
        tableClass = 'table-fancy';
        tableStyle = `
          border-collapse: collapse;
          border: 2px solid #333;
          margin: 1em auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        break;
      default:
        tableClass = 'table-simple';
        tableStyle = `
          border-collapse: collapse;
          margin: 1em auto;
        `;
    }

    if (width) {
      tableStyle += `width: ${width};`;
    }

    // Begin table
    html += `<table class="${tableClass}" style="${tableStyle}">\n`;

    // Add caption
    if (caption) {
      html += `  <caption style="caption-side: top; font-weight: bold; margin-bottom: 0.5em;">${this.escapeHtml(caption)}</caption>\n`;
    }

    // Headers
    html += '  <thead>\n';
    html += '    <tr>\n';
    headers.forEach(header => {
      let headerStyle = '';
      switch (style) {
        case 'booktabs':
          headerStyle = 'border-bottom: 1px solid #000; padding: 0.5em; text-align: left; font-weight: bold;';
          break;
        case 'fancy':
          headerStyle = 'border: 1px solid #333; padding: 0.5em; background-color: #f5f5f5; font-weight: bold;';
          break;
        default:
          headerStyle = 'border-bottom: 1px solid #ccc; padding: 0.5em; font-weight: bold;';
      }
      html += `      <th style="${headerStyle}">${this.escapeHtml(header)}</th>\n`;
    });
    html += '    </tr>\n';
    html += '  </thead>\n';

    // Body
    html += '  <tbody>\n';
    rows.forEach((row, index) => {
      html += '    <tr>\n';
      row.forEach(cell => {
        let cellStyle = '';
        switch (style) {
          case 'booktabs':
            cellStyle = 'padding: 0.5em; text-align: left;';
            break;
          case 'fancy':
            cellStyle = `border: 1px solid #333; padding: 0.5em; ${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}`;
            break;
          default:
            cellStyle = 'border-bottom: 1px solid #eee; padding: 0.5em;';
        }
        html += `      <td style="${cellStyle}">${this.escapeHtml(String(cell))}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n';

    html += '</table>\n';

    return html;
  }

  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\textasciitilde{}');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Helper method to create table from CSV-like data
  static fromCsv(csvData: string, options: TableOptions): { data: TableData; options: TableOptions } {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => {
        const trimmed = cell.trim();
        // Try to convert to number if possible
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : num;
      })
    );

    return {
      data: { headers, rows },
      options
    };
  }

  // Helper method to create table from JSON array
  static fromJson(jsonData: any[], options: TableOptions): { data: TableData; options: TableOptions } {
    if (!jsonData.length) {
      throw new Error('JSON data array is empty');
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map(item => headers.map(header => item[header]));

    return {
      data: { headers, rows },
      options
    };
  }
}

export const tableGenerator = new TableGeneratorTool();
