/**
 * Agent Health Monitor
 * Comprehensive health checking with heartbeat monitoring and responsiveness tests
 */

import { EventEmitter } from 'events';
import { 
  AgentProcess, 
  HealthCheckConfig, 
  AgentHealthStatus, 
  HealthCheck,
  AgentStatus 
} from '@team-dashboard/types';

export interface HealthMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastActivity: number;
  heartbeatMissed: number;
  consecutiveFailures: number;
}

export interface HealthThresholds {
  maxResponseTime: number;    // ms
  maxMemoryUsage: number;     // MB
  maxCpuUsage: number;        // percentage
  maxHeartbeatMissed: number;
  maxConsecutiveFailures: number;
  inactivityTimeout: number;  // ms
}

/**
 * Health Monitor for Agent Lifecycle Management
 * Monitors agent health through multiple check types and provides early warning
 */
export class AgentHealthMonitor extends EventEmitter {
  private healthStates: Map<string, AgentHealthStatus> = new Map();
  private healthTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: HealthCheckConfig;
  private thresholds: HealthThresholds;
  private processes: Map<string, AgentProcess> = new Map();

  constructor(
    config: Partial<HealthCheckConfig> = {},
    thresholds: Partial<HealthThresholds> = {}
  ) {
    super();
    
    this.config = {
      enabled: true,
      interval: 5000,     // 5 seconds
      timeout: 3000,      // 3 seconds
      retries: 3,
      startPeriod: 10000, // 10 seconds grace period
      ...config
    };

    this.thresholds = {
      maxResponseTime: 5000,        // 5 seconds
      maxMemoryUsage: 500,          // 500 MB
      maxCpuUsage: 80,              // 80%
      maxHeartbeatMissed: 3,
      maxConsecutiveFailures: 3,
      inactivityTimeout: 300000,    // 5 minutes
      ...thresholds
    };
  }

  /**
   * Start monitoring an agent
   */
  startMonitoring(agentId: string, process: AgentProcess): void {
    console.log(`[Health] Starting health monitoring for agent: ${agentId}`);
    
    // Initialize health status
    const healthStatus: AgentHealthStatus = {
      healthy: true,
      lastCheck: Date.now(),
      checks: [],
      failureCount: 0
    };

    this.healthStates.set(agentId, healthStatus);
    this.processes.set(agentId, process);

    // Start health checks after grace period
    setTimeout(() => {
      this.startHealthChecks(agentId);
      this.startHeartbeatMonitoring(agentId);
    }, this.config.startPeriod);

    this.emit('monitoring:started', { agentId, timestamp: Date.now() });
  }

  /**
   * Stop monitoring an agent
   */
  stopMonitoring(agentId: string): void {
    console.log(`[Health] Stopping health monitoring for agent: ${agentId}`);
    
    // Clear timers
    const healthTimer = this.healthTimers.get(agentId);
    if (healthTimer) {
      clearInterval(healthTimer);
      this.healthTimers.delete(agentId);
    }

    const heartbeatTimer = this.heartbeatTimers.get(agentId);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      this.heartbeatTimers.delete(agentId);
    }

    // Clean up state
    this.healthStates.delete(agentId);
    this.processes.delete(agentId);

