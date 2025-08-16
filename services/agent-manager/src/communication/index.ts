/**
 * Communication Module Index
 * Exports for the inter-agent communication system
 */

export { RedisClient } from './redis-client';
export { MessageBroker } from './message-broker';
export { AgentCommunicationManager } from './agent-communication-manager';
export type { CommunicationManagerConfig } from './agent-communication-manager';
export { CommunicationWebSocketIntegration } from './websocket-integration';

// Re-export types for convenience
export type {
  AgentMessage,
  BroadcastMessage,
  TaskHandoff,
  TaskHandoffResponse,
  AgentEvent,
  TaskContext,
  Task,
  CommunicationConfig,
  CommunicationAuditLog,
  MessageDeliveryStatus,
  AgentCommunication,
  AgentId,
  MessageId,
  ChannelId,
  TaskId
} from '@team-dashboard/types';

/**
 * Default communication configuration
 */
export const DEFAULT_COMMUNICATION_CONFIG: CommunicationManagerConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 1 // Use database 1 for communication
  },
  channels: {
    direct: 'agent:direct',
    broadcast: 'agent:broadcast',
    handoff: 'agent:handoff',
    events: 'agent:events'
  },
  messageRetention: {
    direct: 24 * 60 * 60 * 1000, // 24 hours
    broadcast: 12 * 60 * 60 * 1000, // 12 hours
    handoff: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  rateLimits: {
    messagesPerMinute: 60,
    broadcastsPerMinute: 10,
    handoffsPerHour: 5
  }
};

/**
 * Create and configure communication manager
 */
export function createCommunicationManager(config?: Partial<CommunicationManagerConfig>): AgentCommunicationManager {
  const finalConfig: CommunicationManagerConfig = {
    ...DEFAULT_COMMUNICATION_CONFIG,
    ...config,
    redis: {
      ...DEFAULT_COMMUNICATION_CONFIG.redis,
      ...config?.redis
    },
    channels: {
      ...DEFAULT_COMMUNICATION_CONFIG.channels,
      ...config?.channels
    },
    messageRetention: {
      ...DEFAULT_COMMUNICATION_CONFIG.messageRetention,
      ...config?.messageRetention
    },
    rateLimits: {
      ...DEFAULT_COMMUNICATION_CONFIG.rateLimits,
      ...config?.rateLimits
    }
  };

  return new AgentCommunicationManager(finalConfig);
}