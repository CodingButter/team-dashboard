/**
 * Server to Client WebSocket Messages
 * Message types sent from server to client
 */

import { WSMessage, AgentStatus } from './base';

// ============================================================================
// Server to Client Messages
// ============================================================================

export interface AgentStatusMessage extends WSMessage {
  type: 'agent:status';
  payload: {
    agentId: string;
    status: AgentStatus;
    details?: {
      pid?: number;
      uptime?: number;
      lastActivity?: number;
    };
  };
}

export interface AgentOutputMessage extends WSMessage {
  type: 'agent:output';
  payload: {
    agentId: string;
    stream: 'stdout' | 'stderr' | 'ai_response';
    data: string;
    timestamp: number;
    sequence: number;
  };
}

export interface AgentCreatedMessage extends WSMessage {
  type: 'agent:created';
  payload: {
    agentId: string;
    name: string;
    pid: number;
    startTime: number;
  };
}

export interface AgentErrorMessage extends WSMessage {
  type: 'agent:error';
  payload: {
    agentId: string;
    error: {
      code: string;
      message: string;
      stack?: string;
    };
  };
}

export interface MetricsUpdateMessage extends WSMessage {
  type: 'metrics:update';
  payload: {
    system: {
      cpu: {
        usage: number;
        cores: number;
        temperature?: number;
      };
      memory: {
        total: number;
        used: number;
        available: number;
        percent: number;
      };
      disk: {
        total: number;
        used: number;
        percent: number;
      };
      network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
      };
    };
    agents?: Array<{
      agentId: string;
      cpu: number;
      memory: number;
      threads: number;
    }>;
  };
}

export interface SystemAlertMessage extends WSMessage {
  type: 'system:alert';
  payload: {
    level: 'info' | 'warning' | 'error' | 'critical';
    category: 'resource' | 'performance' | 'security' | 'agent';
    message: string;
    details?: any;
  };
}

export interface AckMessage extends WSMessage {
  type: 'ack';
  payload: {
    messageId: string;
    success: boolean;
    error?: string;
  };
}

export interface HeartbeatMessage extends WSMessage {
  type: 'ping' | 'pong';
  payload: {
    timestamp: number;
  };
}