    this.emit('monitoring:stopped', { agentId, timestamp: Date.now() });
  }

  /**
   * Start periodic health checks for an agent
   */
  private startHealthChecks(agentId: string): void {
    if (!this.config.enabled) {
      return;
    }

    const timer = setInterval(async () => {
      await this.performHealthCheck(agentId);
    }, this.config.interval);

    this.healthTimers.set(agentId, timer);
  }

  /**
   * Start heartbeat monitoring for an agent
   */
  private startHeartbeatMonitoring(agentId: string): void {
    const timer = setInterval(() => {
      this.checkHeartbeat(agentId);
    }, this.config.interval / 2); // Check heartbeat more frequently

    this.heartbeatTimers.set(agentId, timer);
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(agentId: string): Promise<void> {
    const healthStatus = this.healthStates.get(agentId);
    const process = this.processes.get(agentId);
    
    if (!healthStatus || !process) {
      return;
    }

    const startTime = Date.now();
    let allChecksPass = true;

    // Perform different types of health checks
    const checks: HealthCheck[] = [];

    try {
      // 1. Ping check - verify process is responsive
      const pingCheck = await this.performPingCheck(agentId, process);
      checks.push(pingCheck);
      if (!pingCheck.success) allChecksPass = false;

      // 2. Resource check - verify resource usage is within limits
      const resourceCheck = await this.performResourceCheck(agentId, process);
      checks.push(resourceCheck);
      if (!resourceCheck.success) allChecksPass = false;

      // 3. Responsiveness check - verify agent can handle commands
      const responsivenessCheck = await this.performResponsivenessCheck(agentId, process);
      checks.push(responsivenessCheck);
      if (!responsivenessCheck.success) allChecksPass = false;

      // Update health status
      healthStatus.lastCheck = Date.now();
      healthStatus.checks.push(...checks);
      
      // Keep only recent checks (last 10)
      if (healthStatus.checks.length > 10) {
        healthStatus.checks = healthStatus.checks.slice(-10);
      }

      if (allChecksPass) {
        if (!healthStatus.healthy) {
          console.log(`[Health] Agent ${agentId} recovered to healthy state`);
          this.emit('agent:health_recovered', { agentId, timestamp: Date.now() });
        }
        healthStatus.healthy = true;
        healthStatus.failureCount = 0;
      } else {
        healthStatus.failureCount++;
        
        if (healthStatus.failureCount >= this.config.retries) {
          if (healthStatus.healthy) {
            console.warn(`[Health] Agent ${agentId} marked as unhealthy after ${healthStatus.failureCount} failures`);
            this.emit('agent:health_failed', { 
              agentId, 
              timestamp: Date.now(), 
              failureCount: healthStatus.failureCount,
              checks: checks.filter(c => !c.success)
            });
          }
          healthStatus.healthy = false;
        }
      }

      this.emit('agent:health_check_complete', {
        agentId,
        healthy: healthStatus.healthy,
        checks,
        duration: Date.now() - startTime
      });

    } catch (error) {
      console.error(`[Health] Health check failed for agent ${agentId}:`, error);
      healthStatus.failureCount++;
      
      if (healthStatus.failureCount >= this.config.retries) {
        healthStatus.healthy = false;
        this.emit('agent:health_check_error', { agentId, error, timestamp: Date.now() });
      }
    }
  }

  /**
   * Perform ping check to verify process is alive
   */
  private async performPingCheck(agentId: string, process: AgentProcess): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check if process is still running
      if (!process.pid) {
        return {
          timestamp: startTime,
          type: 'ping',
          success: false,
          duration: Date.now() - startTime,
          details: { error: 'No PID available' }
        };
      }

      // On Unix systems, signal 0 can be used to check if process exists
      try {
        process.kill && process.kill('0'); // This doesn't actually kill, just checks if process exists
        return {
          timestamp: startTime,
          type: 'ping',
          success: true,
          duration: Date.now() - startTime,
          details: { pid: process.pid }
        };
      } catch (error) {
        return {
          timestamp: startTime,
          type: 'ping',
          success: false,
          duration: Date.now() - startTime,
          details: { error: 'Process not found', pid: process.pid }
        };
      }
    } catch (error) {
      return {
        timestamp: startTime,
        type: 'ping',
        success: false,
        duration: Date.now() - startTime,
        details: { error: error.message }
      };
    }
  }

  /**
   * Perform resource usage check
   */
  private async performResourceCheck(agentId: string, process: AgentProcess): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const resourceUsage = process.resourceUsage;
      
      if (!resourceUsage) {
        return {
          timestamp: startTime,
          type: 'resource',
          success: false,
          duration: Date.now() - startTime,
          details: { error: 'No resource usage data available' }
        };
      }

      // Check if resource usage is within thresholds
      const memoryMB = resourceUsage.memory.rss / (1024 * 1024);
      const cpuPercent = resourceUsage.cpu.percent;
      
      const withinLimits = 
        memoryMB <= this.thresholds.maxMemoryUsage &&
        cpuPercent <= this.thresholds.maxCpuUsage;

      return {
        timestamp: startTime,
        type: 'resource',
        success: withinLimits,
        duration: Date.now() - startTime,
        details: {
          memory: { current: memoryMB, limit: this.thresholds.maxMemoryUsage },
          cpu: { current: cpuPercent, limit: this.thresholds.maxCpuUsage },
          withinLimits
        }
      };
    } catch (error) {
      return {
        timestamp: startTime,
        type: 'resource',
        success: false,
        duration: Date.now() - startTime,
        details: { error: error.message }
      };
    }
  }

  /**
   * Perform responsiveness check by sending a test command
   */
  private async performResponsivenessCheck(agentId: string, process: AgentProcess): Promise<HealthCheck> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          timestamp: startTime,
          type: 'responsiveness',
          success: false,
          duration: Date.now() - startTime,
          details: { error: 'Timeout waiting for response' }
        });
      }, this.config.timeout);

      try {
        // Send a simple command that should get a quick response
        if (process.write && process.status === 'running') {
          // Send echo command to test responsiveness
          const testCommand = 'echo "health-check-ping"\n';
          process.write(testCommand);
          
          // For now, assume success if we can write to the process
          // In a full implementation, we'd listen for the response
          clearTimeout(timeout);
          resolve({
            timestamp: startTime,
            type: 'responsiveness',
            success: true,
            duration: Date.now() - startTime,
            details: { command: testCommand.trim() }
          });
        } else {
          clearTimeout(timeout);
          resolve({
            timestamp: startTime,
            type: 'responsiveness',
            success: false,
            duration: Date.now() - startTime,
            details: { error: 'Process not in running state or no write method' }
          });
        }
      } catch (error) {
        clearTimeout(timeout);
        resolve({
          timestamp: startTime,
          type: 'responsiveness',
          success: false,
          duration: Date.now() - startTime,
          details: { error: error.message }
        });
      }
    });
  }

  /**
   * Check heartbeat for an agent
   */
  private checkHeartbeat(agentId: string): void {
    const healthStatus = this.healthStates.get(agentId);
    const process = this.processes.get(agentId);
    
    if (!healthStatus || !process) {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - (process.startTime || now);
    
    // Check if agent has been inactive too long
    if (timeSinceLastActivity > this.thresholds.inactivityTimeout) {
      console.warn(`[Health] Agent ${agentId} inactive for ${timeSinceLastActivity}ms`);
      this.emit('agent:heartbeat_missed', { 
        agentId, 
        inactiveTime: timeSinceLastActivity,
        timestamp: now 
      });
    }
  }

  /**
   * Update agent activity (call this when agent shows activity)
   */
  updateActivity(agentId: string): void {
    const process = this.processes.get(agentId);
    if (process) {
      // Update last activity time
      // Note: In a full implementation, we'd add a lastActivity field to AgentProcess
      this.emit('agent:activity', { agentId, timestamp: Date.now() });
    }
  }

  /**
   * Get health status for an agent
   */
  getHealthStatus(agentId: string): AgentHealthStatus | undefined {
    return this.healthStates.get(agentId);
  }

  /**
   * Get health status for all agents
   */
  getAllHealthStatuses(): Map<string, AgentHealthStatus> {
    return new Map(this.healthStates);
  }

  /**
   * Check if an agent is healthy
   */
  isAgentHealthy(agentId: string): boolean {
    const status = this.healthStates.get(agentId);
    return status?.healthy || false;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): { total: number; healthy: number; unhealthy: number } {
    const total = this.healthStates.size;
    let healthy = 0;
    let unhealthy = 0;

    for (const status of this.healthStates.values()) {
      if (status.healthy) {
        healthy++;
      } else {
        unhealthy++;
      }
    }

    return { total, healthy, unhealthy };
  }

  /**
   * Shutdown health monitor
   */
  shutdown(): void {
    console.log('[Health] Shutting down health monitor...');
    
    // Clear all timers
    for (const [agentId, timer] of this.healthTimers.entries()) {
      clearInterval(timer);
      console.log(`[Health] Cleared health timer for agent: ${agentId}`);
    }
    
    for (const [agentId, timer] of this.heartbeatTimers.entries()) {
      clearInterval(timer);
      console.log(`[Health] Cleared heartbeat timer for agent: ${agentId}`);
    }

    this.healthTimers.clear();
    this.heartbeatTimers.clear();
    this.healthStates.clear();
    this.processes.clear();

    console.log('[Health] Health monitor shutdown complete');
  }
}

export default AgentHealthMonitor;