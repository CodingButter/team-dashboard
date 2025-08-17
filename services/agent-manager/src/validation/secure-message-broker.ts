/**
 * Secure Message Broker with Payment-Grade Validation
 * 
 * CRITICAL SECURITY WRAPPER: This class wraps the MessageBroker with comprehensive
 * validation to prevent injection attacks, data corruption, and system failures.
 * 
 * @author David Chen (Stripe & Subscription Expert) + Maya Rodriguez (Data Expert)
 * @priority P0 - EMERGENCY SECURITY FIX
 */

import { MessageBroker } from '../communication/message-broker';
import { 
  messageValidator, 
  validateMessageOrThrow,
  ExtendedValidationResult
} from './message-validator';
import { ValidationError } from '@team-dashboard/utils';
import {
  AgentMessage,
  BroadcastMessage,
  TaskHandoff,
  TaskHandoffResponse,
  AgentEvent,
  AgentCommunication,
  CommunicationConfig,
  AgentId,
  ChannelId
} from '@team-dashboard/types';

// ============================================================================
// SECURITY MONITORING AND ALERTS
// ============================================================================

export interface SecurityViolation {
  timestamp: number;
  violationType: 'VALIDATION_FAILURE' | 'SUSPICIOUS_CONTENT' | 'RATE_LIMIT_EXCEEDED' | 'INJECTION_ATTEMPT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agentId?: string;
  details: {
    originalData?: unknown;
    errors: string[];
    securityFlags: string[];
    ipAddress?: string;
    sessionId?: string;
  };
}

export interface SecurityMetrics {
  totalMessages: number;
  validatedMessages: number;
  blockedMessages: number;
  securityViolations: SecurityViolation[];
  lastViolation?: number;
  riskScore: number; // 0-100, higher = more dangerous
}

// ============================================================================
// SECURE MESSAGE BROKER CLASS
// ============================================================================

export class SecureMessageBroker implements AgentCommunication {
  private broker: MessageBroker;
  private securityMetrics: SecurityMetrics;
  private blockedAgents: Set<AgentId> = new Set();
  private quarantinedMessages: Map<string, unknown> = new Map();

  constructor(config: CommunicationConfig) {
    this.broker = new MessageBroker(config);
    this.securityMetrics = {
      totalMessages: 0,
      validatedMessages: 0,
      blockedMessages: 0,
      securityViolations: [],
      riskScore: 0
    };
  }

  // ============================================================================
  // CONNECTION MANAGEMENT (DELEGATED)
  // ============================================================================

  async connect(): Promise<void> {
    await this.broker.connect();
    console.log('🔒 Secure Message Broker: Validation layer active');
  }

  async disconnect(): Promise<void> {
    await this.broker.disconnect();
    this.logSecuritySummary();
  }

  isConnected(): boolean {
    return this.broker.isConnected();
  }

  // ============================================================================
  // SECURE DIRECT MESSAGING
  // ============================================================================

  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    this.securityMetrics.totalMessages++;

