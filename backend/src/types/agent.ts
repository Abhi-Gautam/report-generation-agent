export interface Tool {
  name: string;
  description: string;
  execute(input: any): Promise<any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: any;
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}
