/**
 * Redis Client Configuration and Connection Management
 * Handles Redis connections for inter-agent communication
 */

import Redis from 'ioredis';
import { CommunicationConfig } from '@team-dashboard/types';

export class RedisClient {
  private redis: Redis | null = null;
  private subscriber: Redis | null = null;
  private config: CommunicationConfig['redis'];
  private connected: boolean = false;

  constructor(config: CommunicationConfig['redis']) {
    this.config = config;
  }

  /**
   * Connect to Redis with separate instances for pub/sub
   */
  async connect(): Promise<void> {
    try {
      // Redis configuration object
      const redisConfig = {
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };

      // Main Redis connection for operations
      this.redis = new Redis(redisConfig);

      // Separate connection for subscribing (Redis requirement)
      this.subscriber = new Redis(redisConfig);

      // Connect both instances
      await Promise.all([
        this.redis.connect(),
        this.subscriber.connect()
      ]);

      // Set up error handlers
      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.connected = false;
      });

      this.subscriber.on('error', (error) => {
        console.error('Redis subscriber error:', error);
      });

      // Set up reconnection handlers
      this.redis.on('connect', () => {
        console.log('Redis connected successfully');
        this.connected = true;
      });

      this.redis.on('ready', () => {
        console.log('Redis ready for operations');
      });

      this.connected = true;
      console.log('Redis client initialized successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      this.connected = false;
      console.log('Redis client disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
      throw error;
    }
  }

  /**
   * Check if connected to Redis
   */
  isConnected(): boolean {
    return this.connected && 
           this.redis !== null && 
           this.subscriber !== null &&
           this.redis.status === 'ready' &&
           this.subscriber.status === 'ready';
  }

  /**
   * Get the main Redis instance
   */
  getRedis(): Redis {
    if (!this.redis || !this.connected) {
      throw new Error('Redis client not connected');
    }
    return this.redis;
  }

  /**
   * Get the subscriber Redis instance
   */
  getSubscriber(): Redis {
    if (!this.subscriber || !this.connected) {
      throw new Error('Redis subscriber not connected');
    }
    return this.subscriber;
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<number> {
    const redis = this.getRedis();
    return await redis.publish(channel, message);
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    const subscriber = this.getSubscriber();
    
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        handler(message);
      }
    });

    await subscriber.subscribe(channel);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.getSubscriber();
    await subscriber.unsubscribe(channel);
  }

  /**
   * Store data with expiration
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    const redis = this.getRedis();
    await redis.setex(key, seconds, value);
  }

  /**
   * Get data by key
   */
  async get(key: string): Promise<string | null> {
    const redis = this.getRedis();
    return await redis.get(key);
  }

  /**
   * Delete data by key
   */
  async del(key: string): Promise<number> {
    const redis = this.getRedis();
    return await redis.del(key);
  }

  /**
   * Add to a list (for message queuing)
   */
  async lpush(key: string, value: string): Promise<number> {
    const redis = this.getRedis();
    return await redis.lpush(key, value);
  }

  /**
   * Get range from list
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const redis = this.getRedis();
    return await redis.lrange(key, start, stop);
  }

  /**
   * Trim list to specified size
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const redis = this.getRedis();
    await redis.ltrim(key, start, stop);
  }

  /**
   * Execute multiple commands in a pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    const redis = this.getRedis();
    const pipeline = redis.pipeline();
    
    commands.forEach(([command, ...args]) => {
      (pipeline as any)[command](...args);
    });
    
    const results = await pipeline.exec();
    return results?.map(([error, result]) => {
      if (error) throw error;
      return result;
    }) || [];
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const start = Date.now();
      await this.getRedis().ping();
      const latency = Date.now() - start;
      
      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }
}