/**
 * Integrated Agent Lifecycle Management
 * Combines all lifecycle components into a unified manager
 */

import { EventEmitter } from 'events';
import { 
  AgentProcess, 
  AgentSpawnConfig, 
  AgentStatus,
  ResourceLimits,
  HealthCheckConfig
} from '@team-dashboard/types';

import AgentLifecycleManager, { LifecycleConfig, RestartPolicy } from './agent-lifecycle';
import AgentHealthMonitor from './health-monitor';
import AgentResourceMonitor, { ResourceMonitorConfig } from './resource-monitor';
import AgentLifecycleEventLogger, { EventLoggerConfig } from './event-logger';

export interface IntegratedLifecycleConfig {
  lifecycle?: Partial<LifecycleConfig>;
  health?: Partial<HealthCheckConfig>;
  resources?: Partial<ResourceMonitorConfig>;
  events?: Partial<EventLoggerConfig>;
  restartPolicy?: Partial<RestartPolicy>;
}

export interface LifecycleManagerStats {
  totalAgents: number;
  activeAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  totalRestarts: number;
  uptime: number;
}

/**
 * Integrated Agent Lifecycle Manager
 * Orchestrates all lifecycle management components
 */
export class IntegratedAgentLifecycleManager extends EventEmitter {
  private lifecycleManager: AgentLifecycleManager;
  private healthMonitor: AgentHealthMonitor;
  private resourceMonitor: AgentResourceMonitor;
  private eventLogger: AgentLifecycleEventLogger;
  
  private agents: Map<string, AgentProcess> = new Map();
  private startTime = Date.now();
  private isInitialized = false;

  constructor(config: IntegratedLifecycleConfig = {}) {
    super();
    
    // Initialize components
    this.lifecycleManager = new AgentLifecycleManager(config.lifecycle, config.restartPolicy);
    this.healthMonitor = new AgentHealthMonitor(config.health);
    this.resourceMonitor = new AgentResourceMonitor(config.resources);
    this.eventLogger = new AgentLifecycleEventLogger(config.events);
    
    this.setupEventHandlers();
    this.isInitialized = true;
    
    console.log('[LifecycleManager] Integrated agent lifecycle manager initialized');
  }

