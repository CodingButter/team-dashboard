import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import { backOff } from 'exponential-backoff';
import type {
  OpenAIConfig,
  StreamChunk,
  ToolCall,
  FunctionToolDefinition,
  RetryConfig
} from './types';
import { DEFAULT_TOOLS } from './tools';
import { DEFAULT_RETRY_CONFIG } from './config';
import { countMessageTokens, calculateCost, optimizeMessages } from './utils/tokens';
import { 
  PerformanceTracker, 
  globalUsageTracker,
  openaiRequestCounter,
  openaiLatencyHistogram,
  openaiTokensCounter,
  openaiCostCounter,
  openaiActiveStreams
} from './utils/metrics';

export class OpenAIService {
  private client: OpenAI;
  private config: OpenAIConfig;
  private retryConfig: RetryConfig;
  private tools: Map<string, FunctionToolDefinition> = new Map();
  private activeStreams: Set<string> = new Set();

  constructor(config: OpenAIConfig, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.config = config;
    this.retryConfig = retryConfig;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      maxRetries: 0, // We handle retries manually
    });

    // Register default tools
    DEFAULT_TOOLS.forEach(tool => {
      this.tools.set(tool.function.name, tool);
    });
  }

  registerTool(tool: FunctionToolDefinition): void {
    this.tools.set(tool.function.name, tool);
  }

  private shouldRetry(error: any): boolean {
    if (!error) return false;
    
    const errorType = error.type || error.code || error.message?.toLowerCase() || '';
    return this.retryConfig.retryableErrors.some(retryableError =>
      errorType.includes(retryableError)
    );
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return backOff(operation, {
      numOfAttempts: this.retryConfig.maxRetries + 1,
      startingDelay: this.retryConfig.initialDelay,
      maxDelay: this.retryConfig.maxDelay,
      timeMultiple: this.retryConfig.backoffFactor,
      retry: (error: any) => {
        const shouldRetry = this.shouldRetry(error);
        if (shouldRetry) {
          openaiRequestCounter.inc({ 
            model: this.config.model, 
            type: operationName, 
            status: 'retry' 
          });
        }
        return shouldRetry;
      }
    });
  }

  async *streamCompletion(
    messages: ChatCompletionMessageParam[],
    sessionId?: string,
    tools?: FunctionToolDefinition[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const streamId = `${sessionId || 'anonymous'}-${Date.now()}`;
    const tracker = new PerformanceTracker();
    const requestStartTime = Date.now();
    
    this.activeStreams.add(streamId);
    openaiActiveStreams.inc();
    tracker.startRequest();

    try {
      // Optimize messages to fit context window
      const contextLimit = Math.floor((this.config.maxTokens || 4096) * 0.6);
      const optimizedMessages = optimizeMessages(messages, contextLimit, this.config.model);
      
      const inputTokens = countMessageTokens(optimizedMessages, this.config.model);
      
      // Prepare tools for OpenAI
      const enabledTools = tools || Array.from(this.tools.values());
      const openaiTools = enabledTools.map(tool => ({
        type: 'function' as const,
        function: tool.function
      }));

      const stream = await this.withRetry(async () => {
        return this.client.chat.completions.create({
          model: this.config.model,
          messages: optimizedMessages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          presence_penalty: this.config.presencePenalty,
          frequency_penalty: this.config.frequencyPenalty,
          stream: true,
        });
      }, 'stream');

      let outputTokens = 0;
      let currentToolCall: Partial<ToolCall> | null = null;

      for await (const chunk of stream) {
        tracker.recordStreamChunk();
        
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Handle content streaming
        if (delta.content) {
          if (outputTokens === 0) {
            tracker.recordFirstToken();
          }
          
          outputTokens++;
          
          yield {
            type: 'content',
            content: delta.content,
            metadata: {
              tokens: outputTokens,
              latency: tracker.getMetrics().firstTokenLatency
            }
          };
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name && !currentToolCall) {
              currentToolCall = {
                id: toolCall.id || `tool_${Date.now()}`,
                name: toolCall.function.name,
                arguments: {}
              };
            }

            if (toolCall.function?.arguments && currentToolCall) {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                currentToolCall.arguments = { ...currentToolCall.arguments, ...args };
              } catch {
                // Accumulate partial JSON
                currentToolCall.arguments = {
                  ...currentToolCall.arguments,
                  _partial: (currentToolCall.arguments?._partial || '') + toolCall.function.arguments
                };
              }
            }
          }
        }

        // Execute completed tool calls
        if (currentToolCall?.name && currentToolCall.arguments && !currentToolCall.arguments._partial) {
          const toolResult = await this.executeToolCall(currentToolCall as ToolCall);
          
          yield {
            type: 'tool_call',
            toolCall: toolResult,
            metadata: {
              tokens: outputTokens
            }
          };

          currentToolCall = null;
        }
      }

      // Calculate final metrics
      const totalLatency = Date.now() - requestStartTime;
      const cost = calculateCost(inputTokens, outputTokens, this.config.model);

      // Record metrics
      openaiRequestCounter.inc({ 
        model: this.config.model, 
        type: 'stream', 
        status: 'success' 
      });
      
      openaiLatencyHistogram.observe({ 
        model: this.config.model, 
        type: 'stream' 
      }, totalLatency / 1000);
      
      openaiTokensCounter.inc({ 
        model: this.config.model, 
        type: 'input' 
      }, inputTokens);
      
      openaiTokensCounter.inc({ 
        model: this.config.model, 
        type: 'output' 
      }, outputTokens);
      
      openaiCostCounter.inc({ model: this.config.model }, cost);

      if (sessionId) {
        globalUsageTracker.recordUsage(
          sessionId,
          inputTokens,
          outputTokens,
          cost,
          totalLatency
        );
      }

      yield {
        type: 'done',
        metadata: {
          tokens: inputTokens + outputTokens,
          cost,
          latency: totalLatency
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      openaiRequestCounter.inc({ 
        model: this.config.model, 
        type: 'stream', 
        status: 'error' 
      });

      if (sessionId) {
        globalUsageTracker.recordUsage(sessionId, 0, 0, 0, Date.now() - requestStartTime, true);
      }

      yield {
        type: 'error',
        error: errorMessage
      };
    } finally {
      this.activeStreams.delete(streamId);
      openaiActiveStreams.dec();
    }
  }

  private async executeToolCall(toolCall: ToolCall): Promise<ToolCall> {
    const startTime = performance.now();
    const tool = this.tools.get(toolCall.name);
    
    if (!tool) {
      return {
        ...toolCall,
        error: `Unknown tool: ${toolCall.name}`,
        executionTime: performance.now() - startTime
      };
    }

    try {
      // Apply timeout
      const timeout = tool.maxExecutionTime || 30000;
      const result = await Promise.race([
        tool.handler(toolCall.arguments),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
        )
      ]);

      return {
        ...toolCall,
        result,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        ...toolCall,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        executionTime: performance.now() - startTime
      };
    }
  }

  async completeWithTools(
    messages: ChatCompletionMessageParam[],
    sessionId?: string
  ): Promise<ToolCall[]> {
    const chunks: StreamChunk[] = [];
    
    for await (const chunk of this.streamCompletion(messages, sessionId)) {
      chunks.push(chunk);
    }

    return chunks
      .filter(chunk => chunk.type === 'tool_call')
      .map(chunk => chunk.toolCall!)
      .filter(Boolean);
  }

  cancelStream(sessionId: string): void {
    const streamIds = Array.from(this.activeStreams).filter(id => id.startsWith(sessionId));
    streamIds.forEach(id => {
      this.activeStreams.delete(id);
      openaiActiveStreams.dec();
    });
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  getConfig(): OpenAIConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.apiKey) {
      this.client = new OpenAI({
        apiKey: updates.apiKey,
        timeout: this.config.timeout,
        maxRetries: 0,
      });
    }
  }
}