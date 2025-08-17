/**
 * @package agent-manager/lifecycle/monitoring
 * Refactored resource monitor - main coordinator
 */

import { EventEmitter } from 'events';
import { AgentProcess, ResourceUsage, ResourceLimits } from '@team-dashboard/types';
import { 
  ResourceMonitorConfig, 
  ResourceSample, 
  MonitoringStrategy,
  ResourceAlert
} from './types';
import { CPUMonitoringStrategy } from './cpu-monitor';
import { MemoryMonitoringStrategy } from './memory-monitor';
import { AlertManager } from './alert-manager';

export class AgentResourceMonitor extends EventEmitter {
  private config: ResourceMonitorConfig;
  private strategies: MonitoringStrategy[] = [];
  private alertManager: AlertManager;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private resourceHistory: Map<string, ResourceSample[]> = new Map();
  private isMonitoring = false;

  constructor(config: ResourceMonitorConfig) {
    super();
    this.config = config;
    this.alertManager = new AlertManager(config);
    this.setupDefaultStrategies();
    this.setupEventHandlers();
  }

  /**
   * Start monitoring for an agent
   */
  async startMonitoring(agentProcess: AgentProcess): Promise<void> {
    if (!this.config.enabled) return;

    const agentId = agentProcess.id;
    
    if (this.monitoringIntervals.has(agentId)) {
      await this.stopMonitoring(agentId);
    }

    this.resourceHistory.set(agentId, []);
    
    const interval = setInterval(async () => {
      try {
        const sample = await this.collectResourceSample(agentProcess);
        this.recordSample(agentId, sample);
        
        // Check for alerts
        const alerts = this.alertManager.processAlert(sample, agentId);
        
        // Emit events
        this.emit('sample', agentId, sample);
        if (alerts.length > 0) {
          this.emit('alerts', agentId, alerts);
        }
        
      } catch (error) {
        this.emit('error', agentId, error);
      }
    }, this.config.interval);

    this.monitoringIntervals.set(agentId, interval);
    this.isMonitoring = true;
    
    this.emit('monitoringStarted', agentId);
  }

  /**
   * Stop monitoring for an agent
   */
  async stopMonitoring(agentId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(agentId);
    }

    this.alertManager.clearAlertsForAgent(agentId);
    this.emit('monitoringStopped', agentId);
    
    if (this.monitoringIntervals.size === 0) {
      this.isMonitoring = false;
    }
  }

  /**
   * Get resource usage for an agent
   */
  getResourceUsage(agentId: string): ResourceUsage | null {
    const history = this.resourceHistory.get(agentId);
    if (!history || history.length === 0) return null;

    const latest = history[history.length - 1];
    
    return {
      cpu: latest.cpu.percent,
      memory: latest.memory.usage,
      disk: 0, // Would be implemented with disk monitoring strategy
      network: {
        bytesReceived: latest.network.rxBytes,
        bytesSent: latest.network.txBytes
      },
      timestamp: latest.timestamp
    };
  }

  /**
   * Get resource history for an agent
   */
  getResourceHistory(agentId: string, limit?: number): ResourceSample[] {
    const history = this.resourceHistory.get(agentId) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(agentId?: string): ResourceAlert[] {
    return this.alertManager.getActiveAlerts(agentId);
  }

  /**
   * Register a custom monitoring strategy
   */
  registerStrategy(strategy: MonitoringStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ResourceMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    return {
      isMonitoring: this.isMonitoring,
      activeAgents: this.monitoringIntervals.size,
      totalSamples: Array.from(this.resourceHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
      activeAlerts: this.alertManager.getActiveAlerts().length,
      strategies: this.strategies.length
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Stop all monitoring
    const agentIds = Array.from(this.monitoringIntervals.keys());
    await Promise.all(agentIds.map(id => this.stopMonitoring(id)));
    
    // Clear history
    this.resourceHistory.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }

  /**
   * Setup default monitoring strategies
   */
  private setupDefaultStrategies(): void {
    this.registerStrategy(new CPUMonitoringStrategy());
    this.registerStrategy(new MemoryMonitoringStrategy());
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.alertManager.on('alert', (alert: ResourceAlert) => {
      this.emit('alert', alert);
    });

    this.alertManager.on('alertResolved', (alert: ResourceAlert) => {
      this.emit('alertResolved', alert);
    });
  }

  /**
   * Collect resource sample from all strategies
   */
  private async collectResourceSample(agentProcess: AgentProcess): Promise<ResourceSample> {
    const timestamp = Date.now();
    const baseSample: ResourceSample = {
      timestamp,
      cpu: { percent: 0, system: 0, user: 0 },
      memory: { rss: 0, heap: 0, external: 0, usage: 0 },
      io: { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 },
      network: { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 }
    };

    // Collect data from all strategies
    for (const strategy of this.strategies) {
      if (!strategy.enabled) continue;

      try {
        const strategyData = await strategy.collect();
        Object.assign(baseSample, strategyData);
      } catch (error) {
        this.emit('strategyError', strategy.name, error);
      }
    }

    return baseSample;
  }

  /**
   * Record a sample in history
   */
  private recordSample(agentId: string, sample: ResourceSample): void {
    let history = this.resourceHistory.get(agentId) || [];
    history.push(sample);

    // Limit history size
    if (history.length > this.config.historySizeLimit) {
      history = history.slice(-this.config.historySizeLimit);
    }

    this.resourceHistory.set(agentId, history);
  }
}