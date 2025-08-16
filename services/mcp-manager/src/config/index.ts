/**
 * @service mcp-manager/config
 * Configuration management for MCP manager service
 */

export const config = {
  server: {
    port: parseInt(process.env.MCP_MANAGER_PORT || '3003'),
    host: process.env.MCP_MANAGER_HOST || '127.0.0.1',
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
      credentials: true
    }
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'mcp:'
  },
  
  mcp: {
    defaultTimeout: parseInt(process.env.MCP_DEFAULT_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.MCP_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.MCP_RETRY_DELAY || '5000'),
    healthCheckInterval: parseInt(process.env.MCP_HEALTH_CHECK_INTERVAL || '60000'),
    encryptionKey: process.env.MCP_ENCRYPTION_KEY || 'default-key-change-in-production'
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production'
  }
} as const;

export type Config = typeof config;