/**
 * @package agent-manager/src/lifecycle/monitoring
 * Resource monitoring type definitions
 */

export interface ResourceMonitorConfig {
  enabled: boolean
  interval: number           // Monitoring interval in ms
  alertThresholds: {
    cpu: number             // CPU usage percentage
    memory: number          // Memory usage percentage
    disk: number            // Disk usage percentage
  }
  historySizeLimit: number   // Max number of resource samples to keep
  performanceMode: boolean   // Enable performance optimizations
}

export interface ResourceSample {
  timestamp: number
  cpu: {
    percent: number
    system: number
    user: number
  }
  memory: {
    rss: number
    heap: number
    external: number
    usage: number     // Usage percentage
  }
  io: {
    readBytes: number
    writeBytes: number
    readOps: number
    writeOps: number
  }
  network: {
    rxBytes: number
    txBytes: number
    rxPackets: number
    txPackets: number
  }
  handles: {
    open: number
    peak: number
  }
}

export interface ResourceAlert {
  agentId: string
  alertType: 'cpu' | 'memory' | 'disk' | 'io' | 'network'
  severity: 'warning' | 'critical'
  threshold: number
  currentValue: number
  timestamp: number
  message: string
}

export interface SystemInfo {
  totalMemory: number
  cpuCount: number
  platform: string
  arch: string
  nodeVersion: string
}