/**
 * @service mcp-manager/servers/memento-redis
 * Redis persistence adapter for Memento MCP
 */

import Redis from 'ioredis';
import { config } from '../config';

export interface MementoEntity {
  id: string;
  name: string;
  entityType: string;
  observations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MementoRelation {
  id: string;
  from: string;
  to: string;
  relationType: string;
  strength?: number;
  confidence?: number;
  createdAt: Date;
}

/**
 * Redis-based persistence for Memento memory
 */
export class MementoRedisAdapter {
  private redis: Redis;
  private keyPrefix: string;
  
  constructor(agentId: string) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    });
    
    this.keyPrefix = `${config.redis.keyPrefix}memento:${agentId}:`;
  }
  
  // Entity operations
  async saveEntity(entity: MementoEntity): Promise<void> {
    const key = `${this.keyPrefix}entities:${entity.id}`;
    await this.redis.set(key, JSON.stringify(entity));
    
    // Add to entity index
    await this.redis.sadd(`${this.keyPrefix}entities:index`, entity.id);
    
    // Add to type index
    await this.redis.sadd(`${this.keyPrefix}entities:type:${entity.entityType}`, entity.id);
  }
  
  async getEntity(entityId: string): Promise<MementoEntity | null> {
    const key = `${this.keyPrefix}entities:${entityId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async searchEntities(query: string): Promise<MementoEntity[]> {
    // Get all entity IDs
    const entityIds = await this.redis.smembers(`${this.keyPrefix}entities:index`);
    const entities: MementoEntity[] = [];
    
    for (const id of entityIds) {
      const entity = await this.getEntity(id);
      if (entity) {
        // Simple text search in name and observations
        const searchText = `${entity.name} ${entity.observations.join(' ')}`.toLowerCase();
        if (searchText.includes(query.toLowerCase())) {
          entities.push(entity);
        }
      }
    }
    
    return entities;
  }
  
  async deleteEntity(entityId: string): Promise<void> {
    const entity = await this.getEntity(entityId);
    if (!entity) return;
    
    // Remove from indices
    await this.redis.srem(`${this.keyPrefix}entities:index`, entityId);
    await this.redis.srem(`${this.keyPrefix}entities:type:${entity.entityType}`, entityId);
    
    // Delete entity data
    await this.redis.del(`${this.keyPrefix}entities:${entityId}`);
  }
  
  // Relation operations
  async saveRelation(relation: MementoRelation): Promise<void> {
    const key = `${this.keyPrefix}relations:${relation.id}`;
    await this.redis.set(key, JSON.stringify(relation));
    
    // Add to relation index
    await this.redis.sadd(`${this.keyPrefix}relations:index`, relation.id);
    
    // Add to entity relation indices
    await this.redis.sadd(`${this.keyPrefix}relations:from:${relation.from}`, relation.id);
    await this.redis.sadd(`${this.keyPrefix}relations:to:${relation.to}`, relation.id);
  }
  
  async getRelation(relationId: string): Promise<MementoRelation | null> {
    const key = `${this.keyPrefix}relations:${relationId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async getRelationsFrom(entityId: string): Promise<MementoRelation[]> {
    const relationIds = await this.redis.smembers(`${this.keyPrefix}relations:from:${entityId}`);
    const relations: MementoRelation[] = [];
    
    for (const id of relationIds) {
      const relation = await this.getRelation(id);
      if (relation) {
        relations.push(relation);
      }
    }
    
    return relations;
  }
  
  async getRelationsTo(entityId: string): Promise<MementoRelation[]> {
    const relationIds = await this.redis.smembers(`${this.keyPrefix}relations:to:${entityId}`);
    const relations: MementoRelation[] = [];
    
    for (const id of relationIds) {
      const relation = await this.getRelation(id);
      if (relation) {
        relations.push(relation);
      }
    }
    
    return relations;
  }
  
  async deleteRelation(relationId: string): Promise<void> {
    const relation = await this.getRelation(relationId);
    if (!relation) return;
    
    // Remove from indices
    await this.redis.srem(`${this.keyPrefix}relations:index`, relationId);
    await this.redis.srem(`${this.keyPrefix}relations:from:${relation.from}`, relationId);
    await this.redis.srem(`${this.keyPrefix}relations:to:${relation.to}`, relationId);
    
    // Delete relation data
    await this.redis.del(`${this.keyPrefix}relations:${relationId}`);
  }
  
  // Graph operations
  async getFullGraph(): Promise<{ entities: MementoEntity[], relations: MementoRelation[] }> {
    const entityIds = await this.redis.smembers(`${this.keyPrefix}entities:index`);
    const relationIds = await this.redis.smembers(`${this.keyPrefix}relations:index`);
    
    const entities: MementoEntity[] = [];
    for (const id of entityIds) {
      const entity = await this.getEntity(id);
      if (entity) entities.push(entity);
    }
    
    const relations: MementoRelation[] = [];
    for (const id of relationIds) {
      const relation = await this.getRelation(id);
      if (relation) relations.push(relation);
    }
    
    return { entities, relations };
  }
  
  // Cleanup
  async clearAll(): Promise<void> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
  
  // Backup and restore
  async backup(): Promise<string> {
    const graph = await this.getFullGraph();
    return JSON.stringify(graph, null, 2);
  }
  
  async restore(backupData: string): Promise<void> {
    const graph = JSON.parse(backupData);
    
    // Clear existing data
    await this.clearAll();
    
    // Restore entities
    for (const entity of graph.entities) {
      await this.saveEntity(entity);
    }
    
    // Restore relations
    for (const relation of graph.relations) {
      await this.saveRelation(relation);
    }
  }
}

export default MementoRedisAdapter;