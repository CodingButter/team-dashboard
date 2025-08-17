/**
 * Inter-Agent Message Broker
 * Handles message routing, broadcasting, and task handoff between agents
 */

import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from './redis-client';
import {
  AgentCommunication,
  AgentMessage,
  BroadcastMessage,
  TaskHandoff,
  TaskHandoffResponse,
  AgentEvent,
  CommunicationConfig,
  CommunicationAuditLog,
  AgentId,
  ChannelId
} from '@team-dashboard/types';

export class MessageBroker implements AgentCommunication {
  private redis: RedisClient;
  private config: CommunicationConfig;
  private messageHandlers: Map<string, (message: AgentMessage) => void> = new Map();
  private channelHandlers: Map<ChannelId, (message: BroadcastMessage) => void> = new Map();
  private handoffHandlers: Map<AgentId, (handoff: TaskHandoff) => void> = new Map();
  private eventHandlers: Set<(event: AgentEvent) => void> = new Set();
  private rateLimiters: Map<AgentId, { messages: number[]; broadcasts: number[]; handoffs: number[] }> = new Map();

  constructor(config: CommunicationConfig) {
    this.config = config;
    this.redis = new RedisClient(config.redis);
  }

  /**
   * Connect to the message broker
   */
  async connect(): Promise<void> {
    await this.redis.connect();
    await this.setupChannelSubscriptions();
    console.log('Message broker connected successfully');
  }

