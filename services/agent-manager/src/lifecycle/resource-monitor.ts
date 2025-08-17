/**
 * @package agent-manager/src/lifecycle
 * Agent Resource Monitor - Refactored for maintainability
 * 
 * Original 584+ lines broken down into:
 * - monitoring/types.ts - Type definitions  
 * - monitoring/resource-collector.ts - Data collection utilities
 */

import { EventEmitter } from 'events'
import * as os from 'os'
import type { AgentProcess, ResourceUsage, ResourceLimits } from '@team-dashboard/types'
import type { ResourceMonitorConfig, ResourceSample, ResourceAlert, SystemInfo } from './monitoring/types.js'
import { ResourceCollector } from './monitoring/resource-collector.js'

export type { ResourceMonitorConfig, ResourceSample, ResourceAlert } from './monitoring/types.js'

export class AgentResourceMonitor extends EventEmitter {
  private config: ResourceMonitorConfig
  private monitoringTimers: Map<string, NodeJS.Timeout> = new Map()
  private resourceHistory: Map<string, ResourceSample[]> = new Map()
  private processes: Map<string, AgentProcess> = new Map()
  private resourceLimits: Map<string, ResourceLimits> = new Map()
  private lastSamples: Map<string, ResourceSample> = new Map()
  private isShuttingDown = false
  private resourceCollector = ResourceCollector.getInstance()
  
  // Performance optimization
  private pendingUpdates: Set<string> = new Set()
  private batchTimer?: NodeJS.Timeout
  
  // System information
  private systemInfo: SystemInfo = {
    totalMemory: os.totalmem(),
    cpuCount: os.cpus().length,
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version
  }

  constructor(config: Partial<ResourceMonitorConfig> = {}) {
    super()
    this.config = {
      enabled: true,
      interval: 5000,
      alertThresholds: { cpu: 80, memory: 85, disk: 90 },
      historySizeLimit: 100,
      performanceMode: false,
      ...config
    }
  }

  async startMonitoring(agentId: string, process: AgentProcess, limits?: ResourceLimits): Promise<boolean> {
    if (!this.config.enabled || this.isShuttingDown) return false
    
    try {
      this.processes.set(agentId, process)
      if (limits) this.resourceLimits.set(agentId, limits)
      
      if (this.config.performanceMode) {
        this.startOptimizedMonitoring(agentId)
      } else {
        this.startStandardMonitoring(agentId)
      }
      
      this.emit('monitoring_started', { agentId, pid: process.pid })
      return true
    } catch (error) {
      this.emit('monitoring_error', { agentId, error })
      return false
    }
  }

  stopMonitoring(agentId: string): boolean {
    const timer = this.monitoringTimers.get(agentId)
    if (timer) {
      clearInterval(timer)
      this.monitoringTimers.delete(agentId)
    }
    
    this.processes.delete(agentId)
    this.resourceLimits.delete(agentId)
    this.lastSamples.delete(agentId)
    this.pendingUpdates.delete(agentId)
    
    this.emit('monitoring_stopped', { agentId })
    return true
  }

  getResourceMetrics(agentId: string): ResourceSample | null {
    return this.lastSamples.get(agentId) || null
  }

  getResourceHistory(agentId: string, limit?: number): ResourceSample[] {
    const history = this.resourceHistory.get(agentId) || []
    return limit ? history.slice(0, limit) : history
  }

  getAggregatedMetrics(): { totalCpu: number; totalMemory: number; agentCount: number } {
    let totalCpu = 0
    let totalMemory = 0
    let agentCount = 0
    
    for (const sample of this.lastSamples.values()) {
      totalCpu += sample.cpu.percent
      totalMemory += sample.memory.usage
      agentCount++
    }
    
    return {
      totalCpu: agentCount > 0 ? totalCpu / agentCount : 0,
      totalMemory: agentCount > 0 ? totalMemory / agentCount : 0,
      agentCount
    }
  }

