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

/**
 * Agent spawner for creating and managing agent processes
 */
export class AgentSpawner extends EventEmitter {
  private agents: Map<string, AgentProcessImpl> = new Map();
  
  /**
   * Spawn a new agent process
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
    
    // Update status
    agent.status = 'running';
    this.emit('agent:ready', { agentId: config.id });
    
    return agent;
  }
  
  /**
   * Kill an agent process
   */
  async kill(agentId: string, signal: string = 'SIGTERM'): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    agent.kill(signal);
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