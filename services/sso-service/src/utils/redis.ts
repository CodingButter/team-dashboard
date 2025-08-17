/**
 * Redis Manager
 * Redis connection management for sessions, caching, and rate limiting
 */

import Redis from 'ioredis';
import { logger, performanceLogger } from './logger.js';
import type { Config } from '../config/index.js';

export class RedisManager {
  private client: Redis;
  private publisher: Redis;
  private subscriber: Redis;
  private config: Config['redis'];
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: Config['redis']) {
    this.config = config;
    
    // Create main client
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      retryDelayOnFailover: config.retryDelayOnFailover,
      enableReadyCheck: config.enableReadyCheck,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      commandTimeout: 5000,
      connectTimeout: 10000
    });

    // Create publisher client for pub/sub
    this.publisher = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      lazyConnect: true
    });

    // Create subscriber client for pub/sub
    this.subscriber = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      // Test connection
      await this.client.ping();

      logger.info('Redis connected successfully', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      this.startHealthCheck();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      await Promise.all([
        this.client.disconnect(),
        this.publisher.disconnect(),
        this.subscriber.disconnect()
      ]);

      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  // Session management
  async setSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    const start = Date.now();
    try {
      const key = `session:${sessionId}`;
      await this.client.setex(key, ttl, JSON.stringify(sessionData));
      
      performanceLogger.timing('redis_set_session', Date.now() - start);
      logger.debug('Session stored in Redis', { sessionId, ttl });
    } catch (error) {
      logger.error('Failed to store session in Redis:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    const start = Date.now();
    try {
      const key = `session:${sessionId}`;
      const data = await this.client.get(key);
      
      performanceLogger.timing('redis_get_session', Date.now() - start);
      
      if (!data) {
        logger.debug('Session not found in Redis', { sessionId });
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to retrieve session from Redis:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const start = Date.now();
    try {
      const key = `session:${sessionId}`;
      await this.client.del(key);
      
      performanceLogger.timing('redis_delete_session', Date.now() - start);
      logger.debug('Session deleted from Redis', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session from Redis:', error);
      throw error;
    }
  }

  async extendSession(sessionId: string, ttl: number): Promise<void> {
    const start = Date.now();
    try {
      const key = `session:${sessionId}`;
      await this.client.expire(key, ttl);
      
      performanceLogger.timing('redis_extend_session', Date.now() - start);
      logger.debug('Session TTL extended', { sessionId, ttl });
    } catch (error) {
      logger.error('Failed to extend session TTL:', error);
      throw error;
    }
  }

  // Cache management
  async setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
    const start = Date.now();
    try {
      const cacheKey = `cache:${key}`;
      await this.client.setex(cacheKey, ttl, JSON.stringify(value));
      
      performanceLogger.timing('redis_set_cache', Date.now() - start);
      logger.debug('Value cached in Redis', { key, ttl });
    } catch (error) {
      logger.error('Failed to cache value in Redis:', error);
      throw error;
    }
  }

  async getCache(key: string): Promise<any | null> {
    const start = Date.now();
    try {
      const cacheKey = `cache:${key}`;
      const data = await this.client.get(cacheKey);
      
      performanceLogger.timing('redis_get_cache', Date.now() - start);
      
      if (!data) {
        logger.debug('Cache miss', { key });
        return null;
      }

      logger.debug('Cache hit', { key });
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to retrieve cached value:', error);
      throw error;
    }
  }

  async deleteCache(key: string): Promise<void> {
    const start = Date.now();
    try {
      const cacheKey = `cache:${key}`;
      await this.client.del(cacheKey);
      
      performanceLogger.timing('redis_delete_cache', Date.now() - start);
      logger.debug('Cache value deleted', { key });
    } catch (error) {
      logger.error('Failed to delete cached value:', error);
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const start = Date.now();
    try {
      const keys = await this.client.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await this.client.del(...keys);
        performanceLogger.timing('redis_invalidate_pattern', Date.now() - start);
        logger.debug('Cache pattern invalidated', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to invalidate cache pattern:', error);
      throw error;
    }
  }

  // Rate limiting
  async incrementRateLimit(key: string, window: number, limit: number): Promise<{ count: number; ttl: number; allowed: boolean }> {
    const start = Date.now();
    try {
      const rateLimitKey = `rate_limit:${key}`;
      const pipeline = this.client.pipeline();
      
      pipeline.incr(rateLimitKey);
      pipeline.expire(rateLimitKey, window);
      pipeline.ttl(rateLimitKey);
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Pipeline execution failed');
      }

      const count = results[0][1] as number;
      const ttl = results[2][1] as number;
      const allowed = count <= limit;

      performanceLogger.timing('redis_rate_limit', Date.now() - start);
      
      if (!allowed) {
        logger.warn('Rate limit exceeded', { key, count, limit, ttl });
      }

      return { count, ttl, allowed };
    } catch (error) {
      logger.error('Failed to check rate limit:', error);
      throw error;
    }
  }

  // Lock management for distributed operations
  async acquireLock(lockKey: string, ttl: number = 30): Promise<string | null> {
    const start = Date.now();
    try {
      const lockValue = `${Date.now()}-${Math.random()}`;
      const key = `lock:${lockKey}`;
      
      const result = await this.client.set(key, lockValue, 'EX', ttl, 'NX');
      
      performanceLogger.timing('redis_acquire_lock', Date.now() - start);
      
      if (result === 'OK') {
        logger.debug('Lock acquired', { lockKey, lockValue, ttl });
        return lockValue;
      }

      logger.debug('Failed to acquire lock', { lockKey });
      return null;
    } catch (error) {
      logger.error('Failed to acquire lock:', error);
      throw error;
    }
  }

  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    const start = Date.now();
    try {
      const key = `lock:${lockKey}`;
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.client.eval(script, 1, key, lockValue);
      
      performanceLogger.timing('redis_release_lock', Date.now() - start);
      
      const released = result === 1;
      logger.debug('Lock release attempt', { lockKey, lockValue, released });
      
      return released;
    } catch (error) {
      logger.error('Failed to release lock:', error);
      throw error;
    }
  }

  // Pub/Sub for real-time events
  async publish(channel: string, message: any): Promise<void> {
    const start = Date.now();
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      
      performanceLogger.timing('redis_publish', Date.now() - start);
      logger.debug('Message published', { channel });
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
            logger.debug('Message received', { channel: receivedChannel });
          } catch (error) {
            logger.error('Failed to parse received message:', error);
          }
        }
      });

      logger.info('Subscribed to channel', { channel });
    } catch (error) {
      logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
      logger.info('Unsubscribed from channel', { channel });
    } catch (error) {
      logger.error('Failed to unsubscribe from channel:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Get Redis client for advanced operations
  getClient(): Redis {
    return this.client;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.debug('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.debug('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error:', error);
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error:', error);
    });
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        logger.error('Redis health check failed');
      }
    }, 30000); // Check every 30 seconds
  }
}