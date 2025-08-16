/**
 * @package mcp-manager/tests/fixtures
 * Performance testing fixtures for MCP servers
 */

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  concurrency: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface LoadTestConfig {
  duration: number; // seconds
  concurrency: number;
  requestsPerSecond: number;
  payloadSize: number; // bytes
  scenario: string;
}

export interface PerformanceTarget {
  maxResponseTime: number; // ms
  minThroughput: number; // requests/second
  maxErrorRate: number; // percentage
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
}

export class McpPerformanceFixtures {
  /**
   * Generate performance test configurations
   */
  static generateLoadTestConfigs(): LoadTestConfig[] {
    return [
      {
        duration: 60,
        concurrency: 1,
        requestsPerSecond: 10,
        payloadSize: 1024,
        scenario: 'baseline_load',
      },
      {
        duration: 120,
        concurrency: 10,
        requestsPerSecond: 50,
        payloadSize: 1024,
        scenario: 'moderate_load',
      },
      {
        duration: 180,
        concurrency: 50,
        requestsPerSecond: 100,
        payloadSize: 1024,
        scenario: 'high_load',
      },
      {
        duration: 300,
        concurrency: 100,
        requestsPerSecond: 200,
        payloadSize: 1024,
        scenario: 'stress_test',
      },
      {
        duration: 60,
        concurrency: 5,
        requestsPerSecond: 20,
        payloadSize: 1024 * 1024, // 1MB
        scenario: 'large_payload',
      },
      {
        duration: 30,
        concurrency: 200,
        requestsPerSecond: 500,
        payloadSize: 512,
        scenario: 'spike_test',
      },
    ];
  }

  /**
   * Generate performance targets for different server types
   */
  static generatePerformanceTargets(): Record<string, PerformanceTarget> {
    return {
      stdio_server: {
        maxResponseTime: 100, // ms
        minThroughput: 50, // requests/second
        maxErrorRate: 1, // 1%
        maxMemoryUsage: 256, // MB
        maxCpuUsage: 80, // 80%
      },
      http_server: {
        maxResponseTime: 200, // ms
        minThroughput: 100, // requests/second
        maxErrorRate: 0.5, // 0.5%
        maxMemoryUsage: 512, // MB
        maxCpuUsage: 70, // 70%
      },
      production_server: {
        maxResponseTime: 50, // ms
        minThroughput: 200, // requests/second
        maxErrorRate: 0.1, // 0.1%
        maxMemoryUsage: 1024, // MB
        maxCpuUsage: 60, // 60%
      },
    };
  }

  /**
   * Generate mock performance metrics for testing
   */
  static generateMockMetrics(scenario: string): PerformanceMetrics[] {
    const baseMetrics = this.getBaseMetrics(scenario);
    const timePoints = 60; // 60 data points over time
    
    return Array.from({ length: timePoints }, (_, i) => ({
      responseTime: this.addVariation(baseMetrics.responseTime, 0.2, i),
      throughput: this.addVariation(baseMetrics.throughput, 0.1, i),
      errorRate: this.addVariation(baseMetrics.errorRate, 0.5, i),
      concurrency: this.addVariation(baseMetrics.concurrency, 0.05, i),
      memoryUsage: this.addTrend(baseMetrics.memoryUsage, 0.1, i, timePoints),
      cpuUsage: this.addVariation(baseMetrics.cpuUsage, 0.3, i),
    }));
  }

