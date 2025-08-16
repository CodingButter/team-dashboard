/**
 * WebSocket Message Factory
 * Factory functions for creating WebSocket messages
 */

import {
  AuthMessage,
  AgentCommandMessage,
  SubscribeMessage
} from './client-messages';
import {
  HeartbeatMessage
} from './server-messages';

// ============================================================================
// Message Factory
// ============================================================================

export class MessageFactory {
  static createAuth(token: string, clientId: string): AuthMessage {
    return {
      id: generateMessageId(),
      type: 'auth',
      timestamp: Date.now(),
      payload: { token, clientId }
    };
  }
  
  static createAgentCommand(agentId: string, command: string): AgentCommandMessage {
    return {
      id: generateMessageId(),
      type: 'agent:command',
      timestamp: Date.now(),
      payload: { agentId, command }
    };
  }
  
  static createSubscribe(type: 'agent' | 'metrics' | 'logs', agentId?: string): SubscribeMessage {
    return {
      id: generateMessageId(),
      type: `subscribe:${type}` as any,
      timestamp: Date.now(),
      payload: { agentId }
    };
  }
  
  static createHeartbeat(): HeartbeatMessage {
    return {
      id: generateMessageId(),
      type: 'ping',
      timestamp: Date.now(),
      payload: { timestamp: Date.now() }
    };
  }
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}