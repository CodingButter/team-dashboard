/**
 * Intelligent AI Model Router
 * 
 * Advanced routing engine with cost optimization, performance selection,
 * automatic fallback, and load balancing across multiple AI providers.
 */

import {
  RouterConfig,
  ModelRequest,
  RouterDecision,
  ModelDefinition,
  ProviderInterface,
  ProviderHealth,
  PerformanceMetrics,
  LoadBalancingStrategy
} from './types';

interface RouterState {
  providers: Map<string, ProviderInterface>;
  models: Map<string, ModelDefinition>;
  health: Map<string, ProviderHealth>;
  metrics: Map<string, PerformanceMetrics>;
  loadBalancer: LoadBalancer;
  requestHistory: RequestAnalytics;
}

interface RequestAnalytics {
  totalRequests: number;
  providerUsage: Map<string, number>;
  modelUsage: Map<string, number>;
  averageCosts: Map<string, number>;
  averageLatencies: Map<string, number>;
}

interface LoadBalancer {
  strategy: LoadBalancingStrategy;
  weights: Map<string, number>;
  connections: Map<string, number>;
  lastUsed: Map<string, number>;
}

export class IntelligentRouter {
  private config: RouterConfig;
  private state: RouterState;
  private fallbackChain: Map<string, string[]> = new Map();

  constructor(config: RouterConfig) {
    this.config = config;
    this.state = {
      providers: new Map(),
      models: new Map(),
      health: new Map(),
      metrics: new Map(),
      loadBalancer: {
        strategy: config.loadBalancing,
        weights: new Map(),
        connections: new Map(),
        lastUsed: new Map()
      },
      requestHistory: {
        totalRequests: 0,
        providerUsage: new Map(),
        modelUsage: new Map(),
        averageCosts: new Map(),
        averageLatencies: new Map()
      }
    };
    
    this.initializeFallbackChains();
  }

  async registerProvider(provider: ProviderInterface): Promise<void> {
    this.state.providers.set(provider.id, provider);
    
    // Register provider models
    const models = await provider.listModels();
    for (const model of models) {
      this.state.models.set(model.id, model);
    }
    
    // Initialize load balancer weights
    this.state.loadBalancer.weights.set(provider.id, 1.0);
    this.state.loadBalancer.connections.set(provider.id, 0);
    this.state.loadBalancer.lastUsed.set(provider.id, 0);
    
    // Update health and metrics
    await this.updateProviderHealth(provider.id);
    await this.updateProviderMetrics(provider.id);
  }

  async selectModel(request: ModelRequest): Promise<RouterDecision> {
    const startTime = performance.now();
    
    try {
      // If specific model requested, validate and return
      if (request.model) {
        return await this.selectSpecificModel(request);
      }

      // Filter available models based on requirements
      const eligibleModels = await this.filterEligibleModels(request);
      
      if (eligibleModels.length === 0) {
        throw new Error('No models match the specified requirements');
      }

      // Score and rank models based on strategy
      const scoredModels = await this.scoreModels(eligibleModels, request);
      
      // Apply load balancing
      const selectedModel = await this.applyLoadBalancing(scoredModels, request);
      
      // Build decision with reasoning
      const decision = await this.buildRouterDecision(
        selectedModel,
        scoredModels,
        request,
        performance.now() - startTime
      );

      // Update analytics
      this.updateRequestAnalytics(decision);

      return decision;

    } catch (error) {
      throw new Error(`Router selection failed: ${error}`);
    }
  }

  async updateHealth(): Promise<void> {
    const healthPromises = Array.from(this.state.providers.entries()).map(
      async ([providerId, provider]) => {
        try {
          const health = await provider.healthCheck();
          this.state.health.set(providerId, health);
          
          // Update load balancer weights based on health
          this.updateLoadBalancerWeights(providerId, health);
        } catch (error) {
          console.error(`Failed to update health for provider ${providerId}:`, error);
        }
      }
    );

    await Promise.allSettled(healthPromises);
  }

  async updateMetrics(): Promise<void> {
    const metricsPromises = Array.from(this.state.providers.entries()).map(
      async ([providerId, provider]) => {
        try {
          const metrics = await provider.getMetrics();
          this.state.metrics.set(providerId, metrics);
        } catch (error) {
          console.error(`Failed to update metrics for provider ${providerId}:`, error);
        }
      }
    );

    await Promise.allSettled(metricsPromises);
  }

