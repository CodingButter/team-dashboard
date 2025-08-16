/**
 * Agent Connection Models
 * Classes and interfaces for managing Claude Code agent instances
 */

import { AgentModel, AgentStatus } from '../api/common';

/**
 * Represents a connected Claude Code agent instance
 */
export class AgentConnection {
  public readonly id: string;
  public readonly name: string;
  public readonly model: AgentModel;
  public status: AgentStatus;
  public readonly workspace: string;
  public readonly createdAt: Date;
  public startedAt?: Date;
  public stoppedAt?: Date;
  public lastActivity?: Date;
  
  // Process information
  public pid?: number;
  public process?: any; // ChildProcess instance
  
  // WebSocket connection
  public socketId?: string;
  public isConnected: boolean = false;
  
  // Resource tracking
  public resourceLimits?: {
    memory: number;
    cpu: number;
  };
  
  public currentResources?: {
    cpu: number;
    memory: number;
    threads: number;
  };
  
  // Session data
  public sessionData: Map<string, any> = new Map();
  public commandHistory: CommandHistoryEntry[] = [];
  public outputBuffer: OutputBuffer;
  
  constructor(params: {
    id: string;
    name: string;
    model: AgentModel;
    workspace: string;
    resourceLimits?: { memory: number; cpu: number };
  }) {
    this.id = params.id;
    this.name = params.name;
    this.model = params.model;
    this.workspace = params.workspace;
    this.status = 'starting';
    this.createdAt = new Date();
    this.resourceLimits = params.resourceLimits;
    this.outputBuffer = new OutputBuffer(params.id);
  }
  
  /**
   * Update agent status and track state transitions
   */
  updateStatus(newStatus: AgentStatus): void {
    this.status = newStatus;
    
    if (newStatus === 'running' && !this.startedAt) {
      this.startedAt = new Date();
    } else if (newStatus === 'stopped' || newStatus === 'crashed') {
      this.stoppedAt = new Date();
      this.isConnected = false;
    }
    
    this.lastActivity = new Date();
  }
  
  /**
   * Add command to history
   */
  addCommand(command: string, response?: string): void {
    this.commandHistory.push({
      command,
      response,
      timestamp: new Date(),
      executionTime: 0
    });
    this.lastActivity = new Date();
  }
  
  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    if (!this.startedAt) return 0;
    const endTime = this.stoppedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }
}

/**
 * Command history entry for an agent
 */
export interface CommandHistoryEntry {
  command: string;
  response?: string;
  timestamp: Date;
  executionTime: number;
  exitCode?: number;
  error?: string;
}

/**
 * Circular buffer for agent output
 */
export class OutputBuffer {
  private readonly maxSize: number = 10000; // lines
  private buffer: OutputLine[] = [];
  private sequence: number = 0;
  
  constructor(public readonly agentId: string) {}
  
  /**
   * Add output line to buffer
   */
  addLine(stream: 'stdout' | 'stderr', data: string): void {
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line) {
        this.buffer.push({
          sequence: this.sequence++,
          stream,
          data: line,
          timestamp: new Date()
        });
        
        // Maintain circular buffer size
        if (this.buffer.length > this.maxSize) {
          this.buffer.shift();
        }
      }
    }
  }
  
  /**
   * Get recent output lines
   */
  getRecent(count: number = 100): OutputLine[] {
    return this.buffer.slice(-count);
  }
  
  /**
   * Get output since sequence number
   */
  getSince(sequence: number): OutputLine[] {
    return this.buffer.filter(line => line.sequence > sequence);
  }
  
  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.sequence = 0;
  }
}

export interface OutputLine {
  sequence: number;
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: Date;
}