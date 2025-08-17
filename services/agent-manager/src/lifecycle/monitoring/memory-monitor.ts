/**
 * @package agent-manager/lifecycle/monitoring
 * Memory monitoring strategy implementation
 */

import * as os from 'os';
import { MonitoringStrategy, ResourceSample } from './types';

export class MemoryMonitoringStrategy implements MonitoringStrategy {
  name = 'memory-monitor';
  enabled = true;
  interval = 2000; // 2 seconds

  async collect(): Promise<Partial<ResourceSample>> {
    const memoryUsage = process.memoryUsage();
    const systemMemory = this.getSystemMemoryInfo();
    
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const systemUsagePercent = ((systemMemory.total - systemMemory.free) / systemMemory.total) * 100;

    return {
      memory: {
        rss: memoryUsage.rss,
        heap: memoryUsage.heapUsed,
        external: memoryUsage.external,
        usage: Math.min(100, Math.max(0, systemUsagePercent))
      }
    };
  }

  validate(sample: ResourceSample): boolean {
    return (
      sample.memory &&
      typeof sample.memory.usage === 'number' &&
      sample.memory.usage >= 0 &&
      sample.memory.usage <= 100 &&
      typeof sample.memory.rss === 'number' &&
      sample.memory.rss >= 0
    );
  }

  /**
   * Get system memory information
   */
  getSystemMemoryInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    return {
      total: totalMemory,
      free: freeMemory,
      used: totalMemory - freeMemory,
      usagePercent: ((totalMemory - freeMemory) / totalMemory) * 100
    };
  }

  /**
   * Get detailed process memory information
   */
  getProcessMemoryInfo() {
    const memUsage = process.memoryUsage();
    return {
      rss: this.formatBytes(memUsage.rss),
      heapTotal: this.formatBytes(memUsage.heapTotal),
      heapUsed: this.formatBytes(memUsage.heapUsed),
      external: this.formatBytes(memUsage.external),
      arrayBuffers: this.formatBytes(memUsage.arrayBuffers || 0)
    };
  }

  /**
   * Monitor memory leaks by tracking heap growth
   */
  detectMemoryLeaks(samples: ResourceSample[], windowSize: number = 10): boolean {
    if (samples.length < windowSize) return false;
    
    const recentSamples = samples.slice(-windowSize);
    const heapSizes = recentSamples.map(s => s.memory.heap);
    
    // Check if heap is consistently growing
    let growthCount = 0;
    for (let i = 1; i < heapSizes.length; i++) {
      if (heapSizes[i] > heapSizes[i - 1]) {
        growthCount++;
      }
    }
    
    // If heap grew in more than 80% of samples, potential leak
    return (growthCount / (heapSizes.length - 1)) > 0.8;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}