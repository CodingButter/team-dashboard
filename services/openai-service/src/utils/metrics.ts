import { register, Counter, Histogram, Gauge } from 'prom-client';
import type { PerformanceMetrics, UsageMetrics } from '../types';

// Prometheus metrics
export const openaiRequestCounter = new Counter({
  name: 'openai_requests_total',
  help: 'Total number of OpenAI API requests',
  labelNames: ['model', 'type', 'status'],
  registers: [register],
});

export const openaiLatencyHistogram = new Histogram({
  name: 'openai_request_duration_seconds',
  help: 'OpenAI API request duration in seconds',
  labelNames: ['model', 'type'],
  buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
  registers: [register],
});

export const openaiTokensCounter = new Counter({
  name: 'openai_tokens_total',
  help: 'Total number of tokens consumed',
  labelNames: ['model', 'type'],
  registers: [register],
});

export const openaiCostCounter = new Counter({
  name: 'openai_cost_total',
  help: 'Total cost in USD',
  labelNames: ['model'],
  registers: [register],
});

export const openaiActiveStreams = new Gauge({
  name: 'openai_active_streams',
  help: 'Number of active streaming requests',
  registers: [register],
});

export class PerformanceTracker {
  private startTime: number = 0;
  private firstTokenTime: number = 0;
  private streamingLatencies: number[] = [];
  private tokenCount: number = 0;

  startRequest(): void {
    this.startTime = performance.now();
    this.firstTokenTime = 0;
    this.streamingLatencies = [];
    this.tokenCount = 0;
  }

  recordFirstToken(): void {
    if (this.firstTokenTime === 0) {
      this.firstTokenTime = performance.now();
    }
  }

  recordStreamChunk(): void {
    const now = performance.now();
    if (this.streamingLatencies.length === 0) {
      // First chunk latency from start
      this.streamingLatencies.push(now - this.startTime);
    } else {
      // Inter-chunk latency
      const lastTime = this.streamingLatencies[this.streamingLatencies.length - 1];
      this.streamingLatencies.push(now - (this.startTime + lastTime));
    }
    this.tokenCount++;
  }

  getMetrics(): PerformanceMetrics {
    const totalTime = performance.now() - this.startTime;
    const firstTokenLatency = this.firstTokenTime > 0 ? this.firstTokenTime - this.startTime : 0;
    const tokensPerSecond = this.tokenCount > 0 ? (this.tokenCount / (totalTime / 1000)) : 0;

    return {
      firstTokenLatency,
      totalResponseTime: totalTime,
      tokensPerSecond,
      streamingLatency: this.streamingLatencies,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
    };
  }
}

export class UsageTracker {
  private metrics: Map<string, UsageMetrics> = new Map();

  recordUsage(
    sessionId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    latency: number,
    isError: boolean = false
  ): void {
    const current = this.metrics.get(sessionId) || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
      requestCount: 0,
      errorCount: 0,
      averageLatency: 0,
    };

    const newRequestCount = current.requestCount + 1;
    const newAverageLatency = (current.averageLatency * current.requestCount + latency) / newRequestCount;

    this.metrics.set(sessionId, {
      promptTokens: current.promptTokens + promptTokens,
      completionTokens: current.completionTokens + completionTokens,
      totalTokens: current.totalTokens + promptTokens + completionTokens,
      cost: current.cost + cost,
      requestCount: newRequestCount,
      errorCount: current.errorCount + (isError ? 1 : 0),
      averageLatency: newAverageLatency,
    });
  }

  getUsage(sessionId: string): UsageMetrics | undefined {
    return this.metrics.get(sessionId);
  }

  getAllUsage(): Map<string, UsageMetrics> {
    return new Map(this.metrics);
  }

  reset(sessionId?: string): void {
    if (sessionId) {
      this.metrics.delete(sessionId);
    } else {
      this.metrics.clear();
    }
  }
}

export const globalUsageTracker = new UsageTracker();