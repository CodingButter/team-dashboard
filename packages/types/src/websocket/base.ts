/**
 * WebSocket Base Message Types
 * Core message structure and types for WebSocket communication
 */

import { AgentModel, AgentStatus } from '../api/common';

// ============================================================================
// Base Message Structure
// ============================================================================

export interface WSMessage<T = any> {
  id: string;           // Unique message ID (UUID v4)
  type: MessageType;    // Message type identifier
  timestamp: number;    // Unix timestamp in milliseconds
  payload: T;          // Type-specific payload
  metadata?: {
    correlationId?: string;  // For request/response correlation
    agentId?: string;       // Associated agent ID
    priority?: 'low' | 'normal' | 'high';
  };
}

export type MessageType = 
  // Client to Server
  | 'auth'
  | 'agent:create'
  | 'agent:command'
  | 'agent:terminate'
  | 'agent:pause'
  | 'agent:resume'
  | 'subscribe:agent'
  | 'subscribe:metrics'
  | 'subscribe:logs'
  | 'unsubscribe'
  // Workflow Messages
  | 'workflow:create'
  | 'workflow:assign'
  | 'workflow:start'
  | 'workflow:complete'
  | 'workflow:status'
  | 'workflow:list'
  | 'workflow:agent:tasks'
  // Server to Client
  | 'agent:status'
  | 'agent:output'
  | 'agent:created'
  | 'agent:error'
  | 'metrics:update'
  | 'system:alert'
  | 'workflow:created'
  | 'workflow:assigned'
  | 'workflow:started'
  | 'workflow:completed'
  | 'workflow:event'
  | 'workflow:error'
  | 'task:begin'
  | 'task:handoff'
  | 'ack'
  | 'ping'
  | 'pong';

// Export types for reuse
export type { AgentModel, AgentStatus };