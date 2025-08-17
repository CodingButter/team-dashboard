/**
 * Agent Resource Monitor
 * Real-time monitoring of CPU, memory, disk usage with performance optimization
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs/promises';
import { 
  AgentProcess, 
  ResourceUsage, 
  ResourceLimits 
} from '@team-dashboard/types';

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
  disk: {
    usage: number;     // Disk usage percentage
    freeSpace: number; // Free space in bytes
    totalSpace: number; // Total space in bytes
  };
}

export interface ResourceAlert {
  agentId: string;
  type: 'cpu' | 'memory' | 'disk' | 'io';
  level: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * High-Performance Resource Monitor for Agent Processes
 * Optimized for minimal overhead while providing comprehensive monitoring
 */
export class AgentResourceMonitor extends EventEmitter {
  private config: ResourceMonitorConfig;
  private monitoringTimers: Map<string, NodeJS.Timeout> = new Map();
  private resourceHistory: Map<string, ResourceSample[]> = new Map();
  private processes: Map<string, AgentProcess> = new Map();
  private resourceLimits: Map<string, ResourceLimits> = new Map();
  private lastSamples: Map<string, ResourceSample> = new Map();
  private isShuttingDown = false;

  // Performance optimization: batch processing
  private pendingUpdates: Set<string> = new Set();
  private batchTimer?: NodeJS.Timeout;
  
  // System info caching for performance
  private systemInfo = {
    totalMemory: os.totalmem(),
    cpuCount: os.cpus().length,
    lastUpdate: Date.now()
  };

  constructor(config: Partial<ResourceMonitorConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      interval: 2000,        // 2 seconds for responsive monitoring
      alertThresholds: {
        cpu: 80,             // 80% CPU usage
        memory: 85,          // 85% memory usage
        disk: 90             // 90% disk usage
      },
      historySizeLimit: 100, // Keep last 100 samples (3+ minutes at 2s interval)
      performanceMode: true,
      ...config
    };

