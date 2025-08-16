/**
 * Client to Server WebSocket Messages
 * Message types sent from client to server
 */

import { WSMessage, AgentModel } from './base';

// ============================================================================
// Client to Server Messages
// ============================================================================

export interface AuthMessage extends WSMessage {
  type: 'auth';
  payload: {
    token: string;
    clientId: string;
  };
}

export interface CreateAgentMessage extends WSMessage {
  type: 'agent:create';
  payload: {
    name: string;
    model: AgentModel;
    workspace: string;
    environment?: Record<string, string>;
    resourceLimits?: {
      memory: number;
      cpu: number;
    };
  };
}

export interface AgentCommandMessage extends WSMessage {
  type: 'agent:command';
  payload: {
    agentId: string;
    command: string;
    interactive?: boolean;
    timeout?: number;
  };
}

export interface TerminateAgentMessage extends WSMessage {
  type: 'agent:terminate';
  payload: {
    agentId: string;
    force?: boolean;
  };
}

export interface AgentControlMessage extends WSMessage {
  type: 'agent:pause' | 'agent:resume';
  payload: {
    agentId: string;
  };
}

export interface SubscribeMessage extends WSMessage {
  type: 'subscribe:agent' | 'subscribe:metrics' | 'subscribe:logs';
  payload: {
    agentId?: string;
    filters?: string[];
  };
}

export interface UnsubscribeMessage extends WSMessage {
  type: 'unsubscribe';
  payload: {
    subscriptionId: string;
  };
}