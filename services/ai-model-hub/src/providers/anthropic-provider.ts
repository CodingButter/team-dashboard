/**
 * Anthropic Claude Provider Implementation
 * 
 * High-performance Anthropic Claude integration with streaming support,
 * cost optimization, and advanced reasoning capabilities.
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { BaseProvider } from './base-provider';
import {
  ProviderConfig,
  ModelRequest,
  ModelResponse,
  StreamChunk,
  ChatMessage,
  TokenUsage,
  ModelDefinition
} from '../types';

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic | null = null;
  private rateLimitRemaining: number = 0;
  private rateLimitReset: number = 0;

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return 'Anthropic';
  }

  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);
    
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
      maxRetries: 0 // We handle retries in base class
    });

    // Load Anthropic models if not provided
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
      throw new Error('Anthropic client not initialized');
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
      const { systemMessage, userMessages } = this.convertMessages(request.messages);

      const completion = await this.withRetry(async () => {
        return this.client!.messages.create({
          model: modelId,
          max_tokens: request.maxTokens || model.maxTokens,
          temperature: request.temperature || 0.7,
          system: systemMessage,
          messages: userMessages,
          tools: request.tools ? this.convertTools(request.tools) : undefined,
          stream: false
        });
      });

      // Calculate cost and usage
      const usage = this.createTokenUsage(
        completion.usage.input_tokens,
        completion.usage.output_tokens
      );
      const cost = this.calculateCost(usage, model);

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime, cost, usage.totalTokens);
      
      // Update rate limiting info
      this.updateRateLimitInfo(completion);

      const response: ModelResponse = {
        id: completion.id,
        model: modelId,
        providerId: this.id,
        content: this.extractContent(completion.content),
        toolCalls: this.extractToolCalls(completion.content),
        finishReason: this.mapStopReason(completion.stop_reason),
        usage,
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
      throw new Error('Anthropic client not initialized');
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

    let inputTokens = 0;
    let outputTokens = 0;
    const requestId = this.generateRequestId();

    try {
      const { systemMessage, userMessages } = this.convertMessages(request.messages);

      const stream = await this.withRetry(async () => {
        return this.client!.messages.create({
          model: modelId,
          max_tokens: request.maxTokens || model.maxTokens,
          temperature: request.temperature || 0.7,
          system: systemMessage,
          messages: userMessages,
          tools: request.tools ? this.convertTools(request.tools) : undefined,
          stream: true
        });
      });

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'message_start':
            inputTokens = chunk.message.usage.input_tokens;
            break;

          case 'content_block_delta':
            if (chunk.delta.type === 'text_delta') {
              outputTokens++;
              yield {
                id: requestId,
                type: 'content',
                content: chunk.delta.text,
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
            break;

          case 'content_block_stop':
            // Content block finished
            break;

          case 'message_delta':
            outputTokens = chunk.usage.output_tokens;
            if (chunk.delta.stop_reason) {
              const cost = this.calculateCostFromTokens(inputTokens, outputTokens, model);

              // Update metrics
              this.updateMetrics(true, Date.now() - startTime, cost, inputTokens + outputTokens);

              yield {
                id: requestId,
                type: 'usage',
                usage: this.createTokenUsage(inputTokens, outputTokens),
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
                id: requestId,
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
            break;

          case 'message_stop':
            // Stream finished
            break;
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
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      return true;
    } catch (error) {
      console.error(`Anthropic health check failed:`, error);
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
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        providerId: this.id,
        maxTokens: 8192,
        inputCostPer1k: 0.003,    // $3.00 per 1M input tokens
        outputCostPer1k: 0.015,   // $15.00 per 1M output tokens
        capabilities: ['text-generation', 'code-generation', 'function-calling', 'vision'],
        averageLatency: 2000,
        maxConcurrency: 50,
        contextWindow: 200000,
        supportedFeatures: ['system-prompts', 'tool-calling', 'streaming-response', 'vision-input']
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        providerId: this.id,
        maxTokens: 8192,
        inputCostPer1k: 0.0008,   // $0.80 per 1M input tokens
        outputCostPer1k: 0.004,   // $4.00 per 1M output tokens
        capabilities: ['text-generation', 'code-generation'],
        averageLatency: 800,
        maxConcurrency: 100,
        contextWindow: 200000,
        supportedFeatures: ['system-prompts', 'streaming-response']
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        providerId: this.id,
        maxTokens: 4096,
        inputCostPer1k: 0.015,    // $15.00 per 1M input tokens
        outputCostPer1k: 0.075,   // $75.00 per 1M output tokens
        capabilities: ['text-generation', 'code-generation', 'function-calling', 'vision'],
        averageLatency: 3000,
        maxConcurrency: 25,
        contextWindow: 200000,
        supportedFeatures: ['system-prompts', 'tool-calling', 'streaming-response', 'vision-input']
      }
    ];
  }

  private convertMessages(messages: ChatMessage[]): {
    systemMessage?: string;
    userMessages: Anthropic.MessageParam[];
  } {
    let systemMessage: string | undefined;
    const userMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        userMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    return { systemMessage, userMessages };
  }

  private convertTools(tools: any[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters
    }));
  }

  private extractContent(content: Anthropic.ContentBlock[]): string | undefined {
    const textBlocks = content.filter(block => block.type === 'text') as Anthropic.TextBlock[];
    return textBlocks.length > 0 ? textBlocks.map(block => block.text).join('') : undefined;
  }

  private extractToolCalls(content: Anthropic.ContentBlock[]): any[] | undefined {
    const toolBlocks = content.filter(block => block.type === 'tool_use') as Anthropic.ToolUseBlock[];
    
    if (toolBlocks.length === 0) return undefined;

    return toolBlocks.map(block => ({
      id: block.id,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input)
      }
    }));
  }

  private mapStopReason(reason: string | null): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_calls';
      case 'stop_sequence': return 'stop';
      default: return 'stop';
    }
  }

  private calculateCost(usage: TokenUsage, model: ModelDefinition): number {
    const inputCost = (usage.promptTokens / 1000) * model.inputCostPer1k;
    const outputCost = (usage.completionTokens / 1000) * model.outputCostPer1k;
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
      this.rateLimitRemaining = parseInt(headers['anthropic-ratelimit-requests-remaining'] || '0');
      this.rateLimitReset = parseInt(headers['anthropic-ratelimit-requests-reset'] || '0');
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Anthropic.APIError) {
      return new Error(`Anthropic API Error (${error.status}): ${error.message}`);
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return new Error('Network connection error');
    }
    
    return error instanceof Error ? error : new Error(String(error));
  }

  protected estimateTokens(messages: ChatMessage[]): number {
    // Anthropic token estimation
    return messages.reduce((total, msg) => {
      // Claude uses a different tokenization, roughly 1 token ≈ 3.5 characters
      const baseTokens = Math.ceil(msg.content.length / 3.5);
      
      // Add overhead for message structure
      const overhead = 8; // tokens for role, structure, etc.
      
      return total + baseTokens + overhead;
    }, 0);
  }
}