import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countTokens, countMessageTokens, calculateCost, optimizeMessages } from '../utils/tokens';
import { PerformanceTracker, UsageTracker } from '../utils/metrics';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

// Mock tiktoken
vi.mock('tiktoken', () => ({
  encoding_for_model: vi.fn(() => ({
    encode: vi.fn((text: string) => new Array(Math.ceil(text.length / 4)).fill(0)),
    free: vi.fn()
  }))
}));

describe('Token Utils', () => {
  describe('countTokens', () => {
    it('should count tokens in text', () => {
      const text = 'Hello world this is a test';
      const count = countTokens(text, 'gpt-4o');
      
      expect(count).toBeGreaterThan(0);
      expect(count).toBe(Math.ceil(text.length / 4)); // Mock implementation
    });
  });

  describe('countMessageTokens', () => {
    it('should count tokens in message array', () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'user', content: 'Hello world' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      const count = countMessageTokens(messages, 'gpt-4o');
      expect(count).toBeGreaterThan(0);
    });

    it('should handle complex message content', () => {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this image?' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }
          ]
        }
      ];
      
      const count = countMessageTokens(messages, 'gpt-4o');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for gpt-4o', () => {
      const cost = calculateCost(1000, 500, 'gpt-4o');
      const expectedCost = (1000 / 1000) * 0.015 + (500 / 1000) * 0.06;
      
      expect(cost).toBe(Number(expectedCost.toFixed(6)));
    });

    it('should calculate cost for gpt-4o-mini', () => {
      const cost = calculateCost(1000, 500, 'gpt-4o-mini');
      const expectedCost = (1000 / 1000) * 0.00015 + (500 / 1000) * 0.0006;
      
      expect(cost).toBe(Number(expectedCost.toFixed(6)));
    });

    it('should throw error for unknown model', () => {
      expect(() => calculateCost(1000, 500, 'unknown-model' as any))
        .toThrow('Unknown model pricing for: unknown-model');
    });
  });

  describe('optimizeMessages', () => {
    it('should keep all messages if under limit', () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];
      
      const optimized = optimizeMessages(messages, 1000, 'gpt-4o');
      expect(optimized).toHaveLength(3);
      expect(optimized).toEqual(messages);
    });

    it('should preserve system messages', () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'How are you?' }
      ];
      
      const optimized = optimizeMessages(messages, 20, 'gpt-4o'); // Very low limit
      expect(optimized[0].role).toBe('system');
    });

    it('should keep recent messages when optimizing', () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
        { role: 'assistant', content: 'Second response' }
      ];
      
      const optimized = optimizeMessages(messages, 30, 'gpt-4o'); // Moderate limit to allow some optimization
      expect(optimized.length).toBeLessThanOrEqual(messages.length);
      expect(optimized[0].role).toBe('system');
      
      // If optimization occurred, should prefer recent messages
      if (optimized.length < messages.length) {
        const hasSecondResponse = optimized.some(m => m.content === 'Second response');
        expect(hasSecondResponse).toBe(true);
      }
    });
  });
});

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
    vi.clearAllMocks();
  });

  it('should track request timing', () => {
    tracker.startRequest();
    tracker.recordFirstToken();
    tracker.recordStreamChunk();
    
    const metrics = tracker.getMetrics();
    
    expect(metrics.firstTokenLatency).toBeGreaterThanOrEqual(0);
    expect(metrics.totalResponseTime).toBeGreaterThanOrEqual(0);
    expect(metrics.streamingLatency).toHaveLength(1);
  });

  it('should calculate tokens per second', () => {
    tracker.startRequest();
    tracker.recordStreamChunk();
    tracker.recordStreamChunk();
    
    const metrics = tracker.getMetrics();
    expect(metrics.tokensPerSecond).toBeGreaterThanOrEqual(0);
  });

  it('should track memory and CPU usage', () => {
    tracker.startRequest();
    const metrics = tracker.getMetrics();
    
    expect(metrics.memoryUsage).toBeGreaterThan(0);
    expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
  });
});

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  it('should record usage metrics', () => {
    tracker.recordUsage('session-1', 100, 50, 0.01, 1000);
    
    const usage = tracker.getUsage('session-1');
    expect(usage).toBeDefined();
    expect(usage?.promptTokens).toBe(100);
    expect(usage?.completionTokens).toBe(50);
    expect(usage?.totalTokens).toBe(150);
    expect(usage?.cost).toBe(0.01);
    expect(usage?.requestCount).toBe(1);
    expect(usage?.errorCount).toBe(0);
    expect(usage?.averageLatency).toBe(1000);
  });

  it('should accumulate usage across requests', () => {
    tracker.recordUsage('session-1', 100, 50, 0.01, 1000);
    tracker.recordUsage('session-1', 200, 100, 0.02, 2000);
    
    const usage = tracker.getUsage('session-1');
    expect(usage?.promptTokens).toBe(300);
    expect(usage?.completionTokens).toBe(150);
    expect(usage?.totalTokens).toBe(450);
    expect(usage?.cost).toBe(0.03);
    expect(usage?.requestCount).toBe(2);
    expect(usage?.averageLatency).toBe(1500); // (1000 + 2000) / 2
  });

  it('should track errors', () => {
    tracker.recordUsage('session-1', 0, 0, 0, 1000, true);
    
    const usage = tracker.getUsage('session-1');
    expect(usage?.errorCount).toBe(1);
  });

  it('should reset usage for specific session', () => {
    tracker.recordUsage('session-1', 100, 50, 0.01, 1000);
    tracker.recordUsage('session-2', 200, 100, 0.02, 2000);
    
    tracker.reset('session-1');
    
    expect(tracker.getUsage('session-1')).toBeUndefined();
    expect(tracker.getUsage('session-2')).toBeDefined();
  });

  it('should reset all usage', () => {
    tracker.recordUsage('session-1', 100, 50, 0.01, 1000);
    tracker.recordUsage('session-2', 200, 100, 0.02, 2000);
    
    tracker.reset();
    
    expect(tracker.getAllUsage().size).toBe(0);
  });
});