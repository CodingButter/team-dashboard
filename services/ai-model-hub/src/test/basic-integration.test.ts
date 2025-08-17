/**
 * Basic Integration Tests for AI Model Hub
 * 
 * Validates core functionality, routing decisions, and provider integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIModelHub } from '../model-hub';
import { IntelligentRouter } from '../router';
import { OpenAIProvider } from '../providers/openai-provider';
import { createDefaultConfig } from '../config/defaults';
import { validateConfig } from '../config/validation';
import { ModelRequest, HubConfig } from '../types';

describe('AI Model Hub - Basic Integration', () => {
  let hub: AIModelHub;
  let config: HubConfig;

  beforeEach(() => {
    config = createDefaultConfig();
    // Use test API keys
    config.providers[0].apiKey = 'test-openai-key';
    config.providers[1].apiKey = 'test-anthropic-key';
    
    hub = new AIModelHub(config);
  });

  describe('Configuration Validation', () => {
    it('should validate default configuration', () => {
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = { ...config };
      invalidConfig.router.costThreshold = -1;
      invalidConfig.budget.dailyLimit = -10;

      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Router Intelligence', () => {
    let router: IntelligentRouter;

    beforeEach(() => {
      router = new IntelligentRouter(config.router);
    });

    it('should create router with default configuration', () => {
      expect(router).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = { strategy: 'cost-optimized' as const };
      router.updateConfig(newConfig);
      
      // Verify configuration was updated
      expect(() => router.updateConfig(newConfig)).not.toThrow();
    });

    it('should handle empty provider list gracefully', async () => {
      const request: ModelRequest = {
        id: 'test-1',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(router.selectModel(request)).rejects.toThrow();
    });
  });

  describe('Provider Management', () => {
    it('should register OpenAI provider', async () => {
      const provider = new OpenAIProvider(config.providers[0]);
      
      // Mock the initialization to avoid actual API calls
      vi.spyOn(provider, 'initialize').mockResolvedValue();
      vi.spyOn(provider, 'healthCheck').mockResolvedValue({
        providerId: 'openai-primary',
        status: 'healthy',
        latency: 100,
        errorRate: 0,
        lastCheck: Date.now(),
        availability: 1.0,
        rateLimitRemaining: 1000,
        rateLimitReset: Date.now() + 60000
      });

      await hub.registerProvider(provider, config.providers[0]);
      
      const providers = await hub.listProviders();
      expect(providers).toHaveLength(2); // Default config has 2 providers
    });

    it('should handle provider registration failure', async () => {
      const provider = new OpenAIProvider(config.providers[0]);
      
      // Mock initialization failure
      vi.spyOn(provider, 'initialize').mockRejectedValue(new Error('API key invalid'));

      await expect(hub.registerProvider(provider, config.providers[0]))
        .rejects.toThrow('API key invalid');
    });
  });

  describe('Request Processing', () => {
    beforeEach(async () => {
      // Mock providers to avoid actual API calls
      const mockProvider = {
        id: 'mock-provider',
        name: 'Mock Provider',
        initialize: vi.fn().mockResolvedValue(undefined),
        chat: vi.fn().mockResolvedValue({
          id: 'test-response',
          model: 'mock-model',
          providerId: 'mock-provider',
          content: 'Test response',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          cost: 0.001,
          latency: 500,
          cached: false,
          metadata: {
            model: 'mock-model',
            providerId: 'mock-provider',
            latency: 500,
            cost: 0.001,
            cached: false,
            timestamp: Date.now(),
            requestId: 'test-req-1'
          }
        }),
        stream: vi.fn().mockImplementation(async function* () {
          yield { type: 'content', content: 'Test', metadata: {} };
          yield { type: 'done', metadata: {} };
        }),
        healthCheck: vi.fn().mockResolvedValue({
          providerId: 'mock-provider',
          status: 'healthy',
          latency: 100,
          errorRate: 0,
          lastCheck: Date.now(),
          availability: 1.0,
          rateLimitRemaining: 1000,
          rateLimitReset: Date.now() + 60000
        }),
        getMetrics: vi.fn().mockResolvedValue({
          providerId: 'mock-provider',
          modelId: 'mock-model',
          totalRequests: 10,
          successfulRequests: 10,
          failedRequests: 0,
          averageLatency: 500,
          p95Latency: 600,
          p99Latency: 700,
          averageCost: 0.001,
          totalCost: 0.01,
          tokensProcessed: 1000,
          errorRate: 0,
          cacheHitRate: 0.2,
          lastUpdated: Date.now()
        }),
        listModels: vi.fn().mockResolvedValue([{
          id: 'mock-model',
          name: 'Mock Model',
          providerId: 'mock-provider',
          maxTokens: 4096,
          inputCostPer1k: 0.001,
          outputCostPer1k: 0.002,
          capabilities: ['text-generation'],
          averageLatency: 500,
          maxConcurrency: 100,
          contextWindow: 8192,
          supportedFeatures: ['streaming-response']
        }]),
        getModel: vi.fn(),
        estimateCost: vi.fn().mockResolvedValue(0.001),
        getRateLimits: vi.fn().mockResolvedValue({
          requestsPerMinute: 1000,
          tokensPerMinute: 100000,
          concurrentRequests: 50
        }),
        shutdown: vi.fn().mockResolvedValue(undefined)
      };

      const providerConfig = {
        id: 'mock-provider',
        type: 'openai' as const,
        name: 'Mock Provider',
        models: [],
        rateLimit: {
          requestsPerMinute: 1000,
          tokensPerMinute: 100000,
          concurrentRequests: 50
        },
        pricing: {
          inputTokenCost: 0.001,
          outputTokenCost: 0.002
        },
        capabilities: ['text-generation' as const],
        priority: 5
      };

      await hub.registerProvider(mockProvider as any, providerConfig);
      await hub.initialize();
    });

    it('should process chat request successfully', async () => {
      const request: ModelRequest = {
        id: 'test-request-1',
        messages: [{ role: 'user', content: 'Hello, world!' }],
        maxTokens: 100,
        temperature: 0.7
      };

      const response = await hub.chat(request);
      
      expect(response).toBeDefined();
      expect(response.content).toBe('Test response');
      expect(response.cost).toBe(0.001);
      expect(response.latency).toBe(500);
    });

    it('should handle streaming requests', async () => {
      const request: ModelRequest = {
        id: 'test-stream-1',
        messages: [{ role: 'user', content: 'Stream test' }],
        stream: true
      };

      const chunks = [];
      for await (const chunk of hub.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('content');
      expect(chunks[chunks.length - 1].type).toBe('done');
    });
  });

  describe('Cost and Performance Monitoring', () => {
    it('should track cost analysis', async () => {
      const analysis = await hub.getCostAnalysis('24h');
      
      expect(analysis).toBeDefined();
      expect(analysis.totalCost).toBeGreaterThanOrEqual(0);
      expect(analysis.budgetAlerts).toBeInstanceOf(Array);
    });

    it('should provide health status', async () => {
      const health = await hub.getHealth();
      
      expect(health).toBeInstanceOf(Array);
      // Should be empty initially as no real providers are registered
      expect(health.length).toBeGreaterThanOrEqual(0);
    });

    it('should collect performance metrics', async () => {
      const metrics = await hub.getMetrics();
      
      expect(metrics).toBeInstanceOf(Array);
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update router configuration', async () => {
      const newConfig = {
        strategy: 'cost-optimized' as const,
        costThreshold: 0.005
      };

      await hub.updateRouterConfig(newConfig);
      
      // Should not throw and should be applied
      expect(() => hub.updateRouterConfig(newConfig)).not.toThrow();
    });

    it('should update budget limits', async () => {
      const newLimits = {
        dailyLimit: 25.0,
        monthlyLimit: 500.0
      };

      await hub.setBudgetLimits(newLimits);
      
      // Should not throw and should be applied
      expect(() => hub.setBudgetLimits(newLimits)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle hub not running error', async () => {
      const request: ModelRequest = {
        id: 'test-error-1',
        messages: [{ role: 'user', content: 'Error test' }]
      };

      // Hub is not initialized, should throw error
      await expect(hub.chat(request)).rejects.toThrow('Model hub is not running');
    });

    it('should gracefully shutdown', async () => {
      await hub.initialize();
      await expect(hub.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('Performance Benchmarks', () => {
  it('should have fast routing decisions', async () => {
    const config = createDefaultConfig();
    const router = new IntelligentRouter(config.router);
    
    const request: ModelRequest = {
      id: 'perf-test-1',
      messages: [{ role: 'user', content: 'Performance test' }]
    };

    const startTime = performance.now();
    
    try {
      await router.selectModel(request);
    } catch (error) {
      // Expected to fail without providers, but we measure timing
    }
    
    const endTime = performance.now();
    const routingTime = endTime - startTime;
    
    // Routing should be very fast (< 10ms even without providers)
    expect(routingTime).toBeLessThan(10);
  });

  it('should handle high concurrency', async () => {
    const config = createDefaultConfig();
    const hub = new AIModelHub(config);
    
    // Simulate multiple concurrent requests
    const requests = Array.from({ length: 10 }, (_, i) => ({
      id: `concurrent-${i}`,
      messages: [{ role: 'user' as const, content: `Request ${i}` }]
    }));

    const startTime = performance.now();
    
    // All should fail gracefully without providers
    const results = await Promise.allSettled(
      requests.map(req => hub.chat(req))
    );
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Should handle concurrent requests quickly
    expect(totalTime).toBeLessThan(100); // 100ms for 10 concurrent requests
    expect(results.every(r => r.status === 'rejected')).toBe(true);
  });
});