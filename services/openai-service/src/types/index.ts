import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';

export interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
  maxTokens?: number;
  temperature?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeout?: number;
  retries?: number;
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'error' | 'done';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
  metadata?: {
    tokens?: number;
    cost?: number;
    latency?: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  executionTime?: number;
}

export interface ConversationMemory {
  sessionId: string;
  messages: ChatCompletionMessageParam[];
  totalTokens: number;
  totalCost: number;
  createdAt: number;
  updatedAt: number;
}

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  requestCount: number;
  errorCount: number;
  averageLatency: number;
}

export interface PerformanceMetrics {
  firstTokenLatency: number;
  totalResponseTime: number;
  tokensPerSecond: number;
  streamingLatency: number[];
  memoryUsage: number;
  cpuUsage: number;
}

export interface FunctionToolDefinition extends ChatCompletionTool {
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
  handler: (args: Record<string, any>) => Promise<any>;
  maxExecutionTime?: number;
  requiresApproval?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}