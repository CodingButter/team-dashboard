/**
 * OpenAI Provider Implementation
 * 
 * High-performance OpenAI integration with streaming support,
 * cost optimization, and intelligent rate limiting.
 */

import OpenAI from 'openai';
import { BaseProvider } from './base-provider';
import {
  ProviderConfig,
  ModelRequest,
  ModelResponse,
  StreamChunk,
  ChatMessage,
  ModelDefinition
} from '../types';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI | null = null;
  private rateLimitRemaining: number = 0;
  private rateLimitReset: number = 0;

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return 'OpenAI';
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
      maxRetries: 0 // We handle retries in base class
    });

    // Load OpenAI models if not provided
    if (config.models.length === 0) {
      config.models = this.getDefaultModels();
      for (const model of config.models) {
        this.models.set(model.id, model);
      }
    }
  }

  async chat(request: ModelRequest): Promise<ModelResponse> {
    this.ensureInitialized();
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();
    const modelId = request.model || this.getDefaultModel()?.id;
    
    if (!modelId) {
      throw new Error('No model specified and no default model available');
    }

    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      const completion = await this.withRetry(async () => {
        return this.client!.chat.completions.create({
          model: modelId,
          messages: this.convertMessages(request.messages),
          max_tokens: request.maxTokens || model.maxTokens,
          temperature: request.temperature || 0.7,
          tools: request.tools ? this.convertTools(request.tools) : undefined,
          stream: false
        });
      });

      // Extract response data
      const choice = completion.choices[0];
      const usage = completion.usage!;
      const cost = this.calculateCost(usage, model);

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime, cost, usage.total_tokens);
      
      // Update rate limiting info
      this.updateRateLimitInfo(completion);

      const response: ModelResponse = {
        id: completion.id,
        model: modelId,
        providerId: this.id,
        content: choice.message.content || undefined,
        toolCalls: choice.message.tool_calls ? 
          this.convertToolCalls(choice.message.tool_calls) : undefined,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: this.createTokenUsage(usage.prompt_tokens, usage.completion_tokens),
        cost,
        latency: Date.now() - startTime,
        cached: false,
        metadata: this.createResponseMetadata(
          modelId, 
          startTime, 
          cost, 
          false, 
          completion.id
        )
      };

      return response;

    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime, 0, 0);
      throw this.handleError(error);
    }
  }

  async *stream(request: ModelRequest): AsyncGenerator<StreamChunk> {
    this.ensureInitialized();
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();
    const modelId = request.model || this.getDefaultModel()?.id;
    
    if (!modelId) {
      throw new Error('No model specified and no default model available');
    }

    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    let totalTokens = 0;
    let completionTokens = 0;
    const requestId = this.generateRequestId();

    try {
      const stream = await this.withRetry(async () => {
        return this.client!.chat.completions.create({
          model: modelId,
          messages: this.convertMessages(request.messages),
          max_tokens: request.maxTokens || model.maxTokens,
          temperature: request.temperature || 0.7,
          tools: request.tools ? this.convertTools(request.tools) : undefined,
          stream: true
        });
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Stream content
        if (delta.content) {
          completionTokens++;
          yield {
            id: chunk.id,
            type: 'content',
            content: delta.content,
            metadata: {
              model: modelId,
              providerId: this.id,
              latency: Date.now() - startTime,
              cost: 0, // Will be calculated at the end
              cached: false,
              timestamp: Date.now(),
              requestId
            }
          };
        }

        // Stream tool calls
        if (delta.tool_calls) {
          yield {
            id: chunk.id,
            type: 'tool_call',
            toolCall: this.convertToolCalls(delta.tool_calls)[0],
            metadata: {
              model: modelId,
              providerId: this.id,
              latency: Date.now() - startTime,
              cost: 0,
              cached: false,
              timestamp: Date.now(),
              requestId
            }
          };
        }

        // Handle finish
        if (choice.finish_reason) {
          const promptTokens = this.estimateTokens(request.messages);
          totalTokens = promptTokens + completionTokens;
          const cost = this.calculateCostFromTokens(promptTokens, completionTokens, model);

          // Update metrics
          this.updateMetrics(true, Date.now() - startTime, cost, totalTokens);

          yield {
            id: chunk.id,
            type: 'usage',
            usage: this.createTokenUsage(promptTokens, completionTokens),
            metadata: {
              model: modelId,
              providerId: this.id,
              latency: Date.now() - startTime,
              cost,
              cached: false,
              timestamp: Date.now(),
              requestId
            }
          };

          yield {
            id: chunk.id,
            type: 'done',
            metadata: {
              model: modelId,
              providerId: this.id,
              latency: Date.now() - startTime,
              cost,
              cached: false,
              timestamp: Date.now(),
              requestId
            }
          };
        }
      }

    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime, 0, 0);
      
      yield {
        id: requestId,
        type: 'error',
        error: this.handleError(error).message,
        metadata: {
          model: modelId,
          providerId: this.id,
          latency: Date.now() - startTime,
          cost: 0,
          cached: false,
          timestamp: Date.now(),
          requestId
        }
      };
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Simple health check with minimal cost
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error(`OpenAI health check failed:`, error);
      return false;
    }
  }

  protected async getRateLimitRemaining(): Promise<number> {
    return this.rateLimitRemaining;
  }

  protected async getRateLimitReset(): Promise<number> {
    return this.rateLimitReset;
  }

  // Private helper methods
  private getDefaultModels(): ModelDefinition[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        providerId: this.id,
        maxTokens: 4096,
        inputCostPer1k: 0.005,   // $5.00 per 1M input tokens
        outputCostPer1k: 0.015,  // $15.00 per 1M output tokens
        capabilities: ['text-generation', 'code-generation', 'function-calling', 'vision'],
        averageLatency: 1500,
        maxConcurrency: 100,
        contextWindow: 128000,
        supportedFeatures: ['json-mode', 'system-prompts', 'tool-calling', 'streaming-response']
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        providerId: this.id,
        maxTokens: 4096,
        inputCostPer1k: 0.00015,  // $0.15 per 1M input tokens
        outputCostPer1k: 0.0006,  // $0.60 per 1M output tokens
        capabilities: ['text-generation', 'code-generation', 'function-calling'],
        averageLatency: 800,
        maxConcurrency: 200,
        contextWindow: 128000,
        supportedFeatures: ['json-mode', 'system-prompts', 'tool-calling', 'streaming-response']
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        providerId: this.id,
        maxTokens: 4096,
        inputCostPer1k: 0.0005,   // $0.50 per 1M input tokens
        outputCostPer1k: 0.0015,  // $1.50 per 1M output tokens
        capabilities: ['text-generation', 'function-calling'],
        averageLatency: 600,
        maxConcurrency: 300,
        contextWindow: 16384,
        supportedFeatures: ['system-prompts', 'tool-calling', 'streaming-response']
      }
    ];
  }

  private convertMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => ({
      role: msg.role as any,
      content: msg.content,
      tool_calls: msg.toolCalls ? msg.toolCalls.map(tc => ({
        id: tc.id,
        type: tc.type,
        function: tc.function
      })) : undefined,
      tool_call_id: msg.toolCallId
    }));
  }

  private convertTools(tools: any[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function',
      function: tool.function
    }));
  }

  private convertToolCalls(toolCalls: any[]): any[] {
    return toolCalls.map(tc => ({
      id: tc.id,
      type: tc.type,
      function: tc.function
    }));
  }

  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_calls';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }

  private calculateCost(usage: OpenAI.Completions.CompletionUsage, model: ModelDefinition): number {
    const inputCost = (usage.prompt_tokens / 1000) * model.inputCostPer1k;
    const outputCost = (usage.completion_tokens / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  }

  private calculateCostFromTokens(
    promptTokens: number, 
    completionTokens: number, 
    model: ModelDefinition
  ): number {
    const inputCost = (promptTokens / 1000) * model.inputCostPer1k;
    const outputCost = (completionTokens / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  }

  private updateRateLimitInfo(response: any): void {
    // Extract rate limit info from headers if available
    const headers = response.response?.headers;
    if (headers) {
      this.rateLimitRemaining = parseInt(headers['x-ratelimit-remaining-requests'] || '0');
      this.rateLimitReset = parseInt(headers['x-ratelimit-reset-requests'] || '0');
    }
  }

  private handleError(error: any): Error {
    if (error instanceof OpenAI.APIError) {
      return new Error(`OpenAI API Error (${error.status}): ${error.message}`);
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return new Error('Network connection error');
    }
    
    return error instanceof Error ? error : new Error(String(error));
  }

  protected estimateTokens(messages: ChatMessage[]): number {
    // More accurate token estimation for OpenAI
    return messages.reduce((total, msg) => {
      // Rough estimation: 1 token ≈ 0.75 English words ≈ 4 characters
      const baseTokens = Math.ceil(msg.content.length / 4);
      
      // Add overhead for message structure
      const overhead = 10; // tokens for role, structure, etc.
      
      return total + baseTokens + overhead;
    }, 0);
  }
}