  /**
   * Disconnect from the message broker
   */
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    this.messageHandlers.clear();
    this.channelHandlers.clear();
    this.handoffHandlers.clear();
    this.eventHandlers.clear();
    console.log('Message broker disconnected');
  }

  /**
   * Check if broker is connected
   */
  isConnected(): boolean {
    return this.redis.isConnected();
  }

  // ============================================================================
  // Direct Messaging
  // ============================================================================

  /**
   * Send a direct message to another agent
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    // Rate limiting check
    if (!this.checkRateLimit(message.from, 'messages')) {
      throw new Error('Rate limit exceeded for messages');
    }

    const fullMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // Store message in history
    await this.storeMessageHistory(fullMessage);

    // Publish to direct message channel
    const channel = `${this.config.channels.direct}:${message.to}`;
    await this.redis.publish(channel, JSON.stringify(fullMessage));

    // Log the communication
    await this.auditLog({
      id: uuidv4(),
      timestamp: fullMessage.timestamp,
      type: 'message',
      participants: [message.from, message.to],
      action: 'message_sent',
      data: { messageId: fullMessage.id, type: message.type }
    });

    console.log(`Message sent from ${message.from} to ${message.to}: ${fullMessage.id}`);
  }

  /**
   * Set up message handler for an agent
   */
  receiveMessage(handler: (message: AgentMessage) => void): void {
    // This will be called during channel subscription setup
    this.messageHandlers.set('default', handler);
  }

  // ============================================================================
  // Broadcasting
  // ============================================================================

  /**
   * Broadcast a message to a channel
   */
  async broadcast(message: Omit<BroadcastMessage, 'id' | 'timestamp'>): Promise<void> {
    // Rate limiting check
    if (!this.checkRateLimit(message.from, 'broadcasts')) {
      throw new Error('Rate limit exceeded for broadcasts');
    }

    const fullMessage: BroadcastMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // Store broadcast in history
    await this.storeBroadcastHistory(fullMessage);

    // Publish to broadcast channel
    const channel = `${this.config.channels.broadcast}:${message.channel}`;
    await this.redis.publish(channel, JSON.stringify(fullMessage));

    // Log the communication
    await this.auditLog({
      id: uuidv4(),
      timestamp: fullMessage.timestamp,
      type: 'broadcast',
      participants: [message.from],
      action: 'broadcast_sent',
      data: { messageId: fullMessage.id, channel: message.channel, type: message.type }
    });

    console.log(`Broadcast sent from ${message.from} to channel ${message.channel}: ${fullMessage.id}`);
  }

  /**
   * Subscribe to a broadcast channel
   */
  subscribeToChannel(channel: ChannelId, handler: (message: BroadcastMessage) => void): void {
    this.channelHandlers.set(channel, handler);
    
    // Subscribe to Redis channel
    const redisChannel = `${this.config.channels.broadcast}:${channel}`;
    this.redis.subscribe(redisChannel, (data) => {
      try {
        const message: BroadcastMessage = JSON.parse(data);
        handler(message);
      } catch (error) {
        console.error('Error parsing broadcast message:', error);
      }
    });
  }

  /**
   * Unsubscribe from a broadcast channel
   */
  unsubscribeFromChannel(channel: ChannelId): void {
    this.channelHandlers.delete(channel);
    const redisChannel = `${this.config.channels.broadcast}:${channel}`;
    this.redis.unsubscribe(redisChannel);
  }

  // ============================================================================
  // Task Handoff
  // ============================================================================

  /**
   * Initiate a task handoff to another agent
   */
  async initiateHandoff(handoff: Omit<TaskHandoff, 'id' | 'timestamp' | 'status' | 'expiresAt'>): Promise<string> {
    // Rate limiting check
    if (!this.checkRateLimit(handoff.from, 'handoffs')) {
      throw new Error('Rate limit exceeded for handoffs');
    }

    const fullHandoff: TaskHandoff = {
      ...handoff,
      id: uuidv4(),
      timestamp: Date.now(),
      status: 'pending',
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiration
    };

    // Store handoff request
    await this.storeHandoffHistory(fullHandoff);

    // Publish to handoff channel
    const channel = `${this.config.channels.handoff}:${handoff.to}`;
    await this.redis.publish(channel, JSON.stringify(fullHandoff));

    // Log the handoff
    await this.auditLog({
      id: uuidv4(),
      timestamp: fullHandoff.timestamp,
      type: 'handoff',
      participants: [handoff.from, handoff.to],
      action: 'handoff_initiated',
      data: { handoffId: fullHandoff.id, taskId: handoff.task.task.id }
    });

    console.log(`Task handoff initiated from ${handoff.from} to ${handoff.to}: ${fullHandoff.id}`);
    return fullHandoff.id;
  }

  /**
   * Respond to a task handoff request
   */
  async respondToHandoff(response: Omit<TaskHandoffResponse, 'timestamp'>): Promise<void> {
    const fullResponse: TaskHandoffResponse = {
      ...response,
      timestamp: Date.now()
    };

    // Update handoff status
    const handoffKey = `handoff:${response.handoffId}`;
    const handoffData = await this.redis.get(handoffKey);
    
    if (handoffData) {
      const handoff: TaskHandoff = JSON.parse(handoffData);
      handoff.status = response.status;
      
      // Store updated handoff
      await this.redis.setex(
        handoffKey,
        this.config.messageRetention.handoff / 1000,
        JSON.stringify(handoff)
      );
    }

    // Publish response to the initiating agent
    const channel = `${this.config.channels.handoff}:${response.from}`;
    await this.redis.publish(channel, JSON.stringify(fullResponse));

    // Log the response
    await this.auditLog({
      id: uuidv4(),
      timestamp: fullResponse.timestamp,
      type: 'handoff',
      participants: [response.from, response.to],
      action: 'handoff_responded',
      data: { handoffId: response.handoffId, status: response.status }
    });

    console.log(`Handoff response sent: ${response.handoffId} - ${response.status}`);
  }

  /**
   * Subscribe to handoff requests for an agent
   */
  subscribeToHandoffs(agentId: AgentId, handler: (handoff: TaskHandoff) => void): void {
    this.handoffHandlers.set(agentId, handler);
    
    // Subscribe to Redis channel
    const redisChannel = `${this.config.channels.handoff}:${agentId}`;
    this.redis.subscribe(redisChannel, (data) => {
      try {
        const message = JSON.parse(data);
        
        // Check if it's a handoff request or response
        if ('task' in message) {
          // It's a handoff request
          handler(message as TaskHandoff);
        } else {
          // It's a handoff response - handle separately if needed
          console.log('Handoff response received:', message);
        }
      } catch (error) {
        console.error('Error parsing handoff message:', error);
      }
    });
  }

  // ============================================================================
  // Event Publishing and Subscription
  // ============================================================================

  /**
   * Publish an agent event
   */
  async publishEvent(event: Omit<AgentEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AgentEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // Store event in history
    await this.storeEventHistory(fullEvent);

    // Publish to events channel
    const channel = this.config.channels.events;
    await this.redis.publish(channel, JSON.stringify(fullEvent));

    console.log(`Event published: ${fullEvent.type} from ${fullEvent.agentId}`);
  }

  /**
   * Subscribe to agent events
   */
  subscribeToEvents(handler: (event: AgentEvent) => void): void {
    this.eventHandlers.add(handler);
    
    // Subscribe to Redis channel
    this.redis.subscribe(this.config.channels.events, (data) => {
      try {
        const event: AgentEvent = JSON.parse(data);
        this.eventHandlers.forEach(h => h(event));
      } catch (error) {
        console.error('Error parsing event message:', error);
      }
    });
  }

  // ============================================================================
  // Message History and Queuing
  // ============================================================================

  /**
   * Get message history for an agent
   */
  async getMessageHistory(agentId: AgentId, limit: number = 50): Promise<AgentMessage[]> {
    const key = `messages:${agentId}`;
    const messages = await this.redis.lrange(key, 0, limit - 1);
    
    return messages.map(msg => {
      try {
        return JSON.parse(msg) as AgentMessage;
      } catch {
        return null;
      }
    }).filter(Boolean) as AgentMessage[];
  }

  /**
   * Get handoff history for an agent
   */
  async getHandoffHistory(agentId: AgentId, limit: number = 20): Promise<TaskHandoff[]> {
    const key = `handoffs:${agentId}`;
    const handoffs = await this.redis.lrange(key, 0, limit - 1);
    
    return handoffs.map(handoff => {
      try {
        return JSON.parse(handoff) as TaskHandoff;
      } catch {
        return null;
      }
    }).filter(Boolean) as TaskHandoff[];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Set up initial channel subscriptions
   */
  private async setupChannelSubscriptions(): Promise<void> {
    // This will be called when agents register their handlers
    console.log('Channel subscriptions ready');
  }

  /**
   * Check rate limits for an agent
   */
  private checkRateLimit(agentId: AgentId, type: 'messages' | 'broadcasts' | 'handoffs'): boolean {
    const now = Date.now();
    const windowSize = type === 'handoffs' ? 60 * 60 * 1000 : 60 * 1000; // 1 hour for handoffs, 1 minute for others
    
    if (!this.rateLimiters.has(agentId)) {
      this.rateLimiters.set(agentId, { messages: [], broadcasts: [], handoffs: [] });
    }
    
    const limits = this.rateLimiters.get(agentId)!;
    const timestamps = limits[type];
    
    // Remove old timestamps
    while (timestamps.length > 0 && now - timestamps[0] > windowSize) {
      timestamps.shift();
    }
    
    // Check limit
    const maxRequests = type === 'handoffs' 
      ? this.config.rateLimits.handoffsPerHour
      : type === 'messages' 
        ? this.config.rateLimits.messagesPerMinute
        : this.config.rateLimits.broadcastsPerMinute;
    
    if (timestamps.length >= maxRequests) {
      return false;
    }
    
    // Add current timestamp
    timestamps.push(now);
    return true;
  }

  /**
   * Store message in history
   */
  private async storeMessageHistory(message: AgentMessage): Promise<void> {
    const commands: Array<[string, ...any[]]> = [
      ['lpush', `messages:${message.from}`, JSON.stringify(message)],
      ['lpush', `messages:${message.to}`, JSON.stringify(message)],
      ['ltrim', `messages:${message.from}`, 0, 99], // Keep last 100 messages
      ['ltrim', `messages:${message.to}`, 0, 99]
    ];
    
    await this.redis.pipeline(commands);
  }

  /**
   * Store broadcast in history
   */
  private async storeBroadcastHistory(message: BroadcastMessage): Promise<void> {
    const key = `broadcasts:${message.channel}`;
    await this.redis.pipeline([
      ['lpush', key, JSON.stringify(message)],
      ['ltrim', key, 0, 49] // Keep last 50 broadcasts
    ]);
  }

  /**
   * Store handoff in history
   */
  private async storeHandoffHistory(handoff: TaskHandoff): Promise<void> {
    const commands: Array<[string, ...any[]]> = [
      ['setex', `handoff:${handoff.id}`, this.config.messageRetention.handoff / 1000, JSON.stringify(handoff)],
      ['lpush', `handoffs:${handoff.from}`, JSON.stringify(handoff)],
      ['lpush', `handoffs:${handoff.to}`, JSON.stringify(handoff)],
      ['ltrim', `handoffs:${handoff.from}`, 0, 19], // Keep last 20 handoffs
      ['ltrim', `handoffs:${handoff.to}`, 0, 19]
    ];
    
    await this.redis.pipeline(commands);
  }

  /**
   * Store event in history
   */
  private async storeEventHistory(event: AgentEvent): Promise<void> {
    const key = `events:${event.agentId}`;
    await this.redis.pipeline([
      ['lpush', key, JSON.stringify(event)],
      ['ltrim', key, 0, 99] // Keep last 100 events
    ]);
  }

  /**
   * Log communication for audit purposes
   */
  private async auditLog(log: CommunicationAuditLog): Promise<void> {
    const key = `audit:${log.timestamp}:${log.id}`;
    await this.redis.setex(
      key,
      30 * 24 * 60 * 60, // 30 days retention
      JSON.stringify(log)
    );
  }

  /**
   * Health check for the message broker
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const redisHealth = await this.redis.healthCheck();
      
      return {
        status: redisHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: {
          redis: redisHealth,
          activeHandlers: {
            messages: this.messageHandlers.size,
            channels: this.channelHandlers.size,
            handoffs: this.handoffHandlers.size,
            events: this.eventHandlers.size
          },
          rateLimiters: this.rateLimiters.size
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}