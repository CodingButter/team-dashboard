/**
 * OpenAI Service Type Definitions
 * Consolidated from services/openai-service/src/types/index.ts
 * 
 * These types are specific to the OpenAI service and should not be used by other services.
 * Import from @team-dashboard/types/services/openai-service
 */

import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';

/**
 * OpenAI Configuration
 */
export interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'gpt-4-turbo';
  maxTokens?: number;
  temperature?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeout?: number;
  retries?: number;
  baseURL?: string;
}

/**
 * Streaming Response Chunk
 */
export interface StreamChunk {
  type: 'content' | 'tool_call' | 'error' | 'done';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
  metadata?: {
    tokens?: number;
    cost?: number;
    latency?: number;
    model?: string;
  };
}

/**
 * Tool Call Execution
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  executionTime?: number;
  approved?: boolean;
  approvedBy?: string;
}

/**
 * Conversation Memory Management
 */
export interface ConversationMemory {
  sessionId: string;
  messages: ChatCompletionMessageParam[];
  totalTokens: number;
  totalCost: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

/**
 * Usage Metrics Tracking
 */
export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  requestCount: number;
  errorCount: number;
  averageLatency: number;
  peakLatency: number;
  throughput: number; // requests per minute
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  firstTokenLatency: number;
  totalResponseTime: number;
  tokensPerSecond: number;
  streamingLatency: number[];
  memoryUsage: number;
  cpuUsage: number;
  concurrentRequests: number;
}

/**
 * Function Tool Definition with Handler
 */
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
  category?: string;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
  exponentialBase?: number;
}

/**
 * Rate Limiting Configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
  burstLimit?: number;
}

/**
 * OpenAI Service Configuration
 */
export interface OpenAIServiceConfig extends OpenAIConfig {
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  monitoring: {
    enabled: boolean;
    metricsInterval: number; // seconds
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Chat Completion Request Options
 */
export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: FunctionToolDefinition[];
  systemPrompt?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Service Health Status
 */
export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  details?: Record<string, any>;
}