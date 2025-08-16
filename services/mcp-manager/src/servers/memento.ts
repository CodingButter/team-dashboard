/**
 * @service mcp-manager/servers/memento
 * Memento MCP server configuration and management
 */

import { McpStdioConfig } from '@team-dashboard/types';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { MementoRedisAdapter } from './memento-redis';

export interface MementoConfig {
  dbPath?: string;
  maxEntities?: number;
  maxRelations?: number;
  enableSemanticSearch?: boolean;
  embeddingModel?: string;
  temperature?: number;
  useRedis?: boolean;
}

/**
 * Creates a Memento MCP server configuration
 */
export async function createMementoServerConfig(
  agentId: string,
  mementoConfig?: MementoConfig
): Promise<McpStdioConfig> {
  // Create agent-specific database directory
  const dbBasePath = mementoConfig?.dbPath || path.join(
    process.cwd(),
    'data',
    'memento',
    agentId
  );
  
  // Ensure directory exists
  await fs.mkdir(dbBasePath, { recursive: true });
  
  const dbPath = path.join(dbBasePath, 'memento.db');
  
  return {
    id: `memento_${agentId}`,
    name: `Memento Memory for ${agentId}`,
    description: 'Knowledge graph memory system for agent context and memory',
    transport: 'stdio',
    command: 'npx',
    args: [
      '@gannonh/memento-mcp',
      '--db-path', dbPath,
      '--max-entities', String(mementoConfig?.maxEntities || 10000),
      '--max-relations', String(mementoConfig?.maxRelations || 50000),
      '--enable-semantic-search', String(mementoConfig?.enableSemanticSearch ?? true),
      '--embedding-model', mementoConfig?.embeddingModel || 'text-embedding-3-small',
      '--temperature', String(mementoConfig?.temperature || 0.7)
    ],
    workingDirectory: process.cwd(),
    enabled: true,
    autoConnect: true,
    timeout: config.mcp?.defaultTimeout || 30000,
    retryAttempts: config.mcp?.maxRetries || 3,
    retryDelay: config.mcp?.retryDelay || 5000,
    environment: [
      {
        key: 'OPENAI_API_KEY',
        value: process.env.OPENAI_API_KEY || '',
        encrypted: true,
        required: true
      },
      {
        key: 'NODE_ENV',
        value: process.env.NODE_ENV || 'development',
        encrypted: false,
        required: false
      }
    ],
    tags: ['memory', 'knowledge-graph', 'memento', agentId],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Initialize Memento server for an agent
 */
export async function initializeMementoForAgent(
  agentId: string,
  mementoConfig?: MementoConfig
): Promise<{ 
  serverConfig: McpStdioConfig;
  redisAdapter?: MementoRedisAdapter;
}> {
  console.log(`[Memento] Initializing memory system for agent: ${agentId}`);
  
  const serverConfig = await createMementoServerConfig(agentId, mementoConfig);
  
  // Initialize Redis adapter if enabled
  let redisAdapter: MementoRedisAdapter | undefined;
  if (mementoConfig?.useRedis) {
    console.log(`[Memento] Enabling Redis persistence for agent: ${agentId}`);
    redisAdapter = new MementoRedisAdapter(agentId);
  }
  
  return { serverConfig, redisAdapter };
}

/**
 * Clean up Memento data for an agent
 */
export async function cleanupMementoForAgent(
  agentId: string,
  useRedis?: boolean
): Promise<void> {
  // Clean up file-based storage
  const dbPath = path.join(
    process.cwd(),
    'data',
    'memento',
    agentId
  );
  
  try {
    await fs.rm(dbPath, { recursive: true, force: true });
    console.log(`[Memento] Cleaned up file-based memory data for agent: ${agentId}`);
  } catch (error) {
    console.warn(`[Memento] Could not clean up file data for agent ${agentId}:`, error);
  }
  
  // Clean up Redis storage if enabled
  if (useRedis) {
    try {
      const redisAdapter = new MementoRedisAdapter(agentId);
      await redisAdapter.clearAll();
      await redisAdapter.disconnect();
      console.log(`[Memento] Cleaned up Redis memory data for agent: ${agentId}`);
    } catch (error) {
      console.warn(`[Memento] Could not clean up Redis data for agent ${agentId}:`, error);
    }
  }
}

/**
 * Get Memento tools configuration for OpenAI function calling
 */
export function getMementoTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'memento_create_entities',
        description: 'Create entities in the knowledge graph memory',
        parameters: {
          type: 'object',
          properties: {
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  entityType: { type: 'string' },
                  observations: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['name', 'entityType', 'observations']
              }
            }
          },
          required: ['entities']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'memento_create_relations',
        description: 'Create relations between entities',
        parameters: {
          type: 'object',
          properties: {
            relations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  relationType: { type: 'string' }
                },
                required: ['from', 'to', 'relationType']
              }
            }
          },
          required: ['relations']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'memento_search_nodes',
        description: 'Search for nodes in the knowledge graph',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'memento_semantic_search',
        description: 'Perform semantic search in the knowledge graph',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'memento_read_graph',
        description: 'Read the entire knowledge graph',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    }
  ];
}

export default {
  createMementoServerConfig,
  initializeMementoForAgent,
  cleanupMementoForAgent,
  getMementoTools
};