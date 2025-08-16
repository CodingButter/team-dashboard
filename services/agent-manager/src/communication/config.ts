/**
 * Communication System Configuration
 * Centralized configuration for inter-agent communication
 */

import type { CommunicationManagerConfig } from './agent-communication-manager';

/**
 * Environment-based configuration loader
 */
export function loadCommunicationConfig(): CommunicationManagerConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_COMMUNICATION_DB || '1', 10)
    },
    channels: {
      direct: process.env.COMM_DIRECT_CHANNEL || 'agent:direct',
      broadcast: process.env.COMM_BROADCAST_CHANNEL || 'agent:broadcast',
      handoff: process.env.COMM_HANDOFF_CHANNEL || 'agent:handoff',
      events: process.env.COMM_EVENTS_CHANNEL || 'agent:events'
    },
    messageRetention: {
      direct: parseInt(process.env.COMM_DIRECT_RETENTION || '86400000', 10), // 24 hours
      broadcast: parseInt(process.env.COMM_BROADCAST_RETENTION || '43200000', 10), // 12 hours
      handoff: parseInt(process.env.COMM_HANDOFF_RETENTION || '604800000', 10) // 7 days
    },
    rateLimits: {
      messagesPerMinute: parseInt(process.env.COMM_MESSAGES_PER_MINUTE || '60', 10),
      broadcastsPerMinute: parseInt(process.env.COMM_BROADCASTS_PER_MINUTE || '10', 10),
      handoffsPerHour: parseInt(process.env.COMM_HANDOFFS_PER_HOUR || '5', 10)
    }
  };
}

/**
 * Development configuration
 */
export const DEVELOPMENT_CONFIG: CommunicationManagerConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 1
  },
  channels: {
    direct: 'dev:agent:direct',
    broadcast: 'dev:agent:broadcast',
    handoff: 'dev:agent:handoff',
    events: 'dev:agent:events'
  },
  messageRetention: {
    direct: 60 * 60 * 1000, // 1 hour
    broadcast: 30 * 60 * 1000, // 30 minutes
    handoff: 24 * 60 * 60 * 1000 // 24 hours
  },
  rateLimits: {
    messagesPerMinute: 100,
    broadcastsPerMinute: 20,
    handoffsPerHour: 10
  }
};

/**
 * Test configuration
 */
export const TEST_CONFIG: CommunicationManagerConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 15 // Use separate test database
  },
  channels: {
    direct: 'test:agent:direct',
    broadcast: 'test:agent:broadcast',
    handoff: 'test:agent:handoff',
    events: 'test:agent:events'
  },
  messageRetention: {
    direct: 5 * 60 * 1000, // 5 minutes
    broadcast: 5 * 60 * 1000, // 5 minutes
    handoff: 10 * 60 * 1000 // 10 minutes
  },
  rateLimits: {
    messagesPerMinute: 1000,
    broadcastsPerMinute: 100,
    handoffsPerHour: 50
  }
};

/**
 * Production configuration
 */
export const PRODUCTION_CONFIG: CommunicationManagerConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: 1
  },
  channels: {
    direct: 'prod:agent:direct',
    broadcast: 'prod:agent:broadcast',
    handoff: 'prod:agent:handoff',
    events: 'prod:agent:events'
  },
  messageRetention: {
    direct: 7 * 24 * 60 * 60 * 1000, // 7 days
    broadcast: 3 * 24 * 60 * 60 * 1000, // 3 days
    handoff: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  rateLimits: {
    messagesPerMinute: 30,
    broadcastsPerMinute: 5,
    handoffsPerHour: 3
  }
};

/**
 * Get configuration based on environment
 */
export function getConfigByEnvironment(env: string = process.env.NODE_ENV || 'development'): CommunicationManagerConfig {
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'test':
      return TEST_CONFIG;
    case 'development':
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: CommunicationManagerConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Redis configuration
  if (!config.redis.host) {
    errors.push('Redis host is required');
  }
  if (!config.redis.port || config.redis.port < 1 || config.redis.port > 65535) {
    errors.push('Redis port must be between 1 and 65535');
  }
  if (config.redis.db < 0 || config.redis.db > 15) {
    errors.push('Redis database must be between 0 and 15');
  }

  // Validate channels
  const channels = Object.values(config.channels);
  if (channels.some(channel => !channel || typeof channel !== 'string')) {
    errors.push('All channel names must be non-empty strings');
  }

  // Validate message retention
  const retentions = Object.values(config.messageRetention);
  if (retentions.some(retention => retention < 1000)) {
    errors.push('Message retention must be at least 1000ms (1 second)');
  }

  // Validate rate limits
  if (config.rateLimits.messagesPerMinute < 1) {
    errors.push('Messages per minute must be at least 1');
  }
  if (config.rateLimits.broadcastsPerMinute < 1) {
    errors.push('Broadcasts per minute must be at least 1');
  }
  if (config.rateLimits.handoffsPerHour < 1) {
    errors.push('Handoffs per hour must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}