/**
 * AI Model Integration Hub - Main Orchestrator
 * 
 * Central hub for managing multiple AI providers with intelligent routing,
 * caching, monitoring, and cost optimization.
 */

import { EventEmitter } from 'events';
import { IntelligentRouter } from './router';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import {
  ModelHubInterface,
  HubConfig,
  ProviderInterface,
  ProviderConfig,
  ModelRequest,
  ModelResponse,
  StreamChunk,
  RouterDecision,
  ModelBenchmark,
  PerformanceMetrics,
  CostAnalysis,
  ProviderHealth,
  BudgetLimits,
  CacheEntry,
  BudgetAlert
} from './types';

export class AIModelHub extends EventEmitter implements ModelHubInterface {
  private config: HubConfig;
  private router: IntelligentRouter;
  private providers: Map<string, ProviderInterface> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private budgetTracker: BudgetTracker;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: HubConfig) {
    super();
    this.config = config;
    this.router = new IntelligentRouter(config.router);
    this.budgetTracker = new BudgetTracker(config.budget);
    
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize providers from config
      for (const providerConfig of this.config.providers) {
        await this.initializeProvider(providerConfig);
      }

      // Start monitoring
      if (this.config.monitoring.metricsEnabled) {
        this.startMonitoring();
      }

      this.isRunning = true;
      this.emit('initialized', { providers: this.providers.size });
      
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  async registerProvider(provider: ProviderInterface, config: ProviderConfig): Promise<void> {
    try {
      await provider.initialize(config);
      this.providers.set(provider.id, provider);
      await this.router.registerProvider(provider);
      
      this.emit('provider_registered', { providerId: provider.id, config });
      
    } catch (error) {
      this.emit('error', { type: 'provider_registration', providerId: provider.id, error });
      throw error;
    }
  }

  async unregisterProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      await provider.shutdown();
      this.providers.delete(providerId);
      
      this.emit('provider_unregistered', { providerId });
      
    } catch (error) {
      this.emit('error', { type: 'provider_unregistration', providerId, error });
      throw error;
    }
  }

  async listProviders(): Promise<ProviderConfig[]> {
    return this.config.providers;
  }

  async chat(request: ModelRequest): Promise<ModelResponse> {
    if (!this.isRunning) {
      throw new Error('Model hub is not running');
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check budget constraints
      await this.budgetTracker.checkBudget(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.config.cache.enabled) {
        const cachedResponse = this.getFromCache(cacheKey);
        if (cachedResponse) {
          this.emit('cache_hit', { requestId, cacheKey });
          return { ...cachedResponse, cached: true };
        }
      }

      // Route to best model
      const decision = await this.router.selectModel(request);
      this.emit('model_selected', { requestId, decision });

      // Get provider and execute request
      const provider = this.providers.get(decision.providerId);
      if (!provider) {
        throw new Error(`Provider ${decision.providerId} not available`);
      }

      // Execute with fallback
      const response = await this.executeWithFallback(
        provider,
        { ...request, model: decision.selectedModel },
        decision
      );

      // Update budget tracking
      await this.budgetTracker.recordUsage(response.cost);

      // Cache the response
      if (this.config.cache.enabled && response.finishReason === 'stop') {
        this.addToCache(cacheKey, response);
      }

      // Emit metrics
      this.emit('request_completed', {
        requestId,
        providerId: decision.providerId,
        model: decision.selectedModel,
        latency: Date.now() - startTime,
        cost: response.cost,
        cached: false
      });

      return response;

    } catch (error) {
      this.emit('request_failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime
      });
      throw error;
    }
  }

  async *stream(request: ModelRequest): AsyncGenerator<StreamChunk> {
    if (!this.isRunning) {
      throw new Error('Model hub is not running');
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check budget constraints
      await this.budgetTracker.checkBudget(request);

      // Route to best model
      const decision = await this.router.selectModel(request);
      this.emit('stream_started', { requestId, decision });

      // Get provider and execute request
      const provider = this.providers.get(decision.providerId);
      if (!provider) {
        throw new Error(`Provider ${decision.providerId} not available`);
      }

      let totalCost = 0;
      let completed = false;

      try {
        for await (const chunk of provider.stream({ ...request, model: decision.selectedModel })) {
          // Track cost
          if (chunk.metadata?.cost) {
            totalCost += chunk.metadata.cost;
          }

          // Check if streaming completed
          if (chunk.type === 'done') {
            completed = true;
            await this.budgetTracker.recordUsage(totalCost);
          }

          yield chunk;
        }

        if (completed) {
          this.emit('stream_completed', {
            requestId,
            providerId: decision.providerId,
            model: decision.selectedModel,
            latency: Date.now() - startTime,
            cost: totalCost
          });
        }

      } catch (error) {
        this.emit('stream_error', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
          latency: Date.now() - startTime
        });
        throw error;
      }

    } catch (error) {
      this.emit('stream_failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime
      });
      throw error;
    }
  }

  async selectModel(request: ModelRequest): Promise<RouterDecision> {
    return this.router.selectModel(request);
  }

  async benchmark(_modelIds?: string[]): Promise<ModelBenchmark[]> {
    // Implementation would run comprehensive benchmarks
    // For now, return empty array
    return [];
  }

  async getMetrics(): Promise<PerformanceMetrics[]> {
    const metrics: PerformanceMetrics[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        const providerMetrics = await provider.getMetrics();
        metrics.push(providerMetrics);
      } catch (error) {
        console.error(`Failed to get metrics for ${provider.id}:`, error);
      }
    }
    
    return metrics;
  }

  async getCostAnalysis(timeRange: string = '24h'): Promise<CostAnalysis> {
    return this.budgetTracker.getCostAnalysis(timeRange);
  }

  async getHealth(): Promise<ProviderHealth[]> {
    const healthChecks: ProviderHealth[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        const health = await provider.healthCheck();
        healthChecks.push(health);
      } catch (error) {
        healthChecks.push({
          providerId: provider.id,
          status: 'unhealthy',
          latency: 0,
          errorRate: 1.0,
          lastCheck: Date.now(),
          availability: 0,
          rateLimitRemaining: 0,
          rateLimitReset: Date.now() + 60000
        });
      }
    }
    
    return healthChecks;
  }

  async updateRouterConfig(config: Partial<typeof this.config.router>): Promise<void> {
    this.config.router = { ...this.config.router, ...config };
    this.router.updateConfig(this.config.router);
    
    this.emit('config_updated', { router: config });
  }

  async setBudgetLimits(limits: BudgetLimits): Promise<void> {
    this.config.budget = { ...this.config.budget, ...limits };
    this.budgetTracker.updateLimits(this.config.budget);
    
    this.emit('budget_updated', { limits });
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    const shutdownPromises = Array.from(this.providers.values()).map(
      provider => provider.shutdown().catch(error => 
        console.error(`Error shutting down provider ${provider.id}:`, error)
      )
    );

    await Promise.allSettled(shutdownPromises);
    
    this.emit('shutdown');
  }

  // Private helper methods
  private async initializeProvider(config: ProviderConfig): Promise<void> {
    let provider: ProviderInterface;

    switch (config.type) {
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    await this.registerProvider(provider, config);
  }

  private async executeWithFallback(
    provider: ProviderInterface,
    request: ModelRequest,
    decision: RouterDecision
  ): Promise<ModelResponse> {
    try {
      return await provider.chat(request);
    } catch (error) {
      // Try fallback models
      for (const fallbackModel of decision.alternativeModels) {
        try {
          const fallbackProvider = this.findProviderForModel(fallbackModel);
          if (fallbackProvider) {
            this.emit('fallback_triggered', {
              originalModel: decision.selectedModel,
              fallbackModel,
              error: error instanceof Error ? error.message : String(error)
            });
            
            return await fallbackProvider.chat({ ...request, model: fallbackModel });
          }
        } catch (fallbackError) {
          console.error(`Fallback to ${fallbackModel} failed:`, fallbackError);
        }
      }
      
      throw error; // All fallbacks failed
    }
  }

  private findProviderForModel(_modelId: string): ProviderInterface | null {
    for (const provider of this.providers.values()) {
      // This would need to check if provider supports the model
      // For now, return the first provider
      return provider;
    }
    return null;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: ModelRequest): string {
    const key = {
      messages: request.messages,
      model: request.model,
      maxTokens: request.maxTokens,
      temperature: request.temperature
    };
    
    return `cache_${Buffer.from(JSON.stringify(key)).toString('base64')}`;
  }

  private getFromCache(key: string): ModelResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.response;
  }

  private addToCache(key: string, response: ModelResponse): void {
    const entry: CacheEntry = {
      key,
      response,
      timestamp: Date.now(),
      ttl: this.config.cache.ttl * 1000,
      hitCount: 0,
      size: JSON.stringify(response).length
    };

    this.cache.set(key, entry);
    this.cleanupCache();
  }

  private cleanupCache(): void {
    // Simple LRU cleanup when cache gets too large
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 10%
      const toRemove = Math.floor(entries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  private startMonitoring(): void {
    const interval = this.config.monitoring.healthCheckInterval * 1000;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.router.updateHealth();
        await this.router.updateMetrics();
        
        // Check budget alerts
        const alerts = await this.budgetTracker.checkAlerts();
        for (const alert of alerts) {
          this.emit('budget_alert', alert);
        }
        
      } catch (error) {
        console.error('Monitoring update failed:', error);
      }
    }, interval);
  }

  private setupEventHandlers(): void {
    this.on('budget_alert', (alert: BudgetAlert) => {
      console.warn(`Budget Alert [${alert.type}]: ${alert.message}`);
    });

    this.on('error', (event) => {
      console.error(`Model Hub Error [${event.type}]:`, event.error);
    });
  }
}

