/**
 * Agent Spawner
 * Demonstrates basic agent spawning with node-pty integration
 * This is a proof-of-concept for the architecture foundation
 */

import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { 
  AgentSpawnConfig, 
  AgentProcess, 
  AgentStatus,
  ResourceUsage,
  PtyOptions 
} from '@team-dashboard/types';
import IntegratedAgentLifecycleManager from '../lifecycle';

/**
 * Agent spawner for creating and managing agent processes with integrated lifecycle management
 */
export class AgentSpawner extends EventEmitter {
  private agents: Map<string, AgentProcessImpl> = new Map();
  private lifecycleManager: IntegratedAgentLifecycleManager;
  
  constructor() {
    super();
    // Initialize lifecycle manager with performance-optimized settings
    this.lifecycleManager = new IntegratedAgentLifecycleManager({
      lifecycle: {
        maxRestartAttempts: 3,
        restartBackoffMs: 1000,
        maxBackoffMs: 30000,
        healthCheckInterval: 5000,
        gracefulShutdownTimeout: 10000,
        resourceCheckInterval: 2000
      },
      resources: {
        enabled: true,
        interval: 2000,
        performanceMode: true,
        alertThresholds: {
          cpu: 80,
          memory: 85,
          disk: 90
        }
      },
      health: {
        enabled: true,
        interval: 5000,
        timeout: 3000,
        retries: 3,
        startPeriod: 10000
      },
      events: {
        enabled: true,
        logToFile: true,
        logToConsole: true,
        bufferSize: 100,
        flushInterval: 5000
      }
    });

    // Forward lifecycle events
    this.lifecycleManager.on('agent:status_changed', (data) => {
      this.emit('agent:status_changed', data);
    });

    this.lifecycleManager.on('agent:resource_alert', (alert) => {
      this.emit('agent:resource_alert', alert);
    });

    this.lifecycleManager.on('agent:health_failed', (data) => {
      this.emit('agent:health_failed', data);
    });

    this.lifecycleManager.on('agent:restart_attempt', (data) => {
      this.emit('agent:restart_attempt', data);
    });
  }
  
  /**
   * Spawn a new agent process with integrated lifecycle management
   */
  async spawn(config: AgentSpawnConfig): Promise<AgentProcess> {
    console.log(`[AgentSpawner] Spawning agent: ${config.name}`);
    
    // Validate configuration
    this.validateConfig(config);
    
    // Create PTY options
    const ptyOptions: PtyOptions = {
      cols: config.ptyOptions?.cols || 80,
      rows: config.ptyOptions?.rows || 24,
      cwd: config.workspace,
      env: {
        ...process.env,
        ...config.environment,
        AGENT_ID: config.id,
        AGENT_NAME: config.name,
        AGENT_MODEL: config.model,
      },
      encoding: config.ptyOptions?.encoding || 'utf8',
    };
    
    // Spawn PTY process
    const ptyProcess = pty.spawn(
      config.ptyOptions?.shell || '/bin/bash',
      [],
      {
        name: 'xterm-256color',
        cols: ptyOptions.cols!,
        rows: ptyOptions.rows!,
        cwd: ptyOptions.cwd,
        env: ptyOptions.env as any,
      }
    );
    
    // Create agent process wrapper
    const agent = new AgentProcessImpl(
      config.id,
      ptyProcess.pid,
      ptyProcess,
      'starting'
    );
    
    // Set up event handlers
    this.setupEventHandlers(agent, ptyProcess);
    
    // Store agent
    this.agents.set(config.id, agent);
    
    // Initialize agent environment
    await this.initializeAgent(agent, config);
    
    // Start lifecycle management
    await this.lifecycleManager.manageAgent(config.id, agent, config);
    
    // Update status
    agent.status = 'running';
    this.emit('agent:ready', { agentId: config.id });
    
    return agent;
  }
  
  /**
   * Kill an agent process with graceful shutdown
   */
  async kill(agentId: string, signal: string = 'SIGTERM'): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Attempt graceful shutdown first
    const gracefulSuccess = await this.lifecycleManager.gracefulShutdown(agentId, 5000);
    
    if (!gracefulSuccess) {
      console.warn(`[AgentSpawner] Graceful shutdown failed for ${agentId}, forcing termination`);
      agent.kill(signal);
    }
    