  /**
   * Generate test payloads of different sizes
   */
  static generateTestPayloads(): Record<string, any> {
    return {
      small: {
        size: 100,
        data: JSON.stringify({ message: 'small test payload', data: 'x'.repeat(50) }),
      },
      medium: {
        size: 1024,
        data: JSON.stringify({ 
          message: 'medium test payload',
          data: 'x'.repeat(500),
          array: Array.from({ length: 10 }, (_, i) => ({ id: i, value: `item_${i}` })),
        }),
      },
      large: {
        size: 10240,
        data: JSON.stringify({
          message: 'large test payload',
          data: 'x'.repeat(5000),
          array: Array.from({ length: 100 }, (_, i) => ({ 
            id: i, 
            value: `item_${i}`,
            details: 'x'.repeat(20),
          })),
        }),
      },
      xlarge: {
        size: 102400,
        data: JSON.stringify({
          message: 'extra large test payload',
          data: 'x'.repeat(50000),
          array: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            value: `item_${i}`,
            details: 'x'.repeat(20),
            metadata: {
              created: new Date().toISOString(),
              tags: [`tag_${i % 10}`],
            },
          })),
        }),
      },
    };
  }

  /**
   * Generate concurrent request patterns
   */
  static generateConcurrencyPatterns(): Array<{
    name: string;
    pattern: number[];
    description: string;
  }> {
    return [
      {
        name: 'steady_state',
        pattern: Array(60).fill(10),
        description: 'Constant 10 concurrent requests',
      },
      {
        name: 'ramp_up',
        pattern: Array.from({ length: 60 }, (_, i) => Math.min(i + 1, 50)),
        description: 'Gradual increase from 1 to 50 concurrent requests',
      },
      {
        name: 'spike',
        pattern: [
          ...Array(20).fill(5),
          ...Array(10).fill(50),
          ...Array(30).fill(5),
        ],
        description: 'Sudden spike in the middle',
      },
      {
        name: 'wave',
        pattern: Array.from({ length: 60 }, (_, i) => 
          Math.round(25 + 20 * Math.sin(i * Math.PI / 30))
        ),
        description: 'Sinusoidal wave pattern',
      },
      {
        name: 'stress_burst',
        pattern: [
          ...Array(10).fill(1),
          ...Array(5).fill(100),
          ...Array(10).fill(1),
          ...Array(5).fill(100),
          ...Array(30).fill(1),
        ],
        description: 'Alternating stress bursts',
      },
    ];
  }

  /**
   * Generate response time percentile data
   */
  static generateResponseTimePercentiles(scenario: string): Record<string, number> {
    const base = this.getBaseResponseTime(scenario);
    
    return {
      p50: base,
      p75: base * 1.5,
      p90: base * 2.0,
      p95: base * 2.5,
      p99: base * 4.0,
      p999: base * 8.0,
      max: base * 15.0,
      min: Math.max(1, base * 0.1),
    };
  }

  /**
   * Generate error distribution data
   */
  static generateErrorDistribution(): Record<string, number> {
    return {
      timeout_errors: 45,
      connection_errors: 25,
      protocol_errors: 15,
      auth_errors: 8,
      server_errors: 5,
      client_errors: 2,
    };
  }

  /**
   * Generate resource utilization over time
   */
  static generateResourceUtilization(duration: number): Array<{
    timestamp: Date;
    cpu: number;
    memory: number;
    network: number;
    fileDescriptors: number;
  }> {
    const startTime = new Date();
    return Array.from({ length: duration }, (_, i) => ({
      timestamp: new Date(startTime.getTime() + i * 1000),
      cpu: this.addVariation(50, 0.3, i),
      memory: this.addTrend(200, 0.1, i, duration),
      network: this.addVariation(1024, 0.5, i),
      fileDescriptors: Math.min(1024, 10 + Math.floor(i / 10)),
    }));
  }

  /**
   * Generate benchmark comparison data
   */
  static generateBenchmarkData(): Record<string, PerformanceMetrics> {
    return {
      current_version: {
        responseTime: 85,
        throughput: 120,
        errorRate: 0.5,
        concurrency: 50,
        memoryUsage: 245,
        cpuUsage: 65,
      },
      previous_version: {
        responseTime: 95,
        throughput: 100,
        errorRate: 1.2,
        concurrency: 40,
        memoryUsage: 280,
        cpuUsage: 75,
      },
      target_performance: {
        responseTime: 50,
        throughput: 200,
        errorRate: 0.1,
        concurrency: 100,
        memoryUsage: 200,
        cpuUsage: 50,
      },
    };
  }

  private static getBaseMetrics(scenario: string): PerformanceMetrics {
    const metrics = {
      baseline_load: {
        responseTime: 50,
        throughput: 80,
        errorRate: 0.1,
        concurrency: 5,
        memoryUsage: 100,
        cpuUsage: 20,
      },
      moderate_load: {
        responseTime: 75,
        throughput: 120,
        errorRate: 0.3,
        concurrency: 15,
        memoryUsage: 200,
        cpuUsage: 45,
      },
      high_load: {
        responseTime: 120,
        throughput: 180,
        errorRate: 0.8,
        concurrency: 35,
        memoryUsage: 350,
        cpuUsage: 70,
      },
      stress_test: {
        responseTime: 200,
        throughput: 150,
        errorRate: 2.5,
        concurrency: 80,
        memoryUsage: 500,
        cpuUsage: 90,
      },
    };

    return metrics[scenario as keyof typeof metrics] || metrics.baseline_load;
  }

  private static getBaseResponseTime(scenario: string): number {
    const responseTimes = {
      baseline_load: 50,
      moderate_load: 75,
      high_load: 120,
      stress_test: 200,
      large_payload: 300,
      spike_test: 150,
    };

    return responseTimes[scenario as keyof typeof responseTimes] || 50;
  }

  private static addVariation(base: number, variance: number, index: number): number {
    const variation = (Math.sin(index * 0.1) + Math.random() - 0.5) * variance;
    return Math.max(0, base * (1 + variation));
  }

  private static addTrend(base: number, trendRate: number, index: number, total: number): number {
    const trend = (index / total) * trendRate;
    const variation = (Math.random() - 0.5) * 0.1;
    return base * (1 + trend + variation);
  }
}