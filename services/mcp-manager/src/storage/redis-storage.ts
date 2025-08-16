/**
 * @service mcp-manager/storage
 * Redis-based storage for MCP server configurations
 */

import Redis from 'ioredis';
import { McpServer, McpServerStatus } from '@team-dashboard/types';
import { config } from '../config';

export class McpRedisStorage {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }

  // Server configuration operations
  async saveServer(server: McpServer): Promise<void> {
    const key = `servers:${server.id}`;
    await this.redis.hset(key, {
      data: JSON.stringify(server),
      updatedAt: new Date().toISOString()
    });
    
    // Add to servers set for listing
    await this.redis.sadd('servers:list', server.id);
  }

  async getServer(id: string): Promise<McpServer | null> {
    const key = `servers:${id}`;
    const data = await this.redis.hget(key, 'data');
    return data ? JSON.parse(data) : null;
  }

  async getAllServers(): Promise<McpServer[]> {
    const serverIds = await this.redis.smembers('servers:list');
    const servers: McpServer[] = [];
    
    for (const id of serverIds) {
      const server = await this.getServer(id);
      if (server) servers.push(server);
    }
    
    return servers;
  }

  async deleteServer(id: string): Promise<boolean> {
    const key = `servers:${id}`;
    const deleted = await this.redis.del(key);
    await this.redis.srem('servers:list', id);
    
    // Clean up status and health data
    await this.redis.del(`status:${id}`, `health:${id}`);
    
    return deleted > 0;
  }

  // Server status operations
  async saveServerStatus(status: McpServerStatus): Promise<void> {
    const key = `status:${status.serverId}`;
    await this.redis.hset(key, {
      data: JSON.stringify(status),
      updatedAt: new Date().toISOString()
    });
    
    // Set expiration for status data (5 minutes)
    await this.redis.expire(key, 300);
  }

  async getServerStatus(serverId: string): Promise<McpServerStatus | null> {
    const key = `status:${serverId}`;
    const data = await this.redis.hget(key, 'data');
    return data ? JSON.parse(data) : null;
  }

  async getAllServerStatuses(): Promise<McpServerStatus[]> {
    const pattern = 'status:*';
    const keys = await this.redis.keys(pattern);
    const statuses: McpServerStatus[] = [];
    
    for (const key of keys) {
      const data = await this.redis.hget(key, 'data');
      if (data) statuses.push(JSON.parse(data));
    }
    
    return statuses;
  }

  // Health check operations
  async saveHealthCheck(serverId: string, health: any): Promise<void> {
    const key = `health:${serverId}`;
    await this.redis.zadd(key, Date.now(), JSON.stringify(health));
    
    // Keep only last 24 hours of health checks
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    await this.redis.zremrangebyscore(key, '-inf', dayAgo);
  }

  async getLatestHealthCheck(serverId: string): Promise<any | null> {
    const key = `health:${serverId}`;
    const results = await this.redis.zrevrange(key, 0, 0);
    return results.length > 0 ? JSON.parse(results[0]) : null;
  }

  // Search and filtering
  async searchServers(query: string): Promise<string[]> {
    const allServers = await this.getAllServers();
    return allServers
      .filter(server => 
        server.name.toLowerCase().includes(query.toLowerCase()) ||
        server.description?.toLowerCase().includes(query.toLowerCase()) ||
        server.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
      .map(server => server.id);
  }
}