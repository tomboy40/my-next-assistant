import axios, { AxiosInstance } from 'axios';
import { AgentConfig } from './types';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekClient {
  private client: AxiosInstance;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.deepseekBaseUrl || 'https://api.deepseek.com/v1',
      headers: {
        'Authorization': `Bearer ${config.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: config.timeout || 30000,
    });
  }

  async chat(
    messages: DeepSeekMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<DeepSeekResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || 'deepseek-reasoner',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: options.stream || false,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async generateEmbedding(text: string, model: string = 'deepseek-embedding'): Promise<number[]> {
    try {
      const response = await this.client.post('/embeddings', {
        model,
        input: text,
      });

      const embeddingResponse: EmbeddingResponse = response.data;
      return embeddingResponse.data[0].embedding;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DeepSeek Embedding API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async generatePlan(mission: string, context?: string): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `You are an expert service management AI agent with advanced planning capabilities. Your task is to create detailed, executable plans for missions.

Key principles:
1. Break down complex missions into clear, actionable tasks
2. Consider dependencies between tasks
3. Estimate realistic timeframes
4. Identify required tools and resources
5. Plan for potential risks and contingencies
6. Ensure each task has clear success criteria

Return your response as a structured JSON plan with the following format:
{
  "title": "Plan title",
  "description": "Plan description",
  "estimatedDuration": 120,
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "priority": 0,
      "toolName": "tool_name",
      "toolParams": {},
      "dependencies": [],
      "estimatedDuration": 30
    }
  ],
  "reasoning": "Explanation of the planning approach",
  "confidence": 0.85
}`
      },
      {
        role: 'user',
        content: `Mission: ${mission}${context ? `\n\nContext: ${context}` : ''}`
      }
    ];

    const response = await this.chat(messages, { temperature: 0.3 });
    return response.choices[0].message.content;
  }

  async reflect(
    type: 'progress_assessment' | 'plan_optimization' | 'error_analysis' | 'success_analysis',
    data: any
  ): Promise<string> {
    const systemPrompts = {
      progress_assessment: 'You are analyzing the progress of a mission execution. Assess what has been completed, what remains, and any issues that need attention.',
      plan_optimization: 'You are optimizing an execution plan based on current progress and learnings. Suggest improvements to increase efficiency and success probability.',
      error_analysis: 'You are analyzing a failure or error that occurred during mission execution. Identify root causes and suggest corrective actions.',
      success_analysis: 'You are analyzing a successful task or mission completion. Extract insights and best practices for future use.'
    };

    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `${systemPrompts[type]}

Return your analysis as a structured JSON response:
{
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.8,
  "reasoning": "Detailed explanation of your analysis"
}`
      },
      {
        role: 'user',
        content: JSON.stringify(data, null, 2)
      }
    ];

    const response = await this.chat(messages, { temperature: 0.4 });
    return response.choices[0].message.content;
  }

  async selectTool(task: any, availableTools: string[]): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `You are selecting the most appropriate tool for a given task. Consider the task requirements and available tools.

Available tools: ${availableTools.join(', ')}

Return your response as JSON:
{
  "selectedTool": "tool_name",
  "reasoning": "Why this tool is most appropriate",
  "confidence": 0.9
}`
      },
      {
        role: 'user',
        content: `Task: ${JSON.stringify(task, null, 2)}`
      }
    ];

    const response = await this.chat(messages, { temperature: 0.2 });
    return response.choices[0].message.content;
  }

  async assessCompletion(mission: any, result: any): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `You are assessing whether a mission has been successfully completed based on the original goals and the execution results.

Return your assessment as JSON:
{
  "completed": true/false,
  "completionPercentage": 0.95,
  "reasoning": "Detailed explanation",
  "remainingWork": ["item 1", "item 2"],
  "confidence": 0.9
}`
      },
      {
        role: 'user',
        content: `Mission: ${JSON.stringify(mission, null, 2)}\n\nResult: ${JSON.stringify(result, null, 2)}`
      }
    ];

    const response = await this.chat(messages, { temperature: 0.3 });
    return response.choices[0].message.content;
  }
}
