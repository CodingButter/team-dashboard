/**
 * Agent Communication Manager
 * Integrates inter-agent communication with the existing agent management system
 */

import { EventEmitter } from 'events';
import { MessageBroker } from './message-broker';
import {
  CommunicationConfig,
  AgentMessage,
  BroadcastMessage,
  TaskHandoff,
  AgentEvent,
  AgentId,
  Task,
  TaskContext
} from '@team-dashboard/types';

export interface CommunicationManagerConfig {
  redis: CommunicationConfig['redis'];
  channels: {
    direct: string;
    broadcast: string;
    handoff: string;
    events: string;
  };
  messageRetention: {
    direct: number;
    broadcast: number;
    handoff: number;
  };
  rateLimits: {
    messagesPerMinute: number;
    broadcastsPerMinute: number;
    handoffsPerHour: number;
  };
}

export class AgentCommunicationManager extends EventEmitter {
  private broker: MessageBroker;
  private registeredAgents: Map<AgentId, { status: 'active' | 'inactive'; lastSeen: number }> = new Map();
  private activeHandoffs: Map<string, TaskHandoff> = new Map();

  constructor(config: CommunicationManagerConfig) {
    super();
    this.broker = new MessageBroker(config as CommunicationConfig);
    this.setupEventHandlers();
  }

  /**
   * Initialize the communication manager
   */
  async initialize(): Promise<void> {
    await this.broker.connect();
    
    // Subscribe to all agent events
    this.broker.subscribeToEvents((event) => {
      this.handleAgentEvent(event);
    });

    // Subscribe to common broadcast channels
    this.subscribeToSystemChannels();

    console.log('Agent Communication Manager initialized');
    this.emit('initialized');
  }

  /**
   * Shutdown the communication manager
   */
  async shutdown(): Promise<void> {
    await this.broker.disconnect();
    this.registeredAgents.clear();
    this.activeHandoffs.clear();
    console.log('Agent Communication Manager shut down');
    this.emit('shutdown');
  }

  /**
   * Register an agent with the communication system
   */
  async registerAgent(agentId: AgentId): Promise<void> {
    this.registeredAgents.set(agentId, {
      status: 'active',
      lastSeen: Date.now()
    });

    // Subscribe to direct messages for this agent
    this.broker.subscribeToHandoffs(agentId, (handoff) => {
      this.handleIncomingHandoff(agentId, handoff);
    });

    // Publish agent registration event
    await this.broker.publishEvent({
      agentId,
      type: 'spawned',
      data: { registered: true },
      source: 'communication-manager'
    });

    console.log(`Agent ${agentId} registered for communication`);
    this.emit('agentRegistered', agentId);
  }

  /**
   * Unregister an agent from the communication system
   */
  async unregisterAgent(agentId: AgentId): Promise<void> {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.status = 'inactive';
      
      // Publish agent termination event
      await this.broker.publishEvent({
        agentId,
        type: 'terminated',
        data: { unregistered: true },
        source: 'communication-manager'
      });

      // Clean up any pending handoffs
      await this.cleanupAgentHandoffs(agentId);
    }