    this.agents.delete(agentId);
    this.emit('agent:terminated', { agentId });
  }
  
  /**
   * Get an agent process
   */
  getAgent(agentId: string): AgentProcess | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * List all agent processes
   */
  listAgents(): AgentProcess[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Validate spawn configuration
   */
  private validateConfig(config: AgentSpawnConfig): void {
    if (!config.id || !config.name) {
      throw new Error('Agent ID and name are required');
    }
    
    if (!config.workspace) {
      throw new Error('Workspace path is required');
    }
    
    if (this.agents.has(config.id)) {
      throw new Error(`Agent already exists: ${config.id}`);
    }
    
    // Validate resource limits
    if (config.resourceLimits) {
      if (config.resourceLimits.memory < 256) {
        throw new Error('Minimum memory limit is 256MB');
      }
      if (config.resourceLimits.cpu < 0 || config.resourceLimits.cpu > 100) {
        throw new Error('CPU limit must be between 0 and 100');
      }
    }
  }
  
  /**
   * Set up PTY event handlers
   */
  private setupEventHandlers(agent: AgentProcessImpl, ptyProcess: any): void {
    // Handle data output
    ptyProcess.onData((data: string) => {
      this.emit('agent:output', {
        agentId: agent.id,
        stream: 'stdout',
        data,
        timestamp: Date.now(),
      });
    });
    
    // Handle exit
    ptyProcess.onExit((exitCode: any) => {
      agent.status = exitCode.exitCode === 0 ? 'stopped' : 'crashed';
      this.emit('agent:exit', {
        agentId: agent.id,
        exitCode: exitCode.exitCode,
        signal: exitCode.signal,
      });
      this.agents.delete(agent.id);
    });
  }
  
  /**
   * Initialize agent environment
   */
  private async initializeAgent(agent: AgentProcessImpl, config: AgentSpawnConfig): Promise<void> {
    // Send initialization commands
    const initCommands = [
      'clear',
      `echo "Agent ${config.name} (${config.id}) initialized"`,
      `echo "Model: ${config.model}"`,
      `echo "Workspace: ${config.workspace}"`,
      `cd ${config.workspace}`,
      'echo "Ready for commands..."',
    ];
    
    for (const cmd of initCommands) {
      agent.write(cmd + '\n');
      await this.delay(100);
    }
  }
  
  /**
   * Get comprehensive agent information including lifecycle status
   */
  getAgentInfo(agentId: string): any {
    return this.lifecycleManager.getAgentInfo(agentId);
  }

  /**
   * Get all agents information including lifecycle status
   */
  getAllAgentsInfo(): any[] {
    return this.lifecycleManager.getAllAgentsInfo();
  }

  /**
   * Get lifecycle manager statistics
   */
  getLifecycleStats(): any {
    return this.lifecycleManager.getStats();
  }

  /**
   * Get recent events for an agent
   */
  async getAgentEvents(agentId: string, limit = 50): Promise<any[]> {
    return await this.lifecycleManager.getAgentEvents(agentId, limit);
  }

  /**
   * Perform system health check
   */
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    return await this.lifecycleManager.performSystemHealthCheck();
  }

  /**
   * Shutdown all agents and lifecycle management
   */
  async shutdown(): Promise<void> {
    console.log('[AgentSpawner] Shutting down agent spawner...');
    await this.lifecycleManager.shutdown();
    this.agents.clear();
    console.log('[AgentSpawner] Agent spawner shutdown complete');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Implementation of AgentProcess interface
 */
class AgentProcessImpl implements AgentProcess {
  public resourceUsage?: ResourceUsage;
  
  constructor(
    public readonly id: string,
    public readonly pid: number,
    public readonly pty: any,
    public status: AgentStatus,
    public readonly startTime: number = Date.now()
  ) {}
  
  /**
   * Write data to the PTY
   */
  write(data: string): void {
    if (this.pty && this.status === 'running') {
      this.pty.write(data);
    }
  }
  
  /**
   * Resize the PTY
   */
  resize(cols: number, rows: number): void {
    if (this.pty && this.status === 'running') {
      this.pty.resize(cols, rows);
    }
  }
  
  /**
   * Kill the process
   */
  kill(signal: string = 'SIGTERM'): void {
    if (this.pty) {
      this.pty.kill(signal);
    }
  }
  
  /**
   * Pause the process (not implemented in basic version)
   */
  pause(): void {
    // Would send SIGSTOP in full implementation
    this.status = 'paused';
  }
  
  /**
   * Resume the process (not implemented in basic version)
   */
  resume(): void {
    // Would send SIGCONT in full implementation
    this.status = 'running';
  }
}

// Export for use in WebSocket server
export default AgentSpawner;