/**
 * Configuration Validation
 * 
 * Validates AI Model Hub configuration for correctness
 * and optimal performance settings.
 */

import { HubConfig, ProviderConfig } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(config: HubConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate router configuration
  if (config.router.costThreshold <= 0) {
    errors.push('Router cost threshold must be positive');
  }

  if (config.router.latencyThreshold <= 0) {
    errors.push('Router latency threshold must be positive');
  }

  if (config.router.qualityThreshold < 0 || config.router.qualityThreshold > 1) {
    errors.push('Router quality threshold must be between 0 and 1');
  }

  // Validate cache configuration
  if (config.cache.ttl <= 0) {
    errors.push('Cache TTL must be positive');
  }

  if (config.cache.maxSize <= 0) {
    errors.push('Cache max size must be positive');
  }

  // Validate budget configuration
  if (config.budget.dailyLimit && config.budget.dailyLimit <= 0) {
    errors.push('Daily budget limit must be positive');
  }

  if (config.budget.monthlyLimit && config.budget.monthlyLimit <= 0) {
    errors.push('Monthly budget limit must be positive');
  }

  if (config.budget.perRequestLimit && config.budget.perRequestLimit <= 0) {
    errors.push('Per-request budget limit must be positive');
  }

  // Validate threshold percentages
  if (config.budget.warningThreshold && 
      (config.budget.warningThreshold < 0 || config.budget.warningThreshold > 100)) {
    errors.push('Warning threshold must be between 0 and 100');
  }

  if (config.budget.criticalThreshold && 
      (config.budget.criticalThreshold < 0 || config.budget.criticalThreshold > 100)) {
    errors.push('Critical threshold must be between 0 and 100');
  }

  // Validate providers
  if (config.providers.length === 0) {
    errors.push('At least one provider must be configured');
  }

  for (const provider of config.providers) {
    const providerErrors = validateProvider(provider);
    errors.push(...providerErrors);
  }

  // Performance warnings
  if (config.router.costThreshold > 0.1) {
    warnings.push('High cost threshold may lead to expensive requests');
  }

  if (config.router.latencyThreshold > 30000) {
    warnings.push('High latency threshold may impact user experience');
  }

  if (config.cache.ttl > 86400) {
    warnings.push('Very long cache TTL may serve stale responses');
  }

  if (config.monitoring.healthCheckInterval < 10) {
    warnings.push('Very frequent health checks may impact performance');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateProvider(provider: ProviderConfig): string[] {
  const errors: string[] = [];

  if (!provider.id) {
    errors.push('Provider ID is required');
  }

  if (!provider.type) {
    errors.push('Provider type is required');
  }

  if (!['openai', 'anthropic', 'google', 'local', 'replicate'].includes(provider.type)) {
    errors.push(`Unsupported provider type: ${provider.type}`);
  }

  // Validate rate limits
  if (provider.rateLimit.requestsPerMinute <= 0) {
    errors.push(`Provider ${provider.id}: requests per minute must be positive`);
  }

  if (provider.rateLimit.tokensPerMinute <= 0) {
    errors.push(`Provider ${provider.id}: tokens per minute must be positive`);
  }

  if (provider.rateLimit.concurrentRequests <= 0) {
    errors.push(`Provider ${provider.id}: concurrent requests must be positive`);
  }

  // Validate pricing
  if (provider.pricing.inputTokenCost < 0) {
    errors.push(`Provider ${provider.id}: input token cost cannot be negative`);
  }

  if (provider.pricing.outputTokenCost < 0) {
    errors.push(`Provider ${provider.id}: output token cost cannot be negative`);
  }

  // Validate priority
  if (provider.priority < 1 || provider.priority > 10) {
    errors.push(`Provider ${provider.id}: priority must be between 1 and 10`);
  }

  return errors;
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    errors.push('At least one AI provider API key must be set');
  }

  // Check optional but recommended environment variables
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    warnings.push('Redis not configured - caching will use memory only');
  }

  if (!process.env.PROMETHEUS_ENABLED) {
    warnings.push('Prometheus metrics not enabled');
  }

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    errors.push('Node.js 18 or higher is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}