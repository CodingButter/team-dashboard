/**
 * Agent Lifecycle Management
 * Comprehensive state management, restart logic, and graceful shutdown
 */

import { EventEmitter } from 'events';
import { 
  AgentStatus,
  AgentProcessEventData 
} from '@team-dashboard/types';

export interface LifecycleConfig {
  maxRestartAttempts: number;
  restartBackoffMs: number;
  maxBackoffMs: number;
  healthCheckInterval: number;
  gracefulShutdownTimeout: number;
  resourceCheckInterval: number;
}

export interface AgentLifecycleState {
  agentId: string;
  status: AgentStatus;
  restartCount: number;
  lastStateChange: number;
  lastHealthCheck: number;
  shutdownInProgress: boolean;
  stateHistory: StateHistoryEntry[];
}

export interface StateHistoryEntry {
  fromStatus: AgentStatus;
  toStatus: AgentStatus;
  timestamp: number;
  reason?: string;
  metadata?: any;
}

export interface RestartPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
}

/**
 * Agent Lifecycle Manager
 * Manages comprehensive agent state transitions, health monitoring, and restart logic
 */
export class AgentLifecycleManager extends EventEmitter {
  private agents: Map<string, AgentLifecycleState> = new Map();
  private restartTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private config: LifecycleConfig;
  private restartPolicy: RestartPolicy;

  constructor(
    config: Partial<LifecycleConfig> = {},
    restartPolicy: Partial<RestartPolicy> = {}
  ) {
    super();
    
    this.config = {
      maxRestartAttempts: 3,
      restartBackoffMs: 1000,
      maxBackoffMs: 30000,
      healthCheckInterval: 5000,
      gracefulShutdownTimeout: 10000,
      resourceCheckInterval: 2000,
      ...config
    };

    this.restartPolicy = {
      enabled: true,
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2,
      ...restartPolicy
    };

    this.startHealthChecks();
  }

  /**
   * Register a new agent for lifecycle management
   */
  registerAgent(agentId: string, initialStatus: AgentStatus = 'starting'): void {
    const state: AgentLifecycleState = {
      agentId,
      status: initialStatus,
      restartCount: 0,
      lastStateChange: Date.now(),
      lastHealthCheck: Date.now(),
      shutdownInProgress: false,
      stateHistory: []
    };

    this.agents.set(agentId, state);
    this.emitStateChange(agentId, initialStatus, 'registered');
    
    console.log(`[Lifecycle] Agent registered: ${agentId} with status: ${initialStatus}`);
  }

  /**
   * Update agent status with validation and history tracking
   */
  updateStatus(agentId: string, newStatus: AgentStatus, reason?: string, metadata?: any): boolean {
    const state = this.agents.get(agentId);
    if (!state) {
      console.warn(`[Lifecycle] Cannot update status for unknown agent: ${agentId}`);
      return false;
    }

    // Validate state transition
    if (!this.isValidTransition(state.status, newStatus)) {
      console.warn(`[Lifecycle] Invalid state transition: ${state.status} -> ${newStatus} for agent ${agentId}`);
      return false;
    }

    const previousStatus = state.status;
    
    // Update state
    state.stateHistory.push({
      fromStatus: previousStatus,
      toStatus: newStatus,
      timestamp: Date.now(),
      reason,
      metadata
    });

    state.status = newStatus;
    state.lastStateChange = Date.now();

    // Handle special status transitions
    if (newStatus === 'crashed' || newStatus === 'error') {
      this.handleAgentFailure(agentId, reason);
    } else if (newStatus === 'terminated') {
      this.handleAgentTermination(agentId);
    } else if (newStatus === 'idle') {
      // Reset restart count on successful idle state
      state.restartCount = 0;
    }

    this.emitStateChange(agentId, newStatus, reason, metadata);
    
    console.log(`[Lifecycle] Agent ${agentId} status updated: ${previousStatus} -> ${newStatus}`);
    return true;
  }

