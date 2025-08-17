/**
 * Default Configuration for AI Model Hub
 * 
 * Production-ready defaults with performance optimization
 * and cost-effective routing strategies.
 */

import { HubConfig, RouterConfig, CacheConfig, MonitoringConfig, BudgetLimits } from '../types';

export const createDefaultRouterConfig = (): RouterConfig => ({
  strategy: 'balanced',
  costThreshold: 0.01,        // $0.01 max per request
  latencyThreshold: 5000,     // 5 seconds max latency
  qualityThreshold: 0.7,      // 70% min quality score
  enableFallback: true,
  fallbackChain: [
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'claude-3-5-haiku-20241022'
  ],
  loadBalancing: 'performance-based',
  cacheEnabled: true,
  cacheTTL: 3600              // 1 hour cache TTL
});

export const createDefaultCacheConfig = (): CacheConfig => ({
  enabled: true,
  ttl: 3600,                  // 1 hour
  maxSize: 100,               // 100MB max cache size
  strategy: 'lru',
  compression: true
});

export const createDefaultMonitoringConfig = (): MonitoringConfig => ({
  metricsEnabled: true,
  healthCheckInterval: 30,    // 30 seconds
  alertThresholds: {
    errorRate: 5.0,           // 5% error rate threshold
    latency: 10000,           // 10 second latency threshold
    availability: 95.0,       // 95% availability threshold
    costIncrease: 50.0        // 50% cost increase threshold
  },
  exportPrometheus: true,
  logLevel: 'info'
});

export const createDefaultBudgetLimits = (): BudgetLimits => ({
  dailyLimit: 50.0,           // $50 daily limit
  monthlyLimit: 1000.0,       // $1000 monthly limit
  perRequestLimit: 0.10,      // $0.10 per request limit
  warningThreshold: 80,       // 80% warning threshold
  criticalThreshold: 95       // 95% critical threshold
});

export const createDefaultConfig = (): HubConfig => ({
  router: createDefaultRouterConfig(),
  cache: createDefaultCacheConfig(),
  monitoring: createDefaultMonitoringConfig(),
  budget: createDefaultBudgetLimits(),
  providers: [
    {
      id: 'openai-primary',
      type: 'openai',
      name: 'OpenAI Primary',
      models: [], // Will be populated during initialization
      rateLimit: {
        requestsPerMinute: 3500,
        tokensPerMinute: 350000,
        tokensPerDay: 10000000,
        concurrentRequests: 100
      },
      pricing: {
        inputTokenCost: 0.005,    // GPT-4o pricing
        outputTokenCost: 0.015
      },
      capabilities: ['text-generation', 'code-generation', 'function-calling', 'vision'],
      priority: 8,
      timeout: 60000,
      maxRetries: 3
    },
    {
      id: 'anthropic-primary',
      type: 'anthropic',
      name: 'Anthropic Primary',
      models: [], // Will be populated during initialization
      rateLimit: {
        requestsPerMinute: 1000,
        tokensPerMinute: 200000,
        tokensPerDay: 5000000,
        concurrentRequests: 50
      },
      pricing: {
        inputTokenCost: 0.003,    // Claude 3.5 Sonnet pricing
        outputTokenCost: 0.015
      },
      capabilities: ['text-generation', 'code-generation', 'function-calling', 'vision'],
      priority: 7,
      timeout: 60000,
      maxRetries: 3
    }
  ]
});

export const createDevelopmentConfig = (): HubConfig => {
  const config = createDefaultConfig();
  
  // Development-specific overrides
  config.budget.dailyLimit = 10.0;       // Lower limits for dev
  config.budget.monthlyLimit = 100.0;
  config.monitoring.healthCheckInterval = 60; // Less frequent checks
  config.cache.ttl = 300;                 // 5 minute cache for dev
  
  return config;
};

export const createProductionConfig = (): HubConfig => {
  const config = createDefaultConfig();
  
  // Production-specific overrides
  config.budget.dailyLimit = 200.0;      // Higher limits for production
  config.budget.monthlyLimit = 5000.0;
  config.monitoring.healthCheckInterval = 15; // More frequent checks
  config.cache.maxSize = 500;             // Larger cache
  config.router.costThreshold = 0.05;     // Higher cost tolerance
  
  return config;
};

export const createCostOptimizedConfig = (): HubConfig => {
  const config = createDefaultConfig();
  
  // Cost optimization overrides
  config.router.strategy = 'cost-optimized';
  config.router.costThreshold = 0.005;    // Very low cost threshold
  config.budget.perRequestLimit = 0.02;   // Lower per-request limit
  config.cache.ttl = 7200;                // Longer cache for cost savings
  
  // Prioritize cheaper models in fallback
  config.router.fallbackChain = [
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'claude-3-5-haiku-20241022'
  ];
  
  return config;
};

export const createPerformanceOptimizedConfig = (): HubConfig => {
  const config = createDefaultConfig();
  
  // Performance optimization overrides
  config.router.strategy = 'performance-first';
  config.router.latencyThreshold = 2000;  // Strict latency requirement
  config.monitoring.healthCheckInterval = 10; // Frequent health checks
  config.cache.strategy = 'lfu';           // Least frequently used cache
  
  // Prioritize faster models
  config.router.fallbackChain = [
    'gpt-4o-mini',
    'claude-3-5-haiku-20241022',
    'gpt-3.5-turbo'
  ];
  
  return config;
};