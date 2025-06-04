import { Tool } from '../types/agent';
import { projectStorage } from '../services/projectStorage';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

interface ChartOptions {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  title?: string;
  width?: number;
  height?: number;
  format: 'html' | 'latex' | 'svg';
  style?: 'default' | 'academic' | 'professional';
  responsive?: boolean;
  legend?: boolean;
  grid?: boolean;
  axes?: {
    x?: { title?: string; min?: number; max?: number };
    y?: { title?: string; min?: number; max?: number };
  };
}

export class ChartGeneratorTool implements Tool {
  name = 'chart_generator';
  description = 'Generate interactive charts with Chart.js for HTML or TikZ plots for LaTeX';

  async execute(input: {
    data: ChartData;
    options: ChartOptions;
    projectId?: string;
  }): Promise<{ content: string; format: string; assetPath?: string }> {
    const { data, options, projectId } = input;

    if (!data.labels || !data.datasets) {
      throw new Error('Chart data must include labels and datasets');
    }

    if (options.format === 'latex') {
      return {
        content: this.generateLatexChart(data, options),
        format: 'latex'
      };
    } else if (options.format === 'svg') {
      const svgContent = this.generateSvgChart(data, options);
      let assetPath: string | undefined;
      
      if (projectId) {
        const filename = `chart_${Date.now()}.svg`;
        assetPath = await projectStorage.saveAsset(projectId, filename, Buffer.from(svgContent));
      }
      
      return {
        content: svgContent,
        format: 'svg',
        ...(assetPath && { assetPath })
      };
    } else {
      return {
        content: this.generateHtmlChart(data, options),
        format: 'html'
      };
    }
  }