  getAnalytics(): RequestAnalytics {
    return { ...this.state.requestHistory };
  }

  updateConfig(updates: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (updates.loadBalancing) {
      this.state.loadBalancer.strategy = updates.loadBalancing;
    }
    
    if (updates.fallbackChain) {
      this.initializeFallbackChains();
    }
  }

  // Private methods
  private async selectSpecificModel(request: ModelRequest): Promise<RouterDecision> {
    const model = this.state.models.get(request.model!);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    const provider = this.state.providers.get(model.providerId);
    if (!provider) {
      throw new Error(`Provider ${model.providerId} not available`);
    }

    const health = this.state.health.get(model.providerId);
    if (health?.status === 'unhealthy') {
      throw new Error(`Provider ${model.providerId} is unhealthy`);
    }

    const estimatedCost = await provider.estimateCost(request.messages, request.model);
    
    return {
      selectedModel: model.id,
      providerId: model.providerId,
      reasoning: [`Specific model requested: ${model.id}`],
      alternativeModels: [],
      estimatedCost,
      estimatedLatency: model.averageLatency,
      qualityScore: 1.0,
      confidence: 1.0
    };
  }

  private async filterEligibleModels(request: ModelRequest): Promise<ModelDefinition[]> {
    const requirements = request.requirements || {};
    const eligible: ModelDefinition[] = [];

    for (const model of this.state.models.values()) {
      // Check provider health
      const health = this.state.health.get(model.providerId);
      if (health?.status === 'unhealthy') continue;

      // Check excluded providers
      if (requirements.excludeProviders?.includes(model.providerId)) continue;

      // Check preferred provider
      if (requirements.preferredProvider && 
          model.providerId !== requirements.preferredProvider) continue;

      // Check required capabilities
      if (requirements.requiredCapabilities?.length) {
        const hasAllCapabilities = requirements.requiredCapabilities.every(
          cap => model.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) continue;
      }

      // Check required features
      if (requirements.requiredFeatures?.length) {
        const hasAllFeatures = requirements.requiredFeatures.every(
          feature => model.supportedFeatures.includes(feature)
        );
        if (!hasAllFeatures) continue;
      }

      // Check cost constraints
      if (requirements.maxCost) {
        const provider = this.state.providers.get(model.providerId);
        if (provider) {
          const estimatedCost = await provider.estimateCost(request.messages, model.id);
          if (estimatedCost > requirements.maxCost) continue;
        }
      }

      // Check latency constraints
      if (requirements.maxLatency && model.averageLatency > requirements.maxLatency) {
        continue;
      }

      eligible.push(model);
    }

    return eligible;
  }