  /**
   * Register and start managing an agent
   */
  async manageAgent(agentId: string, process: AgentProcess, config: AgentSpawnConfig): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Lifecycle manager not initialized');
    }

    console.log(`[LifecycleManager] Starting management for agent: ${agentId}`);
    
    // Store agent reference
    this.agents.set(agentId, process);
    
    // Register with all managers
    this.lifecycleManager.registerAgent(agentId, 'starting');
    this.healthMonitor.startMonitoring(agentId, process);
    this.resourceMonitor.startMonitoring(agentId, process, config.resourceLimits);
    
    // Log initial event
    this.eventLogger.logEvent(agentId, 'agent:registered', { 
      name: config.name,
      model: config.model,
      workspace: config.workspace 
    });

    // Simulate startup completion after brief delay
    setTimeout(() => {
      this.updateAgentStatus(agentId, 'idle', 'startup_completed');
    }, 1000);

    this.emit('agent:management_started', { agentId, timestamp: Date.now() });
  }

  /**
   * Update agent status across all managers
   */
  updateAgentStatus(agentId: string, status: AgentStatus, reason?: string, metadata?: any): boolean {
    const process = this.agents.get(agentId);
    if (!process) {
      console.warn(`[LifecycleManager] Cannot update status for unknown agent: ${agentId}`);
      return false;
    }

    const previousStatus = process.status;
    const success = this.lifecycleManager.updateStatus(agentId, status, reason, metadata);
    
    if (success) {
      // Update process status
      process.status = status;
      
      // Log state change
      this.eventLogger.logStateChange(agentId, previousStatus, status, reason, undefined, metadata);
      
      // Emit unified event
      this.emit('agent:status_changed', { 
        agentId, 
        fromStatus: previousStatus, 
        toStatus: status, 
        reason,
        timestamp: Date.now() 
      });
    }
    
    return success;
  }

  /**
   * Stop managing an agent
   */
  async stopManaging(agentId: string): Promise<void> {
    console.log(`[LifecycleManager] Stopping management for agent: ${agentId}`);
    
    // Stop all monitoring
    this.healthMonitor.stopMonitoring(agentId);
    this.resourceMonitor.stopMonitoring(agentId);
    this.lifecycleManager.unregisterAgent(agentId);
    
    // Remove from local storage
    this.agents.delete(agentId);
    
    // Log final event
    this.eventLogger.logEvent(agentId, 'agent:cleanup_completed');
    
    this.emit('agent:management_stopped', { agentId, timestamp: Date.now() });
  }

  /**
   * Initiate graceful shutdown for an agent
   */
  async gracefulShutdown(agentId: string, timeout?: number): Promise<boolean> {
    console.log(`[LifecycleManager] Initiating graceful shutdown for agent: ${agentId}`);
    
    this.eventLogger.logEvent(agentId, 'agent:cleanup_started', { timeout });
    
    const success = await this.lifecycleManager.gracefulShutdown(agentId, timeout);
    
    if (success) {
      await this.stopManaging(agentId);
    }
    
    return success;
  }

  /**
   * Get comprehensive agent information
   */
  getAgentInfo(agentId: string): any {
    const process = this.agents.get(agentId);
    const lifecycleState = this.lifecycleManager.getAgentState(agentId);
    const healthStatus = this.healthMonitor.getHealthStatus(agentId);
    // const resourceSample = this.resourceMonitor.getLatestSample(agentId); // TODO: Method not implemented
    
    if (!process) {
      return null;
    }

    return {
      id: agentId,
      process: {
        pid: process.pid,
        status: process.status,
        startTime: process.startTime
      },
      lifecycle: lifecycleState,
      health: healthStatus,
      resources: null, // resourceSample TODO: Method not implemented
      restartCount: this.lifecycleManager.getRestartCount(agentId)
    };
  }

  /**
   * Get all agents information
   */
  getAllAgentsInfo(): any[] {
    const agentIds = Array.from(this.agents.keys());
    return agentIds.map(agentId => this.getAgentInfo(agentId)).filter(Boolean);
  }

  /**
   * Get manager statistics
   */
  getStats(): LifecycleManagerStats {
    const allAgents = this.getAllAgentsInfo();
    const healthSummary = this.healthMonitor.getHealthSummary();
    // const resourceSummary = this.resourceMonitor.getResourceSummary(); // TODO: Method not implemented
    const resourceSummary: any[] = [];
    
    const activeAgents = allAgents.filter(agent => 
      ['running', 'idle', 'busy'].includes(agent.process.status)
    ).length;
    
    const averageCpuUsage = resourceSummary.length > 0 
      ? resourceSummary.reduce((sum, agent) => sum + agent.cpu, 0) / resourceSummary.length 
      : 0;
      
    const averageMemoryUsage = resourceSummary.length > 0
      ? resourceSummary.reduce((sum, agent) => sum + agent.memory, 0) / resourceSummary.length
      : 0;
    
    const totalRestarts = allAgents.reduce((sum, agent) => sum + (agent.restartCount || 0), 0);
    
    return {
      totalAgents: allAgents.length,
      activeAgents,
      healthyAgents: healthSummary.healthy,
      unhealthyAgents: healthSummary.unhealthy,
      averageCpuUsage,
      averageMemoryUsage,
      totalRestarts,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get recent events for an agent
   */
  async getAgentEvents(agentId: string, limit = 50): Promise<any[]> {
    return await this.eventLogger.getAgentEvents(agentId, limit);
  }

  /**
   * Get all recent events
   */
  async getRecentEvents(limit = 100): Promise<any[]> {
    return await this.eventLogger.getRecentEvents(limit);
  }

  /**
   * Setup event handlers between components
   */
  private setupEventHandlers(): void {
    // Lifecycle events
    this.lifecycleManager.on('agent:state_change', (eventData) => {
      this.emit('agent:lifecycle_event', eventData);
    });

    this.lifecycleManager.on('agent:restart_attempt', (data) => {
      this.eventLogger.logEvent(data.agentId, 'agent:restart_attempt', { attempt: data.attempt });
      this.emit('agent:restart_attempt', data);
    });

    // Health events
    this.healthMonitor.on('agent:health_failed', (data) => {
      this.eventLogger.logHealthCheck(data.agentId, false, data.checks || []);
      this.updateAgentStatus(data.agentId, 'error', 'health_check_failed');
      this.emit('agent:health_failed', data);
    });

    this.healthMonitor.on('agent:health_recovered', (data) => {
      this.eventLogger.logHealthCheck(data.agentId, true, []);
      this.emit('agent:health_recovered', data);
    });

    // Resource events
    this.resourceMonitor.on('resource:alert', (alert) => {
      this.eventLogger.logResourceAlert(
        alert.agentId, 
        alert.type, 
        alert.level, 
        alert.value, 
        alert.threshold, 
        alert.message
      );
      
      if (alert.level === 'critical') {
        this.updateAgentStatus(alert.agentId, 'error', 'resource_limit_exceeded', { alert });
      }
      
      this.emit('agent:resource_alert', alert);
    });

    // Cross-component integration
    this.resourceMonitor.on('resource:sample', (data) => {
      // Update health monitor with activity
      this.healthMonitor.updateActivity(data.agentId);
      this.emit('agent:resource_update', data);
    });

    console.log('[LifecycleManager] Event handlers configured');
  }

  /**
   * Perform system health check
   */
  async performSystemHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const stats = this.getStats();
    
    // Check for unhealthy agents
    if (stats.unhealthyAgents > 0) {
      issues.push(`${stats.unhealthyAgents} unhealthy agents detected`);
    }
    
    // Check for high resource usage
    if (stats.averageCpuUsage > 80) {
      issues.push(`High average CPU usage: ${stats.averageCpuUsage.toFixed(1)}%`);
    }
    
    if (stats.averageMemoryUsage > 80) {
      issues.push(`High average memory usage: ${stats.averageMemoryUsage.toFixed(1)}%`);
    }
    
    // Check for excessive restarts
    if (stats.totalRestarts > stats.totalAgents * 3) {
      issues.push(`Excessive restarts detected: ${stats.totalRestarts} total`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Shutdown all lifecycle management
   */
  async shutdown(): Promise<void> {
    console.log('[LifecycleManager] Shutting down integrated lifecycle manager...');
    
    this.isInitialized = false;
    
    // Gracefully shutdown all agents
    const shutdownPromises = Array.from(this.agents.keys()).map(agentId => 
      this.gracefulShutdown(agentId, 5000)
    );
    
    await Promise.allSettled(shutdownPromises);
    
    // Shutdown all components
    await Promise.all([
      this.eventLogger.shutdown(),
      Promise.resolve(this.resourceMonitor.shutdown()),
      Promise.resolve(this.healthMonitor.shutdown()),
      Promise.resolve(this.lifecycleManager.shutdown())
    ]);
    
    this.agents.clear();
    
    console.log('[LifecycleManager] Integrated lifecycle manager shutdown complete');
  }
}

// Export all components
export {
  AgentLifecycleManager,
  AgentHealthMonitor, 
  AgentResourceMonitor,
  AgentLifecycleEventLogger
};

export default IntegratedAgentLifecycleManager;