  /**
   * Handle agent failure with restart logic
   */
  private async handleAgentFailure(agentId: string, _reason?: string): Promise<void> {
    const state = this.agents.get(agentId);
    if (!state || !this.restartPolicy.enabled) {
      return;
    }

    state.restartCount++;
    
    if (state.restartCount > this.restartPolicy.maxAttempts) {
      console.error(`[Lifecycle] Agent ${agentId} exceeded max restart attempts (${this.restartPolicy.maxAttempts})`);
      this.updateStatus(agentId, 'terminated', 'max_restart_attempts_exceeded');
      return;
    }

    const delay = this.calculateRestartDelay(state.restartCount);
    console.log(`[Lifecycle] Scheduling restart for agent ${agentId} in ${delay}ms (attempt ${state.restartCount}/${this.restartPolicy.maxAttempts})`);

    // Clear any existing restart timer
    const existingTimer = this.restartTimers.get(agentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule restart
    const timer = setTimeout(() => {
      this.performRestart(agentId);
    }, delay);

    this.restartTimers.set(agentId, timer);
  }

  /**
   * Calculate restart delay based on backoff strategy
   */
  private calculateRestartDelay(attempt: number): number {
    const { backoffStrategy, initialDelayMs, maxDelayMs, multiplier } = this.restartPolicy;
    
    let delay: number;
    
    switch (backoffStrategy) {
      case 'exponential':
        delay = initialDelayMs * Math.pow(multiplier, attempt - 1);
        break;
      case 'linear':
        delay = initialDelayMs * attempt;
        break;
      case 'fixed':
      default:
        delay = initialDelayMs;
        break;
    }

    return Math.min(delay, maxDelayMs);
  }

  /**
   * Perform agent restart
   */
  private async performRestart(agentId: string): Promise<void> {
    console.log(`[Lifecycle] Attempting to restart agent: ${agentId}`);
    
    this.updateStatus(agentId, 'starting', 'automatic_restart');
    this.emit('agent:restart_attempt', { agentId, attempt: this.getRestartCount(agentId) });
  }

  /**
   * Initiate graceful shutdown for an agent
   */
  async gracefulShutdown(agentId: string, timeout?: number): Promise<boolean> {
    const state = this.agents.get(agentId);
    if (!state) {
      return false;
    }

    if (state.shutdownInProgress) {
      console.log(`[Lifecycle] Shutdown already in progress for agent: ${agentId}`);
      return false;
    }

    state.shutdownInProgress = true;
    const shutdownTimeout = timeout || this.config.gracefulShutdownTimeout;
    
    console.log(`[Lifecycle] Starting graceful shutdown for agent: ${agentId} (timeout: ${shutdownTimeout}ms)`);
    
    // Update status to stopping
    this.updateStatus(agentId, 'stopping', 'graceful_shutdown_initiated');
    
    return new Promise((resolve) => {
      let completed = false;
      
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!completed) {
          completed = true;
          console.warn(`[Lifecycle] Graceful shutdown timeout for agent: ${agentId}`);
          this.emit('agent:shutdown_timeout', { agentId });
          resolve(false);
        }
      }, shutdownTimeout);

      // Listen for successful shutdown
      const onShutdown = (eventAgentId: string) => {
        if (eventAgentId === agentId && !completed) {
          completed = true;
          clearTimeout(timeoutHandle);
          console.log(`[Lifecycle] Graceful shutdown completed for agent: ${agentId}`);
          resolve(true);
        }
      };

      this.once(`agent:shutdown:${agentId}`, onShutdown);
      
      // Emit shutdown request
      this.emit('agent:shutdown_request', { agentId, timeout: shutdownTimeout });
    });
  }

  /**
   * Handle agent termination cleanup
   */
  private handleAgentTermination(agentId: string): void {
    const state = this.agents.get(agentId);
    if (!state) {
      return;
    }

    // Clear restart timer if exists
    const timer = this.restartTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.restartTimers.delete(agentId);
    }

    state.shutdownInProgress = false;
    console.log(`[Lifecycle] Agent terminated and cleaned up: ${agentId}`);
    
    this.emit(`agent:shutdown:${agentId}`, agentId);
  }

  /**
   * Validate state transitions
   */
  private isValidTransition(from: AgentStatus, to: AgentStatus): boolean {
    const validTransitions: Record<AgentStatus, AgentStatus[]> = {
      'starting': ['idle', 'running', 'busy', 'error', 'crashed', 'terminated', 'ready'],
      'idle': ['busy', 'running', 'paused', 'stopping', 'error', 'crashed', 'terminated'],
      'busy': ['idle', 'running', 'paused', 'stopping', 'error', 'crashed', 'terminated'],
      'running': ['idle', 'busy', 'paused', 'stopping', 'error', 'crashed', 'terminated'],
      'paused': ['idle', 'busy', 'running', 'stopping', 'stopped', 'error', 'crashed', 'terminated'],
      'stopping': ['stopped', 'terminated', 'error', 'crashed', 'exited'],
      'stopped': ['starting', 'terminated'],
      'error': ['starting', 'terminated', 'crashed'],
      'crashed': ['starting', 'terminated'],
      'terminated': [], // Terminal state
      'ready': ['idle', 'busy', 'running', 'error', 'crashed', 'terminated'],
      'spawned': ['ready', 'starting', 'error', 'crashed', 'terminated'],
      'exited': ['starting', 'terminated']
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all agents
   */
  private performHealthChecks(): void {
    const now = Date.now();
    
    for (const [agentId, state] of this.agents.entries()) {
      if (state.status === 'terminated' || state.shutdownInProgress) {
        continue;
      }

      // Update last health check time
      state.lastHealthCheck = now;
      
      this.emit('agent:health_check', { agentId, status: state.status, timestamp: now });
    }
  }

  /**
   * Get agent lifecycle state
   */
  getAgentState(agentId: string): AgentLifecycleState | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get restart count for an agent
   */
  getRestartCount(agentId: string): number {
    return this.agents.get(agentId)?.restartCount || 0;
  }

  /**
   * Remove agent from lifecycle management
   */
  unregisterAgent(agentId: string): boolean {
    const state = this.agents.get(agentId);
    if (!state) {
      return false;
    }

    // Clear any pending restart timer
    const timer = this.restartTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.restartTimers.delete(agentId);
    }

    this.agents.delete(agentId);
    console.log(`[Lifecycle] Agent unregistered: ${agentId}`);
    return true;
  }

  /**
   * Get all agent states
   */
  getAllAgentStates(): Map<string, AgentLifecycleState> {
    return new Map(this.agents);
  }

  /**
   * Emit state change event
   */
  private emitStateChange(agentId: string, status: AgentStatus, reason?: string, metadata?: any): void {
    const eventData: AgentProcessEventData = {
      type: 'ready',
      agentId,
      timestamp: Date.now(),
      data: { status, reason, metadata }
    };

    this.emit('agent:state_change', eventData);
    this.emit(`agent:${status}`, { agentId, timestamp: Date.now() });
  }

  /**
   * Cleanup and shutdown lifecycle manager
   */
  shutdown(): void {
    console.log('[Lifecycle] Shutting down lifecycle manager...');
    
    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    // Clear all restart timers
    for (const [agentId, timer] of this.restartTimers.entries()) {
      clearTimeout(timer);
      console.log(`[Lifecycle] Cleared restart timer for agent: ${agentId}`);
    }
    
    this.restartTimers.clear();
    this.agents.clear();
    
    console.log('[Lifecycle] Lifecycle manager shutdown complete');
  }
}

export default AgentLifecycleManager;