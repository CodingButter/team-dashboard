/**
 * WebSocket Message Type Guards
 * Type guard functions for runtime type checking of messages
 */

import { WSMessage } from './base';
import {
  AuthMessage,
  AgentCommandMessage
} from './client-messages';
import {
  AgentOutputMessage,
  MetricsUpdateMessage
} from './server-messages';

// ============================================================================
// Type Guards
// ============================================================================

export function isAuthMessage(msg: WSMessage): msg is AuthMessage {
  return msg.type === 'auth';
}

export function isAgentCommandMessage(msg: WSMessage): msg is AgentCommandMessage {
  return msg.type === 'agent:command';
}

export function isAgentOutputMessage(msg: WSMessage): msg is AgentOutputMessage {
  return msg.type === 'agent:output';
}

export function isMetricsUpdateMessage(msg: WSMessage): msg is MetricsUpdateMessage {
  return msg.type === 'metrics:update';
}