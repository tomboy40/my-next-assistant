import { Tool, ToolResult, ExecutionContext } from '../types';

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, any>;

  abstract execute(params: Record<string, any>, context?: ExecutionContext): Promise<ToolResult>;

  protected createResult(success: boolean, data?: any, error?: string, metadata?: Record<string, any>): ToolResult {
    return {
      success,
      data,
      error,
      metadata: {
        ...metadata,
        toolName: this.name,
        timestamp: new Date().toISOString(),
      },
    };
  }

  protected validateParams(params: Record<string, any>, required: string[]): void {
    for (const param of required) {
      if (!(param in params) || params[param] === undefined || params[param] === null) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}
