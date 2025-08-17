/**
 * @package agent-manager/lifecycle/monitoring
 * Alert management and notification system
 */

import { EventEmitter } from 'events';
import { ResourceAlert, ResourceSample, ResourceMonitorConfig, AlertStrategy } from './types';

export class AlertManager extends EventEmitter {
  private strategies: AlertStrategy[] = [];
  private activeAlerts: Map<string, ResourceAlert> = new Map();
  private alertHistory: ResourceAlert[] = [];
  private config: ResourceMonitorConfig;

  constructor(config: ResourceMonitorConfig) {
    super();
    this.config = config;
    this.setupDefaultStrategies();
  }

  /**
   * Register a new alert strategy
   */
  registerStrategy(strategy: AlertStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Process a resource sample and check for alerts
   */
  processAlert(sample: ResourceSample, agentId: string): ResourceAlert[] {
    const newAlerts: ResourceAlert[] = [];

    for (const strategy of this.strategies) {
      const alerts = strategy.check(sample, this.config);
      
      for (const alert of alerts) {
        alert.agentId = agentId;
        const alertKey = this.getAlertKey(alert);
        
        // Check if this is a new alert or an escalation
        if (!this.activeAlerts.has(alertKey)) {
          this.activeAlerts.set(alertKey, alert);
          this.alertHistory.push(alert);
          newAlerts.push(alert);
          
          this.emit('alert', alert);
        }
      }
    }

    // Clean up resolved alerts
    this.cleanupResolvedAlerts(sample, agentId);
    
    return newAlerts;
  }

  /**
   * Get all active alerts for an agent
   */
  getActiveAlerts(agentId?: string): ResourceAlert[] {
    const alerts = Array.from(this.activeAlerts.values());
    return agentId ? alerts.filter(a => a.agentId === agentId) : alerts;
  }

  /**
   * Get alert history with optional filtering
   */
  getAlertHistory(options?: {
    agentId?: string;
    type?: string;
    limit?: number;
    since?: Date;
  }): ResourceAlert[] {
    let alerts = [...this.alertHistory];
    
    if (options?.agentId) {
      alerts = alerts.filter(a => a.agentId === options.agentId);
    }
    
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    
    if (options?.since) {
      alerts = alerts.filter(a => a.timestamp >= options.since.getTime());
    }
    
    if (options?.limit) {
      alerts = alerts.slice(-options.limit);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all alerts for an agent
   */
  clearAlertsForAgent(agentId: string): void {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.agentId === agentId) {
        this.activeAlerts.delete(key);
      }
    }
  }

  /**
   * Setup default alert strategies
   */
  private setupDefaultStrategies(): void {
    // CPU threshold strategy
    this.registerStrategy({
      name: 'cpu-threshold',
      priority: 100,
      check: (sample, config) => {
        const alerts: ResourceAlert[] = [];
        
        if (sample.cpu.percent > config.alertThresholds.cpu) {
          alerts.push({
            type: 'cpu',
            level: sample.cpu.percent > 90 ? 'critical' : 'warning',
            message: `High CPU usage: ${sample.cpu.percent.toFixed(1)}%`,
            value: sample.cpu.percent,
            threshold: config.alertThresholds.cpu,
            timestamp: sample.timestamp,
            agentId: ''
          });
        }
        
        return alerts;
      }
    });

    // Memory threshold strategy
    this.registerStrategy({
      name: 'memory-threshold',
      priority: 100,
      check: (sample, config) => {
        const alerts: ResourceAlert[] = [];
        
        if (sample.memory.usage > config.alertThresholds.memory) {
          alerts.push({
            type: 'memory',
            level: sample.memory.usage > 95 ? 'critical' : 'warning',
            message: `High memory usage: ${sample.memory.usage.toFixed(1)}%`,
            value: sample.memory.usage,
            threshold: config.alertThresholds.memory,
            timestamp: sample.timestamp,
            agentId: ''
          });
        }
        
        return alerts;
      }
    });
  }

  /**
   * Generate a unique key for an alert
   */
  private getAlertKey(alert: ResourceAlert): string {
    return `${alert.agentId}-${alert.type}-${alert.level}`;
  }

  /**
   * Clean up alerts that are no longer active
   */
  private cleanupResolvedAlerts(sample: ResourceSample, agentId: string): void {
    const keysToRemove: string[] = [];
    
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.agentId !== agentId) continue;
      
      let isResolved = false;
      
      switch (alert.type) {
        case 'cpu':
          isResolved = sample.cpu.percent <= alert.threshold * 0.9; // 10% hysteresis
          break;
        case 'memory':
          isResolved = sample.memory.usage <= alert.threshold * 0.9;
          break;
      }
      
      if (isResolved) {
        keysToRemove.push(key);
        this.emit('alertResolved', alert);
      }
    }
    
    keysToRemove.forEach(key => this.activeAlerts.delete(key));
  }
}