/**
 * @package agent-manager/lifecycle/monitoring
 * Type definitions for resource monitoring system
 */

export interface ResourceMonitorConfig {
  enabled: boolean;
  interval: number;           // Monitoring interval in ms
  alertThresholds: {
    cpu: number;             // CPU usage percentage
    memory: number;          // Memory usage percentage
    disk: number;            // Disk usage percentage
  };
  historySizeLimit: number;   // Max number of resource samples to keep
  performanceMode: boolean;   // Enable performance optimizations
}

export interface ResourceSample {
  timestamp: number;
  cpu: {
    percent: number;
    system: number;
    user: number;
  };
  memory: {
    rss: number;
    heap: number;
    external: number;
    usage: number;     // Usage percentage
  };
  io: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
  };
  custom?: Record<string, number>;
}

export interface ResourceAlert {
  type: 'cpu' | 'memory' | 'disk' | 'custom';
  level: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  agentId: string;
}

export interface MonitoringStrategy {
  name: string;
  enabled: boolean;
  interval: number;
  collect(): Promise<Partial<ResourceSample>>;
  validate(sample: ResourceSample): boolean;
}

export interface AlertStrategy {
  name: string;
  check(sample: ResourceSample, config: ResourceMonitorConfig): ResourceAlert[];
  priority: number;
}