  private async scoreModels(
    models: ModelDefinition[], 
    request: ModelRequest
  ): Promise<Array<{ model: ModelDefinition; score: number; details: any }>> {
    const scored = [];

    for (const model of models) {
      const provider = this.state.providers.get(model.providerId);
      if (!provider) continue;

      const health = this.state.health.get(model.providerId);
      const metrics = this.state.metrics.get(model.providerId);

      const score = await this.calculateModelScore(model, provider, health, metrics, request);
      
      scored.push({
        model,
        score: score.total,
        details: score
      });
    }

    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  private async calculateModelScore(
    model: ModelDefinition,
    provider: ProviderInterface,
    health: ProviderHealth | undefined,
    metrics: PerformanceMetrics | undefined,
    request: ModelRequest
  ): Promise<any> {
    const weights = this.getStrategyWeights();
    const estimatedCost = await provider.estimateCost(request.messages, model.id);
    
    // Normalize scores (0-1)
    const costScore = this.calculateCostScore(estimatedCost, model);
    const performanceScore = this.calculatePerformanceScore(model, metrics);
    const qualityScore = this.calculateQualityScore(model);
    const healthScore = this.calculateHealthScore(health);
    const loadScore = this.calculateLoadScore(model.providerId);

    const total = (
      costScore * weights.cost +
      performanceScore * weights.performance +
      qualityScore * weights.quality +
      healthScore * weights.health +
      loadScore * weights.load
    );

    return {
      total,
      cost: costScore,
      performance: performanceScore,
      quality: qualityScore,
      health: healthScore,
      load: loadScore,
      estimatedCost,
      estimatedLatency: model.averageLatency
    };
  }

  private getStrategyWeights(): any {
    switch (this.config.strategy) {
      case 'cost-optimized':
        return { cost: 0.5, performance: 0.2, quality: 0.1, health: 0.1, load: 0.1 };
      case 'performance-first':
        return { cost: 0.1, performance: 0.5, quality: 0.2, health: 0.1, load: 0.1 };
      case 'quality-first':
        return { cost: 0.1, performance: 0.2, quality: 0.5, health: 0.1, load: 0.1 };
      case 'balanced':
        return { cost: 0.25, performance: 0.25, quality: 0.25, health: 0.15, load: 0.1 };
      default:
        return { cost: 0.2, performance: 0.2, quality: 0.2, health: 0.2, load: 0.2 };
    }
  }

  private calculateCostScore(cost: number, _model: ModelDefinition): number {
    // Lower cost = higher score
    const maxCost = Math.max(this.config.costThreshold, cost * 2);
    return Math.max(0, 1 - (cost / maxCost));
  }

  private calculatePerformanceScore(
    model: ModelDefinition, 
    metrics: PerformanceMetrics | undefined
  ): number {
    const latency = metrics?.averageLatency || model.averageLatency;
    const maxLatency = Math.max(this.config.latencyThreshold, latency * 2);
    
    // Lower latency = higher score
    return Math.max(0, 1 - (latency / maxLatency));
  }

  private calculateQualityScore(model: ModelDefinition): number {
    // Quality heuristic based on model characteristics
    const capabilityScore = model.capabilities.length / 6; // Normalize by max capabilities
    const contextScore = Math.min(model.contextWindow / 128000, 1); // Normalize by large context
    const featureScore = model.supportedFeatures.length / 8; // Normalize by max features
    
    return (capabilityScore + contextScore + featureScore) / 3;
  }

  private calculateHealthScore(health: ProviderHealth | undefined): number {
    if (!health) return 0.5; // Neutral if no health data
    
    switch (health.status) {
      case 'healthy': return 1.0;
      case 'degraded': return 0.6;
      case 'unhealthy': return 0.0;
      default: return 0.5;
    }
  }

  private calculateLoadScore(providerId: string): number {
    const connections = this.state.loadBalancer.connections.get(providerId) || 0;
    const weight = this.state.loadBalancer.weights.get(providerId) || 1.0;
    
    // Lower load = higher score
    const maxConnections = 100; // Arbitrary max for normalization
    const loadRatio = connections / maxConnections;
    
    return Math.max(0, (1 - loadRatio) * weight);
  }

  private async applyLoadBalancing(
    scoredModels: Array<{ model: ModelDefinition; score: number; details: any }>,
    _request: ModelRequest
  ): Promise<ModelDefinition> {
    if (scoredModels.length === 0) {
      throw new Error('No models available for load balancing');
    }

    switch (this.state.loadBalancer.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(scoredModels);
      
      case 'least-connections':
        return this.leastConnectionsSelection(scoredModels);
      
      case 'weighted-round-robin':
        return this.weightedRoundRobinSelection(scoredModels);
      
      case 'performance-based':
      default:
        return scoredModels[0].model; // Highest scored model
    }
  }

  private roundRobinSelection(
    scoredModels: Array<{ model: ModelDefinition; score: number; details: any }>
  ): ModelDefinition {
    // Select based on least recently used
    let selectedModel = scoredModels[0].model;
    let oldestTime = Date.now();

    for (const { model } of scoredModels) {
      const lastUsed = this.state.loadBalancer.lastUsed.get(model.providerId) || 0;
      if (lastUsed < oldestTime) {
        oldestTime = lastUsed;
        selectedModel = model;
      }
    }

    return selectedModel;
  }

  private leastConnectionsSelection(
    scoredModels: Array<{ model: ModelDefinition; score: number; details: any }>
  ): ModelDefinition {
    let selectedModel = scoredModels[0].model;
    let minConnections = Number.MAX_SAFE_INTEGER;

    for (const { model } of scoredModels) {
      const connections = this.state.loadBalancer.connections.get(model.providerId) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedModel = model;
      }
    }

    return selectedModel;
  }