  private generateHtmlChart(data: ChartData, options: ChartOptions): string {
    const { type, title, width = 800, height = 400, style = 'default', responsive = true } = options;
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate colors for datasets if not provided
    const colorPalette = this.getColorPalette(style);
    const processedDatasets = data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || colorPalette[index % colorPalette.length],
      borderColor: dataset.borderColor || colorPalette[index % colorPalette.length],
      borderWidth: dataset.borderWidth || (type === 'line' ? 2 : 1)
    }));

    const chartConfig = {
      type,
      data: {
        labels: data.labels,
        datasets: processedDatasets
      },
      options: {
        responsive,
        maintainAspectRatio: !responsive,
        plugins: {
          title: {
            display: !!title,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: options.legend !== false,
            position: 'top'
          }
        },
        scales: this.generateScalesConfig(options)
      }
    };

    return `
<div class="chart-container" style="position: relative; width: ${width}px; height: ${height}px; margin: 1em auto;">
  <canvas id="${chartId}"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const ctx_${chartId} = document.getElementById('${chartId}').getContext('2d');
  const chart_${chartId} = new Chart(ctx_${chartId}, ${JSON.stringify(chartConfig, null, 2)});
</script>
`;
  }

  private generateLatexChart(data: ChartData, options: ChartOptions): string {
    const { type, title, width = 10, height = 6 } = options;

    let latex = `\\begin{figure}[h]
\\centering
\\begin{tikzpicture}
\\begin{axis}[
  width=${width}cm,
  height=${height}cm,
  xlabel={${options.axes?.x?.title || ''}},
  ylabel={${options.axes?.y?.title || ''}},
  title={${title || ''}},
  legend pos=north west,
  grid=${options.grid !== false ? 'major' : 'none'},
  legend style={font=\\footnotesize}
]\n`;

    if (type === 'bar') {
      latex += this.generateLatexBarChart(data);
    } else if (type === 'line') {
      latex += this.generateLatexLineChart(data);
    } else if (type === 'pie') {
      return this.generateLatexPieChart(data, options);
    } else {
      latex += this.generateLatexLineChart(data); // Default to line chart
    }

    latex += `\\end{axis}
\\end{tikzpicture}`;

    if (title) {
      latex += `\n\\caption{${title}}`;
    }

    latex += `\n\\end{figure}`;

    return latex;
  }

  private generateLatexBarChart(data: ChartData): string {
    let latex = '';
    
    data.datasets.forEach((dataset, datasetIndex) => {
      latex += `\\addplot[
    ybar,
    bar width=0.6cm,
    fill=blue!${30 + datasetIndex * 20},
    draw=blue!${50 + datasetIndex * 20}
  ] coordinates {\n`;
      
      data.labels.forEach((_, index) => {
        latex += `    (${index}, ${dataset.data[index]})\n`;
      });
      
      latex += `  };\n`;
      latex += `\\addlegendentry{${dataset.label}}\n\n`;
    });

    // Add x-axis labels
    latex += `\\pgfplotsset{
  xtick={${data.labels.map((_, i) => i).join(',')}},
  xticklabels={${data.labels.map(label => `{${label}}`).join(',')}}
}\n`;

    return latex;
  }

  private generateLatexLineChart(data: ChartData): string {
    let latex = '';
    
    data.datasets.forEach((dataset, datasetIndex) => {
      const colors = ['blue', 'red', 'green', 'orange', 'purple', 'brown'];
      const color = colors[datasetIndex % colors.length];
      
      latex += `\\addplot[
    color=${color},
    mark=*,
    thick
  ] coordinates {\n`;
      
      data.labels.forEach((_, index) => {
        latex += `    (${index}, ${dataset.data[index]})\n`;
      });
      
      latex += `  };\n`;
      latex += `\\addlegendentry{${dataset.label}}\n\n`;
    });

    // Add x-axis labels
    latex += `\\pgfplotsset{
  xtick={${data.labels.map((_, i) => i).join(',')}},
  xticklabels={${data.labels.map(label => `{${label}}`).join(',')}}
}\n`;

    return latex;
  }

  private generateLatexPieChart(data: ChartData, options: ChartOptions): string {
    const { title, width = 8 } = options;
    
    // For pie charts, we'll use the first dataset
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, value) => sum + value, 0);
    
    let latex = `\\begin{figure}[h]
\\centering
\\begin{tikzpicture}
\\pie[
  radius=${width/2},
  text=legend
]{`;
    
    const pieData = data.labels.map((label, index) => {
      const percentage = ((dataset.data[index] / total) * 100).toFixed(1);
      return `${percentage}/${label}`;
    });
    
    latex += pieData.join(', ');
    latex += `}
\\end{tikzpicture}`;

    if (title) {
      latex += `\n\\caption{${title}}`;
    }

    latex += `\n\\end{figure}`;

    return latex;
  }

  private generateSvgChart(data: ChartData, options: ChartOptions): string {
    const { type, title, width = 600, height = 400 } = options;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .chart-title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-anchor: middle; }
    .axis-label { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
    .tick-label { font-family: Arial, sans-serif; font-size: 10px; text-anchor: middle; }
    .legend { font-family: Arial, sans-serif; font-size: 11px; }
  </style>
  
  <g transform="translate(${margin.left}, ${margin.top})">`;

    if (title) {
      svg += `\n    <text x="${chartWidth / 2}" y="-20" class="chart-title">${title}</text>`;
    }

    if (type === 'bar') {
      svg += this.generateSvgBarChart(data, chartWidth, chartHeight);
    } else if (type === 'line') {
      svg += this.generateSvgLineChart(data, chartWidth, chartHeight);
    } else if (type === 'pie') {
      svg += this.generateSvgPieChart(data, Math.min(chartWidth, chartHeight) / 2);
    }

    svg += `\n  </g>
</svg>`;

    return svg;
  }

  private generateSvgBarChart(data: ChartData, width: number, height: number): string {
    const barWidth = width / data.labels.length * 0.8;
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];

    let svg = '';
    
    // Draw bars
    data.datasets.forEach((dataset, datasetIndex) => {
      const color = colors[datasetIndex % colors.length];
      
      dataset.data.forEach((value, index) => {
        const barHeight = (value / maxValue) * height;
        const x = index * (width / data.labels.length) + (width / data.labels.length - barWidth) / 2;
        const y = height - barHeight;
        
        svg += `\n    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="0.8"/>`;
      });
    });

    // Draw axes
    svg += `\n    <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="#333" stroke-width="1"/>`;
    svg += `\n    <line x1="0" y1="0" x2="0" y2="${height}" stroke="#333" stroke-width="1"/>`;

    // Add labels
    data.labels.forEach((label, index) => {
      const x = index * (width / data.labels.length) + (width / data.labels.length) / 2;
      svg += `\n    <text x="${x}" y="${height + 15}" class="tick-label">${label}</text>`;
    });

    return svg;
  }

  private generateSvgLineChart(data: ChartData, width: number, height: number): string {
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];

    let svg = '';
    
    // Draw lines
    data.datasets.forEach((dataset, datasetIndex) => {
      const color = colors[datasetIndex % colors.length];
      let pathData = '';
      
      dataset.data.forEach((value, index) => {
        const x = (index / (data.labels.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        
        if (index === 0) {
          pathData += `M ${x} ${y}`;
        } else {
          pathData += ` L ${x} ${y}`;
        }
      });
      
      svg += `\n    <path d="${pathData}" stroke="${color}" stroke-width="2" fill="none"/>`;
      
      // Add points
      dataset.data.forEach((value, index) => {
        const x = (index / (data.labels.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        svg += `\n    <circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
      });
    });

    // Draw axes
    svg += `\n    <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="#333" stroke-width="1"/>`;
    svg += `\n    <line x1="0" y1="0" x2="0" y2="${height}" stroke="#333" stroke-width="1"/>`;

    // Add labels
    data.labels.forEach((label, index) => {
      const x = (index / (data.labels.length - 1)) * width;
      svg += `\n    <text x="${x}" y="${height + 15}" class="tick-label">${label}</text>`;
    });

    return svg;
  }

  private generateSvgPieChart(data: ChartData, radius: number): string {
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, value) => sum + value, 0);
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#f1c40f', '#e67e22'];
    
    let svg = '';
    let currentAngle = 0;
    
    dataset.data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      
      const x1 = Math.cos(currentAngle) * radius;
      const y1 = Math.sin(currentAngle) * radius;
      const x2 = Math.cos(currentAngle + sliceAngle) * radius;
      const y2 = Math.sin(currentAngle + sliceAngle) * radius;
      
      const pathData = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      const color = colors[index % colors.length];
      
      svg += `\n    <path d="${pathData}" fill="${color}" stroke="#fff" stroke-width="2"/>`;
      
      currentAngle += sliceAngle;
    });

    return svg;
  }

  private generateScalesConfig(options: ChartOptions) {
    const scales: any = {};

    if (options.type !== 'pie') {
      scales.x = {
        display: true,
        grid: {
          display: options.grid !== false
        }
      };

      scales.y = {
        display: true,
        beginAtZero: true,
        grid: {
          display: options.grid !== false
        }
      };

      if (options.axes?.x?.title) {
        scales.x.title = {
          display: true,
          text: options.axes.x.title
        };
      }

      if (options.axes?.y?.title) {
        scales.y.title = {
          display: true,
          text: options.axes.y.title
        };
      }

      if (options.axes?.x?.min !== undefined) {
        scales.x.min = options.axes.x.min;
      }

      if (options.axes?.x?.max !== undefined) {
        scales.x.max = options.axes.x.max;
      }

      if (options.axes?.y?.min !== undefined) {
        scales.y.min = options.axes.y.min;
      }

      if (options.axes?.y?.max !== undefined) {
        scales.y.max = options.axes.y.max;
      }
    }

    return scales;
  }

  private getColorPalette(style: string): string[] {
    switch (style) {
      case 'academic':
        return ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#592E83'];
      case 'professional':
        return ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'];
      default:
        return ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
    }
  }

  // Helper methods
  static fromCsv(csvData: string, chartType: ChartOptions['type'], options: Partial<ChartOptions> = {}): { data: ChartData; options: ChartOptions } {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const labels = headers.slice(1); // First column is labels
    
    const datasets: ChartData['datasets'] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const label = values[0];
      const data = values.slice(1).map(v => parseFloat(v));
      
      datasets.push({
        label,
        data
      });
    }

    return {
      data: { labels, datasets },
      options: { type: chartType, format: 'html', ...options }
    };
  }

  static fromJson(jsonData: any[], chartType: ChartOptions['type'], labelField: string, dataFields: string[], options: Partial<ChartOptions> = {}): { data: ChartData; options: ChartOptions } {
    const labels = jsonData.map(item => item[labelField]);
    const datasets = dataFields.map(field => ({
      label: field,
      data: jsonData.map(item => item[field])
    }));

    return {
      data: { labels, datasets },
      options: { type: chartType, format: 'html', ...options }
    };
  }
}

export const chartGenerator = new ChartGeneratorTool();
