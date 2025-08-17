/**
 * Performance Monitor Utility
 * 
 * Real-time performance tracking and latency monitoring.
 */

import { PerformanceMetrics } from '../types';

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  recordRequest(
    providerId: string,
    modelId: string,
    latency: number,
    cost: number,
    tokens: number,
    success: boolean
  ): void {
    const key = `${providerId}:${modelId}`;
    const existing = this.metrics.get(key) || this.createEmptyMetrics(providerId, modelId);

    existing.totalRequests++;
    if (success) {
      existing.successfulRequests++;
    } else {
      existing.failedRequests++;
    }

    // Update averages
    const total = existing.totalRequests;
    existing.averageLatency = (existing.averageLatency * (total - 1) + latency) / total;
    existing.averageCost = (existing.averageCost * (total - 1) + cost) / total;
    existing.totalCost += cost;
    existing.tokensProcessed += tokens;
    existing.errorRate = existing.failedRequests / total;
    existing.lastUpdated = Date.now();

    this.metrics.set(key, existing);
  }

  getMetrics(providerId: string, modelId?: string): PerformanceMetrics[] {
    if (modelId) {
      const key = `${providerId}:${modelId}`;
      const metric = this.metrics.get(key);
      return metric ? [metric] : [];
    }

    return Array.from(this.metrics.values()).filter(m => m.providerId === providerId);
  }

  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  reset(providerId?: string): void {
    if (providerId) {
      for (const [key, metric] of this.metrics) {
        if (metric.providerId === providerId) {
          this.metrics.delete(key);
        }
      }
    } else {
      this.metrics.clear();
    }
  }

  private createEmptyMetrics(providerId: string, modelId: string): PerformanceMetrics {
    return {
      providerId,
      modelId,
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
}