  private weightedRoundRobinSelection(
    scoredModels: Array<{ model: ModelDefinition; score: number; details: any }>
  ): ModelDefinition {
    // Weighted selection based on scores
    const totalScore = scoredModels.reduce((sum, { score }) => sum + score, 0);
    const random = Math.random() * totalScore;
    
    let cumulative = 0;
    for (const { model, score } of scoredModels) {
      cumulative += score;
      if (random <= cumulative) {
        return model;
      }
    }

    return scoredModels[0].model;
  }

  private async buildRouterDecision(
    model: ModelDefinition,
    scoredModels: Array<{ model: ModelDefinition; score: number; details: any }>,
    request: ModelRequest,
    selectionTime: number
  ): Promise<RouterDecision> {
    const provider = this.state.providers.get(model.providerId)!;
    const estimatedCost = await provider.estimateCost(request.messages, model.id);
    const selectedScore = scoredModels.find(s => s.model.id === model.id);
    
    const reasoning = [
      `Strategy: ${this.config.strategy}`,
      `Selection time: ${selectionTime.toFixed(2)}ms`,
      `Score: ${selectedScore?.score.toFixed(3) || 'N/A'}`,
      `Estimated cost: $${estimatedCost.toFixed(6)}`,
      `Estimated latency: ${model.averageLatency}ms`
    ];

    const alternatives = scoredModels
      .slice(1, 4) // Top 3 alternatives
      .map(s => s.model.id);

    return {
      selectedModel: model.id,
      providerId: model.providerId,
      reasoning,
      alternativeModels: alternatives,
      estimatedCost,
      estimatedLatency: model.averageLatency,
      qualityScore: selectedScore?.details.quality || 0,
      confidence: Math.min(selectedScore?.score || 0, 1.0)
    };
  }

  private updateRequestAnalytics(decision: RouterDecision): void {
    this.state.requestHistory.totalRequests++;
    
    // Update provider usage
    const providerUsage = this.state.requestHistory.providerUsage.get(decision.providerId) || 0;
    this.state.requestHistory.providerUsage.set(decision.providerId, providerUsage + 1);
    
    // Update model usage
    const modelUsage = this.state.requestHistory.modelUsage.get(decision.selectedModel) || 0;
    this.state.requestHistory.modelUsage.set(decision.selectedModel, modelUsage + 1);
    
    // Update average costs
    const avgCost = this.state.requestHistory.averageCosts.get(decision.selectedModel) || 0;
    const newAvgCost = (avgCost + decision.estimatedCost) / 2;
    this.state.requestHistory.averageCosts.set(decision.selectedModel, newAvgCost);
    
    // Update average latencies
    const avgLatency = this.state.requestHistory.averageLatencies.get(decision.selectedModel) || 0;
    const newAvgLatency = (avgLatency + decision.estimatedLatency) / 2;
    this.state.requestHistory.averageLatencies.set(decision.selectedModel, newAvgLatency);
  }

  private updateLoadBalancerWeights(providerId: string, health: ProviderHealth): void {
    let weight = 1.0;
    
    switch (health.status) {
      case 'healthy':
        weight = 1.0;
        break;
      case 'degraded':
        weight = 0.5;
        break;
      case 'unhealthy':
        weight = 0.1;
        break;
    }
    
    // Adjust based on error rate
    weight *= Math.max(0.1, 1 - health.errorRate);
    
    this.state.loadBalancer.weights.set(providerId, weight);
  }

  private async updateProviderHealth(providerId: string): Promise<void> {
    const provider = this.state.providers.get(providerId);
    if (!provider) return;
    
    try {
      const health = await provider.healthCheck();
      this.state.health.set(providerId, health);
    } catch (error) {
      console.error(`Failed to update health for ${providerId}:`, error);
    }
  }

  private async updateProviderMetrics(providerId: string): Promise<void> {
    const provider = this.state.providers.get(providerId);
    if (!provider) return;
    
    try {
      const metrics = await provider.getMetrics();
      this.state.metrics.set(providerId, metrics);
    } catch (error) {
      console.error(`Failed to update metrics for ${providerId}:`, error);
    }
  }

  private initializeFallbackChains(): void {
    // Default fallback chains based on provider reliability and cost
    this.fallbackChain.set('openai', ['gpt-4o-mini', 'gpt-3.5-turbo']);
    this.fallbackChain.set('anthropic', ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022']);
    
    // Custom fallback chain from config
    if (this.config.fallbackChain.length > 0) {
      this.fallbackChain.set('custom', this.config.fallbackChain);
    }
  }
}