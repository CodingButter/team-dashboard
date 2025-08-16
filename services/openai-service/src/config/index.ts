import { OpenAIConfig, RetryConfig } from '../types';

export const DEFAULT_OPENAI_CONFIG: Partial<OpenAIConfig> = {
  model: 'gpt-4o',
  maxTokens: 4096,
  temperature: 0.1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  timeout: 30000,
  retries: 3,
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: [
    'rate_limit_exceeded',
    'server_error',
    'timeout',
    'connection_error',
    'insufficient_quota'
  ],
};

// Token pricing per 1K tokens (as of 2025-08-16)
export const TOKEN_PRICING = {
  'gpt-4o': {
    input: 0.015,
    output: 0.06
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006
  },
  'gpt-3.5-turbo': {
    input: 0.0015,
    output: 0.002
  }
} as const;

export const PERFORMANCE_TARGETS = {
  firstTokenLatency: 1000,    // 1 second
  streamingLatency: 100,      // 100ms per chunk
  tokensPerSecond: 50,        // Target throughput
  maxMemoryUsage: 512,        // MB per agent
  errorRate: 0.01,            // 1% max error rate
} as const;

export function createOpenAIConfig(overrides: Partial<OpenAIConfig>): OpenAIConfig {
  if (!overrides.apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  return {
    ...DEFAULT_OPENAI_CONFIG,
    ...overrides,
  } as OpenAIConfig;
}