// Budget tracking helper class
class BudgetTracker {
  private limits: BudgetLimits;
  private usage: {
    daily: number;
    monthly: number;
    lastReset: { daily: number; monthly: number };
  };

  constructor(limits: BudgetLimits) {
    this.limits = limits;
    this.usage = {
      daily: 0,
      monthly: 0,
      lastReset: {
        daily: Date.now(),
        monthly: Date.now()
      }
    };
  }

  async checkBudget(_request: ModelRequest): Promise<void> {
    this.resetUsageIfNeeded();

    if (this.limits.dailyLimit && this.usage.daily >= this.limits.dailyLimit) {
      throw new Error('Daily budget limit exceeded');
    }

    if (this.limits.monthlyLimit && this.usage.monthly >= this.limits.monthlyLimit) {
      throw new Error('Monthly budget limit exceeded');
    }
  }

  async recordUsage(cost: number): Promise<void> {
    this.usage.daily += cost;
    this.usage.monthly += cost;
  }

  async checkAlerts(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    
    if (this.limits.dailyLimit && this.limits.warningThreshold) {
      const threshold = this.limits.dailyLimit * (this.limits.warningThreshold / 100);
      if (this.usage.daily >= threshold) {
        alerts.push({
          type: 'warning',
          threshold,
          current: this.usage.daily,
          message: `Daily usage at ${((this.usage.daily / this.limits.dailyLimit) * 100).toFixed(1)}%`,
          timestamp: Date.now()
        });
      }
    }

    return alerts;
  }

  async getCostAnalysis(_timeRange: string): Promise<CostAnalysis> {
    // Simplified cost analysis
    return {
      totalCost: this.usage.daily,
      costByProvider: {},
      costByModel: {},
      estimatedMonthlyCost: this.usage.daily * 30,
      costPerRequest: 0,
      costPerToken: 0,
      savingsVsBaseline: 0,
      budgetAlerts: await this.checkAlerts()
    };
  }

  updateLimits(limits: BudgetLimits): void {
    this.limits = { ...this.limits, ...limits };
  }

  private resetUsageIfNeeded(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const monthMs = 30 * dayMs;

    // Reset daily usage
    if (now - this.usage.lastReset.daily > dayMs) {
      this.usage.daily = 0;
      this.usage.lastReset.daily = now;
    }

    // Reset monthly usage
    if (now - this.usage.lastReset.monthly > monthMs) {
      this.usage.monthly = 0;
      this.usage.lastReset.monthly = now;
    }
  }
}