  isMonitoring(agentId: string): boolean {
    return this.monitoringTimers.has(agentId)
  }

  async getSystemHealth(): Promise<{ cpu: number; memory: number; load: number[] }> {
    const cpus = os.cpus()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100
    
    return {
      cpu: 0, // Would need more complex calculation
      memory: memoryUsage,
      load: os.loadavg()
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true
    
    // Stop all monitoring
    for (const agentId of this.monitoringTimers.keys()) {
      this.stopMonitoring(agentId)
    }
    
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    
    this.emit('shutdown_complete')
  }

  private startOptimizedMonitoring(agentId: string): void {
    // Use batch processing for better performance
    this.pendingUpdates.add(agentId)
    this.scheduleBatchUpdate()
  }

  private startStandardMonitoring(agentId: string): void {
    const timer = setInterval(async () => {
      await this.collectResourceData(agentId)
    }, this.config.interval)
    
    this.monitoringTimers.set(agentId, timer)
  }

  private scheduleBatchUpdate(): void {
    if (this.batchTimer) return
    
    this.batchTimer = setTimeout(async () => {
      await this.processBatchUpdates()
      this.batchTimer = undefined
      
      if (this.pendingUpdates.size > 0) {
        this.scheduleBatchUpdate()
      }
    }, Math.min(this.config.interval, 1000))
  }

  private async processBatchUpdates(): Promise<void> {
    const updates = Array.from(this.pendingUpdates)
    this.pendingUpdates.clear()
    
    await Promise.all(updates.map(agentId => this.collectResourceData(agentId)))
  }

  private async collectResourceData(agentId: string): Promise<void> {
    if (this.isShuttingDown) return
    
    const process = this.processes.get(agentId)
    if (!process) return
    
    try {
      const sample = await this.resourceCollector.gatherResourceSample(process)
      this.lastSamples.set(agentId, sample)
      
      // Update history
      const history = this.resourceHistory.get(agentId) || []
      history.unshift(sample)
      
      if (history.length > this.config.historySizeLimit) {
        history.splice(this.config.historySizeLimit)
      }
      
      this.resourceHistory.set(agentId, history)
      
      // Check for alerts
      this.checkResourceAlerts(agentId, sample)
      
      this.emit('resource_update', { agentId, sample })
    } catch (error) {
      this.emit('monitoring_error', { agentId, error })
    }
  }

  private checkResourceAlerts(agentId: string, sample: ResourceSample): void {
    const { alertThresholds } = this.config
    
    if (sample.cpu.percent > alertThresholds.cpu) {
      this.emitAlert(agentId, 'cpu', sample.cpu.percent, alertThresholds.cpu)
    }
    
    if (sample.memory.usage > alertThresholds.memory) {
      this.emitAlert(agentId, 'memory', sample.memory.usage, alertThresholds.memory)
    }
  }

  private emitAlert(agentId: string, type: 'cpu' | 'memory' | 'disk', value: number, threshold: number): void {
    const alert: ResourceAlert = {
      agentId,
      alertType: type,
      severity: value > threshold * 1.2 ? 'critical' : 'warning',
      threshold,
      currentValue: value,
      timestamp: Date.now(),
      message: `${type.toUpperCase()} usage (${value.toFixed(1)}%) exceeds threshold (${threshold}%)`
    }
    
    this.emit('resource_alert', alert)
  }

  /**
   * Convert sample to ResourceUsage interface for compatibility
   */
  sampleToResourceUsage(sample: ResourceSample): ResourceUsage {
    return {
      memoryUsage: sample.memory.rss,
      cpuUsage: sample.cpu.percent,
      diskUsage: 0, // Not tracked in current implementation
      networkIO: { in: sample.network.rxBytes, out: sample.network.txBytes },
      timestamp: sample.timestamp
    }
  }
}

export default AgentResourceMonitor