    console.log(`Agent ${agentId} unregistered from communication`);
    this.emit('agentUnregistered', agentId);
  }

  /**
   * Send a message between agents
   */
  async sendMessage(from: AgentId, to: AgentId, content: string, type: 'direct' | 'request' | 'response' = 'direct', correlationId?: string): Promise<void> {
    this.validateAgent(from);
    this.validateAgent(to);

    await this.broker.sendMessage({
      from,
      to,
      content,
      type,
      correlationId,
      metadata: {
        source: 'agent-communication-manager'
      }
    });

    this.emit('messageSent', { from, to, type });
  }

  /**
   * Broadcast a message to all agents or a specific channel
   */
  async broadcast(from: AgentId, channel: string, content: string, type: 'event' | 'status' | 'alert' | 'announcement' = 'announcement'): Promise<void> {
    this.validateAgent(from);

    await this.broker.broadcast({
      from,
      channel,
      content,
      type,
      metadata: {
        source: 'agent-communication-manager'
      }
    });

    this.emit('messageBroadcast', { from, channel, type });
  }

  /**
   * Initiate a task handoff between agents
   */
  async handoffTask(from: AgentId, to: AgentId, task: Task, context: Record<string, unknown>, reason: string): Promise<string> {
    this.validateAgent(from);
    this.validateAgent(to);

    const taskContext: TaskContext = {
      task,
      context,
      // TODO: Integrate with Memento MCP for memory snapshot
      // memento: await this.getMementoSnapshot(from),
      files: [], // TODO: Integrate with file tracking
      dependencies: []
    };

    const handoffId = await this.broker.initiateHandoff({
      from,
      to,
      task: taskContext,
      reason
    });

    // Track the handoff
    const handoff: TaskHandoff = {
      id: handoffId,
      from,
      to,
      task: taskContext,
      reason,
      timestamp: Date.now(),
      status: 'pending',
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    this.activeHandoffs.set(handoffId, handoff);

    this.emit('handoffInitiated', { handoffId, from, to, taskId: task.id });
    return handoffId;
  }

  /**
   * Respond to a task handoff
   */
  async respondToHandoff(handoffId: string, agentId: AgentId, accepted: boolean, reason?: string): Promise<void> {
    const handoff = this.activeHandoffs.get(handoffId);
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`);
    }

    if (handoff.to !== agentId) {
      throw new Error(`Agent ${agentId} is not the target of handoff ${handoffId}`);
    }

    const status = accepted ? 'accepted' : 'rejected';
    
    await this.broker.respondToHandoff({
      handoffId,
      from: handoff.from,
      to: agentId,
      status,
      reason
    });

    // Update handoff status
    handoff.status = status;
    
    if (accepted) {
      // TODO: Transfer task ownership
      // await this.transferTaskOwnership(handoff);
      console.log(`Task handoff accepted: ${handoffId}`);
    } else {
      console.log(`Task handoff rejected: ${handoffId} - ${reason}`);
    }

    this.emit('handoffResponse', { handoffId, agentId, accepted, reason });
  }

  /**
   * Get communication statistics
   */
  async getStatistics(): Promise<{
    activeAgents: number;
    activeHandoffs: number;
    messageHistory: { agentId: string; messageCount: number }[];
    systemHealth: any;
  }> {
    const activeAgents = Array.from(this.registeredAgents.values())
      .filter(agent => agent.status === 'active').length;

    const messageHistory = await Promise.all(
      Array.from(this.registeredAgents.keys()).map(async (agentId) => {
        const messages = await this.broker.getMessageHistory(agentId, 10);
        return { agentId, messageCount: messages.length };
      })
    );

    const systemHealth = await this.broker.healthCheck();

    return {
      activeAgents,
      activeHandoffs: this.activeHandoffs.size,
      messageHistory,
      systemHealth
    };
  }

  /**
   * Subscribe to message events for an agent
   */
  subscribeToMessages(agentId: AgentId, handler: (message: AgentMessage) => void): void {
    this.validateAgent(agentId);
    
    // Set up message handler
    this.broker.receiveMessage((message) => {
      if (message.to === agentId) {
        handler(message);
        this.updateAgentActivity(agentId);
      }
    });
  }

  /**
   * Subscribe to a broadcast channel
   */
  subscribeToChannel(agentId: AgentId, channel: string, handler: (message: BroadcastMessage) => void): void {
    this.validateAgent(agentId);
    
    this.broker.subscribeToChannel(channel, (message) => {
      // Don't send broadcasts back to the sender
      if (message.from !== agentId) {
        handler(message);
        this.updateAgentActivity(agentId);
      }
    });
  }

  /**
   * Get message history for an agent
   */
  async getMessageHistory(agentId: AgentId, limit?: number): Promise<AgentMessage[]> {
    this.validateAgent(agentId);
    return await this.broker.getMessageHistory(agentId, limit);
  }

  /**
   * Get handoff history for an agent
   */
  async getHandoffHistory(agentId: AgentId, limit?: number): Promise<TaskHandoff[]> {
    this.validateAgent(agentId);
    return await this.broker.getHandoffHistory(agentId, limit);
  }

  /**
   * Publish an event for an agent
   */
  async publishEvent(agentId: AgentId, type: 'spawned' | 'terminated' | 'status_change' | 'error' | 'warning' | 'info', data: Record<string, unknown>): Promise<void> {
    this.validateAgent(agentId);
    
    await this.broker.publishEvent({
      agentId,
      type,
      data,
      source: 'agent-communication-manager'
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Clean up expired handoffs every 5 minutes
    setInterval(() => {
      this.cleanupExpiredHandoffs();
    }, 5 * 60 * 1000);

    // Clean up inactive agents every 10 minutes
    setInterval(() => {
      this.cleanupInactiveAgents();
    }, 10 * 60 * 1000);
  }

  /**
   * Subscribe to system-wide broadcast channels
   */
  private subscribeToSystemChannels(): void {
    // Subscribe to system alerts
    this.broker.subscribeToChannel('system', (message) => {
      console.log(`System broadcast: ${message.content}`);
      this.emit('systemBroadcast', message);
    });

    // Subscribe to agent status updates
    this.broker.subscribeToChannel('agent-status', (message) => {
      console.log(`Agent status broadcast: ${message.content}`);
      this.emit('agentStatusBroadcast', message);
    });
  }

  /**
   * Handle incoming agent events
   */
  private handleAgentEvent(event: AgentEvent): void {
    console.log(`Agent event: ${event.type} from ${event.agentId}`);
    
    // Update agent activity
    this.updateAgentActivity(event.agentId);
    
    // Handle specific event types
    switch (event.type) {
      case 'spawned':
        this.emit('agentSpawned', event);
        break;
      case 'terminated':
        this.emit('agentTerminated', event);
        break;
      case 'error':
        this.emit('agentError', event);
        break;
      default:
        this.emit('agentEvent', event);
    }
  }

  /**
   * Handle incoming task handoffs
   */
  private handleIncomingHandoff(agentId: AgentId, handoff: TaskHandoff): void {
    console.log(`Handoff received for agent ${agentId}: ${handoff.id}`);
    
    // Store the handoff
    this.activeHandoffs.set(handoff.id, handoff);
    
    // Emit event for the receiving agent
    this.emit('handoffReceived', { agentId, handoff });
  }

  /**
   * Validate that an agent is registered and active
   */
  private validateAgent(agentId: AgentId): void {
    const agent = this.registeredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} is not registered`);
    }
    if (agent.status !== 'active') {
      throw new Error(`Agent ${agentId} is not active`);
    }
  }

  /**
   * Update agent activity timestamp
   */
  private updateAgentActivity(agentId: AgentId): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.lastSeen = Date.now();
    }
  }

  /**
   * Clean up expired handoffs
   */
  private cleanupExpiredHandoffs(): void {
    const now = Date.now();
    const expiredHandoffs: string[] = [];

    for (const [id, handoff] of this.activeHandoffs) {
      if (handoff.expiresAt < now && handoff.status === 'pending') {
        expiredHandoffs.push(id);
      }
    }

    expiredHandoffs.forEach(id => {
      const handoff = this.activeHandoffs.get(id);
      if (handoff) {
        console.log(`Handoff expired: ${id}`);
        this.activeHandoffs.delete(id);
        this.emit('handoffExpired', { handoffId: id, handoff });
      }
    });
  }

  /**
   * Clean up handoffs for a specific agent
   */
  private async cleanupAgentHandoffs(agentId: AgentId): Promise<void> {
    const agentHandoffs: string[] = [];

    for (const [id, handoff] of this.activeHandoffs) {
      if (handoff.from === agentId || handoff.to === agentId) {
        agentHandoffs.push(id);
      }
    }

    agentHandoffs.forEach(id => {
      this.activeHandoffs.delete(id);
    });

    console.log(`Cleaned up ${agentHandoffs.length} handoffs for agent ${agentId}`);
  }

  /**
   * Clean up inactive agents
   */
  private cleanupInactiveAgents(): void {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    const inactiveAgents: AgentId[] = [];

    for (const [agentId, agent] of this.registeredAgents) {
      if (agent.status === 'active' && (now - agent.lastSeen) > inactiveThreshold) {
        agent.status = 'inactive';
        inactiveAgents.push(agentId);
      }
    }

    inactiveAgents.forEach(agentId => {
      console.log(`Agent marked as inactive: ${agentId}`);
      this.emit('agentInactive', agentId);
    });
  }
}