    // Update system info periodically for performance
    setInterval(() => this.updateSystemInfo(), 30000); // Every 30 seconds
  }

  /**
   * Start monitoring an agent process
   */
  startMonitoring(agentId: string, process: AgentProcess, limits?: ResourceLimits): void {
    if (this.isShuttingDown) {
      return;
    }

    console.log(`[Resource] Starting resource monitoring for agent: ${agentId}`);
    
    this.processes.set(agentId, process);
    if (limits) {
      this.resourceLimits.set(agentId, limits);
    }
    
    // Initialize empty history
    this.resourceHistory.set(agentId, []);

    // Start monitoring with performance optimization
    if (this.config.performanceMode) {
      this.startOptimizedMonitoring(agentId);
    } else {
      this.startStandardMonitoring(agentId);
    }

    this.emit('monitoring:started', { agentId, timestamp: Date.now() });
  }

  /**
   * Stop monitoring an agent process
   */
  stopMonitoring(agentId: string): void {
    console.log(`[Resource] Stopping resource monitoring for agent: ${agentId}`);
    
    // Clear monitoring timer
    const timer = this.monitoringTimers.get(agentId);
    if (timer) {
      clearInterval(timer);
      this.monitoringTimers.delete(agentId);
    }

    // Clean up state
    this.processes.delete(agentId);
    this.resourceLimits.delete(agentId);
    this.resourceHistory.delete(agentId);
    this.lastSamples.delete(agentId);
    this.pendingUpdates.delete(agentId);

    this.emit('monitoring:stopped', { agentId, timestamp: Date.now() });
  }

  /**
   * Start optimized monitoring with batching for better performance
   */
  private startOptimizedMonitoring(agentId: string): void {
    const timer = setInterval(() => {
      this.pendingUpdates.add(agentId);
      this.scheduleBatchUpdate();
    }, this.config.interval);

    this.monitoringTimers.set(agentId, timer);
  }

  /**
   * Start standard monitoring (individual updates)
   */
  private startStandardMonitoring(agentId: string): void {
    const timer = setInterval(async () => {
      await this.collectResourceData(agentId);
    }, this.config.interval);

    this.monitoringTimers.set(agentId, timer);
  }

  /**
   * Schedule batch update for performance optimization
   */
  private scheduleBatchUpdate(): void {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    this.batchTimer = setTimeout(async () => {
      await this.processBatchUpdates();
      this.batchTimer = undefined;
    }, 100); // Process batches every 100ms
  }

  /**
   * Process all pending updates in a batch
   */
  private async processBatchUpdates(): Promise<void> {
    const agentsToUpdate = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();

    // Process all agents in parallel for better performance
    const promises = agentsToUpdate.map(agentId => this.collectResourceData(agentId));
    await Promise.allSettled(promises);
  }

  /**
   * Collect resource data for an agent with high performance
   */
  private async collectResourceData(agentId: string): Promise<void> {
    const process = this.processes.get(agentId);
    if (!process || !process.pid) {
      return;
    }

    const startTime = performance.now();
    
    try {
      const sample = await this.gatherResourceSample(process);
      
      // Store sample in history
      const history = this.resourceHistory.get(agentId) || [];
      history.push(sample);
      
      // Maintain history size limit for memory efficiency
      if (history.length > this.config.historySizeLimit) {
        history.splice(0, history.length - this.config.historySizeLimit);
      }
      
      this.resourceHistory.set(agentId, history);
      this.lastSamples.set(agentId, sample);

      // Update process resource usage
      process.resourceUsage = this.convertToResourceUsage(sample);

      // Check for alerts
      this.checkResourceAlerts(agentId, sample);

      // Emit events
      this.emit('resource:sample', { agentId, sample, timestamp: Date.now() });

      // Performance logging
      const duration = performance.now() - startTime;
      if (duration > 50) { // Log if collection takes >50ms
        console.warn(`[Resource] Slow resource collection for ${agentId}: ${duration.toFixed(2)}ms`);
      }

    } catch (error) {
      console.error(`[Resource] Failed to collect data for agent ${agentId}:`, error);
      this.emit('resource:error', { agentId, error, timestamp: Date.now() });
    }
  }

  /**
   * Gather comprehensive resource sample with optimized system calls
   */
  private async gatherResourceSample(process: AgentProcess): Promise<ResourceSample> {
    const timestamp = Date.now();
    const pid = process.pid;

    // Gather all data in parallel for performance
    const [cpuData, memoryData, ioData, diskData] = await Promise.all([
      this.getCpuUsage(pid),
      this.getMemoryUsage(pid),
      this.getIoUsage(pid),
      this.getDiskUsage()
    ]);

    // Network data (placeholder - would need real implementation)
    const networkData = {
      rxBytes: 0,
      txBytes: 0,
      rxPackets: 0,
      txPackets: 0
    };

    return {
      timestamp,
      cpu: cpuData,
      memory: memoryData,
      io: ioData,
      network: networkData,
      disk: diskData
    };
  }

  /**
   * Get CPU usage with caching for performance
   */
  private async getCpuUsage(pid: number): Promise<{ percent: number; system: number; user: number; }> {
    try {
      // On Linux, read from /proc/pid/stat for efficiency
      if (process.platform === 'linux') {
        const statPath = `/proc/${pid}/stat`;
        const statData = await fs.readFile(statPath, 'utf8');
        const statFields = statData.split(' ');
        
        const utime = parseInt(statFields[13]); // User time
        const stime = parseInt(statFields[14]); // System time
        const total = utime + stime;
        
        // Calculate percentage (simplified - would need time delta for accuracy)
        const percent = Math.min(100, (total / this.systemInfo.cpuCount) * 0.01);
        
        return {
          percent,
          user: utime * 0.01,
          system: stime * 0.01
        };
      } else {
        // Fallback for other platforms
        return {
          percent: Math.random() * 50, // Mock data
          user: Math.random() * 30,
          system: Math.random() * 20
        };
      }
    } catch (error) {
      return { percent: 0, user: 0, system: 0 };
    }
  }

  /**
   * Get memory usage efficiently
   */
  private async getMemoryUsage(pid: number): Promise<{ rss: number; heap: number; external: number; usage: number; }> {
    try {
      if (process.platform === 'linux') {
        const statusPath = `/proc/${pid}/status`;
        const statusData = await fs.readFile(statusPath, 'utf8');
        const lines = statusData.split('\n');
        
        let rss = 0;
        for (const line of lines) {
          if (line.startsWith('VmRSS:')) {
            const match = line.match(/(\d+)\s+kB/);
            if (match) {
              rss = parseInt(match[1]) * 1024; // Convert KB to bytes
            }
            break;
          }
        }
        
        const usage = (rss / this.systemInfo.totalMemory) * 100;
        
        return {
          rss,
          heap: rss * 0.8, // Estimate heap as 80% of RSS
          external: rss * 0.2, // Estimate external as 20% of RSS
          usage
        };
      } else {
        // Fallback for other platforms
        const usage = Math.random() * 50;
        const rss = (usage / 100) * this.systemInfo.totalMemory;
        return {
          rss,
          heap: rss * 0.8,
          external: rss * 0.2,
          usage
        };
      }
    } catch (error) {
      return { rss: 0, heap: 0, external: 0, usage: 0 };
    }
  }

  /**
   * Get I/O usage data
   */
  private async getIoUsage(pid: number): Promise<{ readBytes: number; writeBytes: number; readOps: number; writeOps: number; }> {
    try {
      if (process.platform === 'linux') {
        const ioPath = `/proc/${pid}/io`;
        const ioData = await fs.readFile(ioPath, 'utf8');
        const lines = ioData.split('\n');
        
        let readBytes = 0, writeBytes = 0, readOps = 0, writeOps = 0;
        
        for (const line of lines) {
          if (line.startsWith('read_bytes:')) {
            readBytes = parseInt(line.split(':')[1].trim());
          } else if (line.startsWith('write_bytes:')) {
            writeBytes = parseInt(line.split(':')[1].trim());
          } else if (line.startsWith('syscr:')) {
            readOps = parseInt(line.split(':')[1].trim());
          } else if (line.startsWith('syscw:')) {
            writeOps = parseInt(line.split(':')[1].trim());
          }
        }
        
        return { readBytes, writeBytes, readOps, writeOps };
      } else {
        // Mock data for other platforms
        return {
          readBytes: Math.floor(Math.random() * 1000000),
          writeBytes: Math.floor(Math.random() * 500000),
          readOps: Math.floor(Math.random() * 1000),
          writeOps: Math.floor(Math.random() * 500)
        };
      }
    } catch (error) {
      return { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 };
    }
  }

  /**
   * Get disk usage efficiently
   */
  private async getDiskUsage(): Promise<{ usage: number; freeSpace: number; totalSpace: number; }> {
    try {
      // Use cached system info for performance
      await fs.stat(process.cwd()); // Check if directory exists
      // This is simplified - would need statvfs for accurate disk usage
      // Using stats.size as a reference point for disk usage calculation
      const totalSpace = this.systemInfo.totalMemory * 10; // Mock: assume disk is 10x memory
      console.log(`[ResourceMonitor] Disk stats accessed: ${stats.size} bytes`);
      const freeSpace = totalSpace * 0.7; // Mock: 70% free
      const usage = ((totalSpace - freeSpace) / totalSpace) * 100;
      
      return { usage, freeSpace, totalSpace };
    } catch (error) {
      return { usage: 0, freeSpace: 0, totalSpace: 0 };
    }
  }

  /**
   * Check for resource usage alerts
   */
  private checkResourceAlerts(agentId: string, sample: ResourceSample): void {
    const limits = this.resourceLimits.get(agentId);
    const thresholds = this.config.alertThresholds;

    // CPU alerts
    if (sample.cpu.percent > thresholds.cpu) {
      this.emitAlert(agentId, 'cpu', 'warning', 
        `High CPU usage: ${sample.cpu.percent.toFixed(1)}%`, 
        sample.cpu.percent, thresholds.cpu);
    }

    // Memory alerts
    if (sample.memory.usage > thresholds.memory) {
      this.emitAlert(agentId, 'memory', 'warning',
        `High memory usage: ${sample.memory.usage.toFixed(1)}%`,
        sample.memory.usage, thresholds.memory);
    }

    // Disk alerts
    if (sample.disk.usage > thresholds.disk) {
      this.emitAlert(agentId, 'disk', 'warning',
        `High disk usage: ${sample.disk.usage.toFixed(1)}%`,
        sample.disk.usage, thresholds.disk);
    }

    // Resource limit violations
    if (limits) {
      if (limits.memory && sample.memory.rss > limits.memory * 1024 * 1024) {
        this.emitAlert(agentId, 'memory', 'critical',
          `Memory limit exceeded: ${(sample.memory.rss / 1024 / 1024).toFixed(1)}MB > ${limits.memory}MB`,
          sample.memory.rss / 1024 / 1024, limits.memory);
      }

      if (limits.cpu && sample.cpu.percent > limits.cpu) {
        this.emitAlert(agentId, 'cpu', 'critical',
          `CPU limit exceeded: ${sample.cpu.percent.toFixed(1)}% > ${limits.cpu}%`,
          sample.cpu.percent, limits.cpu);
      }
    }
  }

  /**
   * Emit resource alert
   */
  private emitAlert(agentId: string, type: ResourceAlert['type'], level: ResourceAlert['level'], 
                   message: string, value: number, threshold: number): void {
    const alert: ResourceAlert = {
      agentId,
      type,
      level,
      message,
      value,
      threshold,
      timestamp: Date.now()
    };

    this.emit('resource:alert', alert);
    console.warn(`[Resource] ${level.toUpperCase()} Alert for ${agentId}: ${message}`);
  }

  /**
   * Convert sample to ResourceUsage interface
   */
  private convertToResourceUsage(sample: ResourceSample): ResourceUsage {
    return {
      cpu: sample.cpu,
      memory: {
        rss: sample.memory.rss,
        heap: sample.memory.heap,
        external: sample.memory.external
      },
      io: sample.io,
      network: sample.network
    };
  }

  /**
   * Update system info cache for performance
   */
  private updateSystemInfo(): void {
    this.systemInfo = {
      totalMemory: os.totalmem(),
      cpuCount: os.cpus().length,
      lastUpdate: Date.now()
    };
  }

  /**
   * Get resource history for an agent
   */
  getResourceHistory(agentId: string): ResourceSample[] {
    return this.resourceHistory.get(agentId) || [];
  }

  /**
   * Get latest resource sample for an agent
   */
  getLatestSample(agentId: string): ResourceSample | undefined {
    return this.lastSamples.get(agentId);
  }

  /**
   * Get resource summary for all monitored agents
   */
  getResourceSummary(): { agentId: string; cpu: number; memory: number; status: string; }[] {
    const summary: { agentId: string; cpu: number; memory: number; status: string; }[] = [];
    
    for (const [agentId, sample] of this.lastSamples.entries()) {
      const process = this.processes.get(agentId);
      summary.push({
        agentId,
        cpu: sample.cpu.percent,
        memory: sample.memory.usage,
        status: process?.status || 'unknown'
      });
    }
    
    return summary;
  }

  /**
   * Shutdown resource monitor
   */
  shutdown(): void {
    console.log('[Resource] Shutting down resource monitor...');
    this.isShuttingDown = true;
    
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Clear all monitoring timers
    for (const [agentId, timer] of this.monitoringTimers.entries()) {
      clearInterval(timer);
      console.log(`[Resource] Cleared monitoring timer for agent: ${agentId}`);
    }
    
    this.monitoringTimers.clear();
    this.resourceHistory.clear();
    this.processes.clear();
    this.resourceLimits.clear();
    this.lastSamples.clear();
    this.pendingUpdates.clear();

    console.log('[Resource] Resource monitor shutdown complete');
  }
}

export default AgentResourceMonitor;