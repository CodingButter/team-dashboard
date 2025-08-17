/**
 * Redis Cache Implementation
 * 
 * Distributed caching for AI model responses using Redis.
 */

import { Redis } from 'ioredis';
import { ModelResponse } from '../types';

export class RedisCache {
  private redis: Redis;
  private ttl: number;
  private keyPrefix: string;

  constructor(
    redisUrl: string = 'redis://localhost:6379',
    ttl: number = 3600,
    keyPrefix: string = 'ai-model-hub:'
  ) {
    this.redis = new Redis(redisUrl);
    this.ttl = ttl;
    this.keyPrefix = keyPrefix;
  }

  async get(key: string): Promise<ModelResponse | null> {
    try {
      const data = await this.redis.get(this.keyPrefix + key);
      if (!data) return null;

      const response = JSON.parse(data) as ModelResponse;
      
      // Increment hit counter
      await this.redis.incr(`${this.keyPrefix}hits:${key}`);
      
      return response;
    } catch (error) {
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  async set(key: string, response: ModelResponse): Promise<void> {
    try {
      const data = JSON.stringify(response);
      const fullKey = this.keyPrefix + key;
      
      // Set with TTL
      await this.redis.setex(fullKey, this.ttl, data);
      
      // Initialize hit counter
      await this.redis.setex(`${this.keyPrefix}hits:${key}`, this.ttl, '0');
      
      // Track cache size
      await this.redis.incr(`${this.keyPrefix}stats:entries`);
      await this.redis.incrby(`${this.keyPrefix}stats:size`, data.length);
      
    } catch (error) {
      console.error('Redis cache set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.keyPrefix + key);
      
      // Also delete hit counter
      await this.redis.del(`${this.keyPrefix}hits:${key}`);
      
      return result > 0;
    } catch (error) {
      console.error('Redis cache delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(this.keyPrefix + '*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }

  async size(): Promise<number> {
    try {
      const keys = await this.redis.keys(this.keyPrefix + '*');
      return keys.filter(key => !key.includes(':hits:') && !key.includes(':stats:')).length;
    } catch (error) {
      console.error('Redis cache size error:', error);
      return 0;
    }
  }

  async getStats() {
    try {
      const entries = await this.redis.get(`${this.keyPrefix}stats:entries`) || '0';
      const totalSize = await this.redis.get(`${this.keyPrefix}stats:size`) || '0';
      
      // Get total hits
      const hitKeys = await this.redis.keys(`${this.keyPrefix}hits:*`);
      const hitCounts = await Promise.all(
        hitKeys.map(key => this.redis.get(key))
      );
      
      const totalHits = hitCounts.reduce((sum, hits) => sum + parseInt(hits || '0'), 0);

      return {
        entries: parseInt(entries),
        totalSize: parseInt(totalSize),
        totalHits,
        averageHits: hitKeys.length > 0 ? totalHits / hitKeys.length : 0
      };
    } catch (error) {
      console.error('Redis cache stats error:', error);
      return {
        entries: 0,
        totalSize: 0,
        totalHits: 0,
        averageHits: 0
      };
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}