    try {
      // Pre-validation security checks
      if (this.isAgentBlocked(message.from)) {
        const error = new Error('Agent is blocked due to security violations');
        (error as any).field = 'from';
        (error as any).code = 'AGENT_BLOCKED';
        throw error;
      }

      // Create temporary message for validation
      const tempMessage = {
        ...message,
        id: 'temp-validation-id',
        timestamp: Date.now()
      };

      // Validate the message with payment-grade security
      const validatedMessage = validateMessageOrThrow(
        tempMessage,
        (data) => messageValidator.validateAgentMessage(data),
        'AgentMessage'
      );

      // Additional security validation for message content
      this.validateMessageContent(validatedMessage);

      // Remove the temporary ID before sending to broker
      const { id, timestamp, ...messageToSend } = validatedMessage;
      
      // Message passed all validations - send through broker
      await this.broker.sendMessage(messageToSend);
      
      this.securityMetrics.validatedMessages++;
      console.log(`✅ Secure message validated and sent: ${message.from} -> ${message.to}`);
      
    } catch (error) {
      this.handleValidationFailure(error, message, 'sendMessage');
      throw error;
    }
  }

  receiveMessage(handler: (message: AgentMessage) => void): void {
    // Wrap the handler with validation
    const secureHandler = (message: AgentMessage) => {
      try {
        // Validate incoming message
        const validation = messageValidator.validateAgentMessage(message);
        
        if (!validation.success) {
          this.handleValidationFailure(
            new ValidationError('incoming', message, 'Incoming message failed validation', 'high'),
            message,
            'receiveMessage'
          );
          return;
        }

        // Log security warnings if any
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ Message warnings for ${message.id}:`, validation.warnings);
        }

        // Call the original handler with validated message
        handler(validation.data!);
        
      } catch (error) {
        console.error('🚨 Secure message handler error:', error);
        this.recordSecurityViolation('VALIDATION_FAILURE', 'high', message.from, {
          originalData: message,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          securityFlags: []
        });
      }
    };

    this.broker.receiveMessage(secureHandler);
  }

  // ============================================================================
  // SECURE BROADCASTING
  // ============================================================================

  async broadcast(message: Omit<BroadcastMessage, 'id' | 'timestamp'>): Promise<void> {
    this.securityMetrics.totalMessages++;

    try {
      // Security checks
      if (this.isAgentBlocked(message.from)) {
        throw new ValidationError('from', message.from, 'Agent is blocked due to security violations', 'critical');
      }

      // Create temporary message for validation
      const tempMessage = {
        ...message,
        id: 'temp-validation-id',
        timestamp: Date.now()
      };

      // Validate the broadcast message
      const validatedMessage = validateMessageOrThrow(
        tempMessage,
        (data) => messageValidator.validateBroadcastMessage(data),
        'BroadcastMessage'
      );

      // Additional security validation
      this.validateBroadcastContent(validatedMessage);

      // Remove the temporary fields before sending
      const { id, timestamp, ...messageToSend } = validatedMessage;
      
      await this.broker.broadcast(messageToSend);
      
      this.securityMetrics.validatedMessages++;
      console.log(`✅ Secure broadcast validated and sent: ${message.from} -> ${message.channel}`);
      
    } catch (error) {
      this.handleValidationFailure(error, message, 'broadcast');
      throw error;
    }
  }

  subscribeToChannel(channel: ChannelId, handler: (message: BroadcastMessage) => void): void {
    // Wrap the handler with validation
    const secureHandler = (message: BroadcastMessage) => {
      try {
        const validation = messageValidator.validateBroadcastMessage(message);
        
        if (!validation.success) {
          this.handleValidationFailure(
            new ValidationError('incoming', message, 'Incoming broadcast failed validation', 'high'),
            message,
            'subscribeToChannel'
          );
          return;
        }

        handler(validation.data!);
        
      } catch (error) {
        console.error('🚨 Secure broadcast handler error:', error);
      }
    };

    this.broker.subscribeToChannel(channel, secureHandler);
  }

  unsubscribeFromChannel(channel: ChannelId): void {
    this.broker.unsubscribeFromChannel(channel);
  }

  // ============================================================================
  // SECURE TASK HANDOFF
  // ============================================================================

  async initiateHandoff(handoff: Omit<TaskHandoff, 'id' | 'timestamp' | 'status' | 'expiresAt'>): Promise<string> {
    this.securityMetrics.totalMessages++;

    try {
      // Security checks
      if (this.isAgentBlocked(handoff.from)) {
        throw new ValidationError('from', handoff.from, 'Agent is blocked due to security violations', 'critical');
      }

      // Create temporary handoff for validation
      const tempHandoff = {
        ...handoff,
        id: 'temp-validation-id',
        timestamp: Date.now(),
        status: 'pending' as const,
        expiresAt: Date.now() + (30 * 60 * 1000)
      };

      // Validate the handoff
      const validatedHandoff = validateMessageOrThrow(
        tempHandoff,
        (data) => messageValidator.validateTaskHandoff(data),
        'TaskHandoff'
      );

      // Additional security validation for task content
      this.validateTaskHandoffContent(validatedHandoff);

      // Remove temporary fields and send
      const { id, timestamp, status, expiresAt, ...handoffToSend } = validatedHandoff;
      
      const handoffId = await this.broker.initiateHandoff(handoffToSend);
      
      this.securityMetrics.validatedMessages++;
      console.log(`✅ Secure handoff validated and initiated: ${handoff.from} -> ${handoff.to}`);
      
      return handoffId;
      
    } catch (error) {
      this.handleValidationFailure(error, handoff, 'initiateHandoff');
      throw error;
    }
  }

  async respondToHandoff(response: Omit<TaskHandoffResponse, 'timestamp'>): Promise<void> {
    try {
      // Security checks
      if (this.isAgentBlocked(response.from)) {
        throw new ValidationError('from', response.from, 'Agent is blocked due to security violations', 'critical');
      }

      // Create temporary response for validation
      const tempResponse = {
        ...response,
        timestamp: Date.now()
      };

      // Validate the response
      const validatedResponse = validateMessageOrThrow(
        tempResponse,
        (data) => messageValidator.validateTaskHandoffResponse(data),
        'TaskHandoffResponse'
      );

      // Remove temporary timestamp and send
      const { timestamp, ...responseToSend } = validatedResponse;
      
      await this.broker.respondToHandoff(responseToSend);
      
      console.log(`✅ Secure handoff response validated: ${response.handoffId}`);
      
    } catch (error) {
      this.handleValidationFailure(error, response, 'respondToHandoff');
      throw error;
    }
  }

  subscribeToHandoffs(agentId: AgentId, handler: (handoff: TaskHandoff) => void): void {
    // Wrap the handler with validation
    const secureHandler = (handoff: TaskHandoff) => {
      try {
        const validation = messageValidator.validateTaskHandoff(handoff);
        
        if (!validation.success) {
          this.handleValidationFailure(
            new ValidationError('incoming', handoff, 'Incoming handoff failed validation', 'high'),
            handoff,
            'subscribeToHandoffs'
          );
          return;
        }

        handler(validation.data!);
        
      } catch (error) {
        console.error('🚨 Secure handoff handler error:', error);
      }
    };

    this.broker.subscribeToHandoffs(agentId, secureHandler);
  }

  // ============================================================================
  // SECURE EVENT HANDLING
  // ============================================================================

  async publishEvent(event: Omit<AgentEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Security checks
      if (this.isAgentBlocked(event.agentId)) {
        throw new ValidationError('agentId', event.agentId, 'Agent is blocked due to security violations', 'critical');
      }

      // Create temporary event for validation
      const tempEvent = {
        ...event,
        id: 'temp-validation-id',
        timestamp: Date.now()
      };

      // Validate the event
      const validatedEvent = validateMessageOrThrow(
        tempEvent,
        (data) => messageValidator.validateAgentEvent(data),
        'AgentEvent'
      );

      // Remove temporary fields and send
      const { id, timestamp, ...eventToSend } = validatedEvent;
      
      await this.broker.publishEvent(eventToSend);
      
      console.log(`✅ Secure event validated and published: ${event.type} from ${event.agentId}`);
      
    } catch (error) {
      this.handleValidationFailure(error, event, 'publishEvent');
      throw error;
    }
  }

  subscribeToEvents(handler: (event: AgentEvent) => void): void {
    // Wrap the handler with validation
    const secureHandler = (event: AgentEvent) => {
      try {
        const validation = messageValidator.validateAgentEvent(event);
        
        if (!validation.success) {
          this.handleValidationFailure(
            new ValidationError('incoming', event, 'Incoming event failed validation', 'high'),
            event,
            'subscribeToEvents'
          );
          return;
        }

        handler(validation.data!);
        
      } catch (error) {
        console.error('🚨 Secure event handler error:', error);
      }
    };

    this.broker.subscribeToEvents(secureHandler);
  }

  // ============================================================================
  // MESSAGE HISTORY (DELEGATED WITH VALIDATION)
  // ============================================================================

  async getMessageHistory(agentId: AgentId, limit?: number): Promise<AgentMessage[]> {
    // Validate agentId first
    if (!agentId || typeof agentId !== 'string' || agentId.length === 0) {
      throw new ValidationError('agentId', agentId, 'Invalid agent ID for message history', 'medium');
    }

    const messages = await this.broker.getMessageHistory(agentId, limit);
    
    // Validate each message in the history
    return messages.filter(message => {
      const validation = messageValidator.validateAgentMessage(message);
      if (!validation.success) {
        console.warn(`⚠️ Invalid message in history for ${agentId}:`, validation.errors);
        return false;
      }
      return true;
    });
  }

  async getHandoffHistory(agentId: AgentId, limit?: number): Promise<TaskHandoff[]> {
    // Validate agentId first
    if (!agentId || typeof agentId !== 'string' || agentId.length === 0) {
      throw new ValidationError('agentId', agentId, 'Invalid agent ID for handoff history', 'medium');
    }

    const handoffs = await this.broker.getHandoffHistory(agentId, limit);
    
    // Validate each handoff in the history
    return handoffs.filter(handoff => {
      const validation = messageValidator.validateTaskHandoff(handoff);
      if (!validation.success) {
        console.warn(`⚠️ Invalid handoff in history for ${agentId}:`, validation.errors);
        return false;
      }
      return true;
    });
  }

  // ============================================================================
  // SECURITY MONITORING AND MANAGEMENT
  // ============================================================================

  /**
   * Get current security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return messageValidator.getValidationStats();
  }

  /**
   * Block an agent due to security violations
   */
  blockAgent(agentId: AgentId, reason: string): void {
    this.blockedAgents.add(agentId);
    this.recordSecurityViolation('VALIDATION_FAILURE', 'critical', agentId, {
      errors: [`Agent blocked: ${reason}`],
      securityFlags: ['AGENT_BLOCKED']
    });
    
    console.error(`🚨 AGENT BLOCKED: ${agentId} - ${reason}`);
  }

  /**
   * Unblock an agent
   */
  unblockAgent(agentId: AgentId): void {
    this.blockedAgents.delete(agentId);
    console.log(`🔓 Agent unblocked: ${agentId}`);
  }

  /**
   * Check if agent is blocked
   */
  isAgentBlocked(agentId: AgentId): boolean {
    return this.blockedAgents.has(agentId);
  }

  /**
   * Health check with security status
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    const brokerHealth = await this.broker.healthCheck();
    
    return {
      status: brokerHealth.status,
      details: {
        ...brokerHealth.details,
        security: {
          validationStats: this.getValidationStats(),
          securityMetrics: this.securityMetrics,
          blockedAgents: Array.from(this.blockedAgents),
          quarantinedMessages: this.quarantinedMessages.size
        }
      }
    };
  }

  // ============================================================================
  // PRIVATE SECURITY METHODS
  // ============================================================================

  private validateMessageContent(message: AgentMessage): void {
    // Additional business logic validation can go here
    if (message.content.length === 0) {
      throw new ValidationError('content', message.content, 'Message content cannot be empty', 'medium');
    }
  }

  private validateBroadcastContent(message: BroadcastMessage): void {
    // Additional business logic validation for broadcasts
    if (message.type === 'alert' && !message.content.includes('ALERT:')) {
      console.warn(`⚠️ Alert broadcast without ALERT: prefix: ${message.id}`);
    }
  }

  private validateTaskHandoffContent(handoff: TaskHandoff): void {
    // Additional business logic validation for handoffs
    if (handoff.task.task.status !== 'pending') {
      throw new ValidationError('task.status', handoff.task.task.status, 'Only pending tasks can be handed off', 'medium');
    }
  }

  private handleValidationFailure(error: any, data: unknown, operation: string): void {
    this.securityMetrics.blockedMessages++;
    
    const violationType = error instanceof ValidationError ? 'VALIDATION_FAILURE' : 'INJECTION_ATTEMPT';
    const severity = error instanceof ValidationError ? error.securityLevel : 'critical';
    
    this.recordSecurityViolation(violationType, severity, undefined, {
      originalData: data,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      securityFlags: []
    });

    // Quarantine the message for analysis
    const quarantineId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.quarantinedMessages.set(quarantineId, {
      timestamp: Date.now(),
      operation,
      data,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    console.error(`🚨 SECURITY VIOLATION in ${operation}:`, error);
  }

  private recordSecurityViolation(
    violationType: SecurityViolation['violationType'],
    severity: SecurityViolation['severity'],
    agentId?: string,
    details?: Partial<SecurityViolation['details']>
  ): void {
    const violation: SecurityViolation = {
      timestamp: Date.now(),
      violationType,
      severity,
      agentId,
      details: {
        errors: [],
        securityFlags: [],
        ...details
      }
    };

    this.securityMetrics.securityViolations.push(violation);
    this.securityMetrics.lastViolation = violation.timestamp;
    
    // Update risk score
    this.updateRiskScore(severity);

    // Auto-block agents with too many violations
    if (agentId && this.getAgentViolationCount(agentId) >= 5) {
      this.blockAgent(agentId, `Too many security violations (${this.getAgentViolationCount(agentId)})`);
    }
  }

  private updateRiskScore(severity: SecurityViolation['severity']): void {
    const severityScores = { low: 1, medium: 5, high: 15, critical: 25 };
    this.securityMetrics.riskScore = Math.min(100, this.securityMetrics.riskScore + severityScores[severity]);
    
    // Decay risk score over time
    const now = Date.now();
    if (this.securityMetrics.lastViolation && now - this.securityMetrics.lastViolation > 3600000) { // 1 hour
      this.securityMetrics.riskScore = Math.max(0, this.securityMetrics.riskScore - 1);
    }
  }

  private getAgentViolationCount(agentId: string): number {
    return this.securityMetrics.securityViolations.filter(v => v.agentId === agentId).length;
  }

  private logSecuritySummary(): void {
    console.log('\n🔒 SECURITY SUMMARY:');
    console.log(`Total Messages: ${this.securityMetrics.totalMessages}`);
    console.log(`Validated: ${this.securityMetrics.validatedMessages}`);
    console.log(`Blocked: ${this.securityMetrics.blockedMessages}`);
    console.log(`Security Violations: ${this.securityMetrics.securityViolations.length}`);
    console.log(`Risk Score: ${this.securityMetrics.riskScore}/100`);
    console.log(`Blocked Agents: ${this.blockedAgents.size}`);
    console.log(`Quarantined Messages: ${this.quarantinedMessages.size}\n`);
  }
}