/**
 * Base Provider Abstract Class
 * 
 * Foundation for all AI model providers with common functionality,
 * error handling, retry logic, and performance monitoring.
 */

import { 
  ProviderInterface, 
  ProviderConfig, 
  ModelRequest, 
  ModelResponse, 
  StreamChunk,
  ProviderHealth,
  PerformanceMetrics,
  ModelDefinition,
  RateLimitConfig,
  ChatMessage,
  TokenUsage,
  ResponseMetadata
} from '../types';

export abstract class BaseProvider implements ProviderInterface {
  protected config: ProviderConfig;
  protected models: Map<string, ModelDefinition> = new Map();
  protected metrics: PerformanceMetrics;
  protected lastHealthCheck: number = 0;
  protected isInitialized: boolean = false;
  
  constructor(config: ProviderConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  abstract get id(): string;
  abstract get name(): string;

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Load and register models
    for (const model of config.models) {
      this.models.set(model.id, model);
    }
    
    // Perform initial health check
    await this.healthCheck();
    
    this.isInitialized = true;
  }

  abstract chat(request: ModelRequest): Promise<ModelResponse>;
  abstract stream(request: ModelRequest): AsyncGenerator<StreamChunk>;

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Perform provider-specific health check
      const isHealthy = await this.performHealthCheck();
      const latency = Date.now() - startTime;
      
      this.lastHealthCheck = Date.now();
      
      return {
        providerId: this.id,
        status: isHealthy ? 'healthy' : 'unhealthy',
        latency,
        errorRate: this.calculateErrorRate(),
        lastCheck: this.lastHealthCheck,
        availability: this.calculateAvailability(),
        rateLimitRemaining: await this.getRateLimitRemaining(),
        rateLimitReset: await this.getRateLimitReset()
      };
    } catch (error) {
      return {
        providerId: this.id,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        errorRate: 1.0,
        lastCheck: Date.now(),
        availability: 0,
        rateLimitRemaining: 0,
        rateLimitReset: Date.now() + 60000
      };
    }
  }

  async getMetrics(): Promise<PerformanceMetrics> {
    return { ...this.metrics, lastUpdated: Date.now() };
  }

  async listModels(): Promise<ModelDefinition[]> {
    return Array.from(this.models.values());
  }

  async getModel(modelId: string): Promise<ModelDefinition | null> {
    return this.models.get(modelId) || null;
  }

  async estimateCost(messages: ChatMessage[], model?: string): Promise<number> {
    const modelDef = model ? this.models.get(model) : this.getDefaultModel();
    if (!modelDef) {
      throw new Error(`Model ${model} not found`);
    }

    const inputTokens = this.estimateTokens(messages);
    const outputTokens = Math.min(inputTokens * 0.5, modelDef.maxTokens * 0.3); // Estimate
    
    const inputCost = (inputTokens / 1000) * modelDef.inputCostPer1k;
    const outputCost = (outputTokens / 1000) * modelDef.outputCostPer1k;
    
    return inputCost + outputCost;
  }

  async getRateLimits(): Promise<RateLimitConfig> {
    return this.config.rateLimit;
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
    // Cleanup provider-specific resources
  }

  // Protected helper methods
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`Provider ${this.id} is not initialized`);
    }
  }

  protected createResponseMetadata(
    model: string,
    startTime: number,
    cost: number,
    cached = false,
    requestId?: string
  ): ResponseMetadata {
    return {
      model,
      providerId: this.id,
      latency: Date.now() - startTime,
      cost,
      cached,
      timestamp: Date.now(),
      requestId: requestId || this.generateRequestId()
    };
  }

  protected updateMetrics(
    success: boolean,
    latency: number,
    cost: number,
    tokens: number
  ): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update averages
    const total = this.metrics.totalRequests;
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (total - 1) + latency) / total;
    this.metrics.averageCost = 
      (this.metrics.averageCost * (total - 1) + cost) / total;
    
    this.metrics.totalCost += cost;
    this.metrics.tokensProcessed += tokens;
    this.metrics.errorRate = this.metrics.failedRequests / total;
  }

  protected generateRequestId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected getDefaultModel(): ModelDefinition | undefined {
    return Array.from(this.models.values())[0];
  }

  protected estimateTokens(messages: ChatMessage[]): number {
    // Simple token estimation - should be overridden by providers
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }

  protected createTokenUsage(
    promptTokens: number, 
    completionTokens: number
  ): TokenUsage {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          30000
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  protected isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const retryableMessages = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit'
    ];
    
    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }
    
    const message = (error.message || '').toLowerCase();
    return retryableMessages.some(keyword => message.includes(keyword));
  }

  // Abstract methods that must be implemented by each provider
  protected abstract performHealthCheck(): Promise<boolean>;
  protected abstract getRateLimitRemaining(): Promise<number>;
  protected abstract getRateLimitReset(): Promise<number>;

  // Private helper methods
  private initializeMetrics(): PerformanceMetrics {
    return {
      providerId: this.id,
      modelId: '',
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      averageCost: 0,
      totalCost: 0,
      tokensProcessed: 0,
      errorRate: 0,
      cacheHitRate: 0,
      lastUpdated: Date.now()
    };
  }

  private calculateErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.failedRequests / this.metrics.totalRequests;
  }

  private calculateAvailability(): number {
    // Simple availability calculation based on recent health checks
    // This would be more sophisticated in production
    const recentErrors = this.calculateErrorRate();
    return Math.max(0, 1 - recentErrors);
  }
}