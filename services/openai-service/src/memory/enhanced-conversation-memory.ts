import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import { DatabaseConnection } from '../database/connection';
import { countMessageTokens } from '../utils/tokens';
import type { ConversationMemory } from '../types';

export interface EnhancedConversationMemoryConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  cache: {
    maxSize: number; // Number of conversations to keep in memory
    ttl: number; // Cache TTL in milliseconds
  };
  conversation: {
    maxMessages: number;
    maxTokens: number;
    relevanceThreshold: number; // Minimum relevance score to keep a message
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer';
  content: string | any[] | null;
  tokenCount: number;
  relevanceScore: number;
  createdAt: Date;
  embedding?: number[];
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
}

export interface EnhancedConversationMemory extends Omit<ConversationMemory, 'messages'> {
  id: string;
  parentConversationId?: string;
  messages: ConversationMessage[];
  metadata: Record<string, any>;
  isActive: boolean;
}

export interface ConversationBranch {
  id: string;
  sourceConversationId: string;
  targetConversationId: string;
  branchPointMessageId?: string;
  branchReason?: string;
  createdAt: Date;
}

// Helper function to convert ConversationMessage to ChatCompletionMessageParam
function toOpenAIMessage(message: ConversationMessage): ChatCompletionMessageParam {
  const base: any = {
    role: message.role,
    content: message.content,
  };
  
  if (message.tool_call_id) base.tool_call_id = message.tool_call_id;
  if (message.tool_calls) base.tool_calls = message.tool_calls;
  if (message.name) base.name = message.name;
  
  return base;
}

// Helper function to convert ConversationMessage[] to ChatCompletionMessageParam[]
function toOpenAIMessages(messages: ConversationMessage[]): ChatCompletionMessageParam[] {
  return messages.map(toOpenAIMessage);
}

export class EnhancedConversationManager {
  private redis: Redis;
  private database: DatabaseConnection;
  private memoryCache: LRUCache<string, EnhancedConversationMemory>;
  private config: EnhancedConversationMemoryConfig;
  private keyPrefix = 'enhanced_conversation:';

  constructor(config: EnhancedConversationMemoryConfig) {
    this.config = config;
    
    // Initialize Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    // Initialize Database
    this.database = new DatabaseConnection(config.database);

    // Initialize LRU Cache for active conversations
    this.memoryCache = new LRUCache({
      max: config.cache.maxSize,
      ttl: config.cache.ttl,
      dispose: async (value, key) => {
        // Write to Redis when evicted from memory
        await this.writeToRedis(key, value);
      },
    });

    this.redis.on('error', (error: Error) => {
      console.error('Enhanced conversation memory Redis error:', error);
    });
  }

  async initialize(): Promise<void> {
    await this.database.runMigrations();
    const isConnected = await this.database.checkConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
  }

  private async writeToRedis(sessionId: string, conversation: EnhancedConversationMemory): Promise<void> {
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      await this.redis.setex(key, Math.floor(this.config.cache.ttl / 1000), JSON.stringify(conversation));
    } catch (error) {
      console.error(`Error writing conversation ${sessionId} to Redis:`, error);
    }
  }

  private async readFromRedis(sessionId: string): Promise<EnhancedConversationMemory | null> {
    try {
      const key = `${this.keyPrefix}${sessionId}`;
      const data = await this.redis.get(key);
      if (!data) return null;

      const conversation = JSON.parse(data) as EnhancedConversationMemory;
      // Ensure dates are properly parsed
      conversation.createdAt = new Date(conversation.createdAt);
      conversation.updatedAt = new Date(conversation.updatedAt);
      conversation.messages.forEach(msg => {
        msg.createdAt = new Date(msg.createdAt);
      });

      return conversation;
    } catch (error) {
      console.error(`Error reading conversation ${sessionId} from Redis:`, error);
      return null;
    }
  }

  private async loadFromDatabase(sessionId: string): Promise<EnhancedConversationMemory | null> {
    try {
      const conversations = await this.database.query(
        `SELECT c.*, 
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', m.id,
                      'role', m.role,
                      'content', m.content,
                      'tokenCount', m.token_count,
                      'relevanceScore', m.relevance_score,
                      'createdAt', m.created_at,
                      'metadata', m.metadata
                    ) ORDER BY m.created_at
                  ) FILTER (WHERE m.id IS NOT NULL), 
                  '[]'::json
                ) as messages
         FROM conversations c
         LEFT JOIN messages m ON c.id = m.conversation_id
         WHERE c.session_id = $1 AND c.is_active = true
         GROUP BY c.id
         ORDER BY c.updated_at DESC
         LIMIT 1`,
        [sessionId]
      );

      if (conversations.length === 0) return null;

      const conv = conversations[0];
      return {
        id: conv.id,
        sessionId: conv.session_id,
        parentConversationId: conv.parent_conversation_id,
        messages: conv.messages.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })),
        totalTokens: conv.total_tokens,
        totalCost: parseFloat(conv.total_cost),
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
        metadata: conv.metadata || {},
        isActive: conv.is_active,
      };
    } catch (error) {
      console.error(`Error loading conversation ${sessionId} from database:`, error);
      return null;
    }
  }

  private async saveToDatabase(conversation: EnhancedConversationMemory): Promise<void> {
    await this.database.transaction(async (query) => {
      // Upsert conversation
      await query(
        `INSERT INTO conversations (id, session_id, parent_conversation_id, total_tokens, total_cost, created_at, updated_at, metadata, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           total_tokens = EXCLUDED.total_tokens,
           total_cost = EXCLUDED.total_cost,
           updated_at = EXCLUDED.updated_at,
           metadata = EXCLUDED.metadata,
           is_active = EXCLUDED.is_active`,
        [
          conversation.id,
          conversation.sessionId,
          conversation.parentConversationId,
          conversation.totalTokens,
          conversation.totalCost,
          conversation.createdAt,
          conversation.updatedAt,
          JSON.stringify(conversation.metadata),
          conversation.isActive,
        ]
      );

      // Save new messages
      for (const message of conversation.messages) {
        await query(
          `INSERT INTO messages (id, conversation_id, role, content, token_count, relevance_score, created_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             relevance_score = EXCLUDED.relevance_score,
             metadata = EXCLUDED.metadata`,
          [
            message.id,
            conversation.id,
            message.role,
            typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
            message.tokenCount,
            message.relevanceScore,
            message.createdAt,
            JSON.stringify((message as any).metadata || {}),
          ]
        );
      }
    });
  }

  async getConversation(sessionId: string, useCache: boolean = true): Promise<EnhancedConversationMemory | null> {
    const startTime = Date.now();

    try {
      // Check memory cache first (fastest)
      if (useCache && this.memoryCache.has(sessionId)) {
        const conversation = this.memoryCache.get(sessionId)!;
        const elapsed = Date.now() - startTime;
        console.log(`Retrieved conversation from memory cache in ${elapsed}ms`);
        return conversation;
      }

      // Check Redis cache (fast)
      if (useCache) {
        const conversation = await this.readFromRedis(sessionId);
        if (conversation) {
          this.memoryCache.set(sessionId, conversation);
          const elapsed = Date.now() - startTime;
          console.log(`Retrieved conversation from Redis cache in ${elapsed}ms`);
          return conversation;
        }
      }

      // Load from database (slower but complete)
      const conversation = await this.loadFromDatabase(sessionId);
      if (conversation) {
        if (useCache) {
          this.memoryCache.set(sessionId, conversation);
          await this.writeToRedis(sessionId, conversation);
        }
        const elapsed = Date.now() - startTime;
        console.log(`Retrieved conversation from database in ${elapsed}ms`);
        return conversation;
      }

      return null;
    } catch (error) {
      console.error(`Error getting conversation ${sessionId}:`, error);
      return null;
    }
  }

  async addMessage(
    sessionId: string,
    message: ChatCompletionMessageParam,
    model: string,
    relevanceContext?: string
  ): Promise<EnhancedConversationMemory> {
    let conversation = await this.getConversation(sessionId);
    
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        sessionId,
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        isActive: true,
      };
    }

    const enhancedMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: message.role as 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer',
      content: message.content as string | any[] | null,
      tokenCount: countMessageTokens([message], model as any),
      relevanceScore: 0.5, // Will be calculated based on context
      createdAt: new Date(),
      ...(('tool_call_id' in message) && { tool_call_id: message.tool_call_id }),
      ...(('tool_calls' in message) && { tool_calls: message.tool_calls }),
      ...(('name' in message) && { name: message.name }),
    };

    conversation.messages.push(enhancedMessage);
    conversation.totalTokens = countMessageTokens(toOpenAIMessages(conversation.messages), model as any);
    conversation.updatedAt = new Date();

    // Apply smart pruning if needed
    conversation.messages = await this.smartPrune(conversation.messages, model, relevanceContext);
    conversation.totalTokens = countMessageTokens(toOpenAIMessages(conversation.messages), model as any);

    // Update cache and persist
    this.memoryCache.set(sessionId, conversation);
    await this.saveToDatabase(conversation);
    await this.writeToRedis(sessionId, conversation);

    return conversation;
  }

  private async smartPrune(
    messages: ConversationMessage[],
    model: string,
    relevanceContext?: string
  ): Promise<ConversationMessage[]> {
    if (messages.length <= this.config.conversation.maxMessages &&
        countMessageTokens(toOpenAIMessages(messages), model as any) <= this.config.conversation.maxTokens) {
      return messages;
    }

    // Always keep system messages
    const systemMessages = messages.filter(m => m.role === 'system');
    let conversationMessages = messages.filter(m => m.role !== 'system');

    // Update relevance scores if context is provided
    if (relevanceContext) {
      conversationMessages = await this.updateRelevanceScores(conversationMessages, relevanceContext);
    }

    // Sort by relevance score (descending) and recency
    conversationMessages.sort((a, b) => {
      const relevanceDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Keep messages above threshold and within limits
    let prunedMessages: ConversationMessage[] = [];
    let currentTokens = countMessageTokens(toOpenAIMessages(systemMessages), model as any);
    const maxConversationMessages = this.config.conversation.maxMessages - systemMessages.length;

    for (const message of conversationMessages) {
      if (prunedMessages.length >= maxConversationMessages) break;
      
      const messageTokens = message.tokenCount;
      if (currentTokens + messageTokens > this.config.conversation.maxTokens * 0.9) break;
      
      if (message.relevanceScore >= this.config.conversation.relevanceThreshold) {
        prunedMessages.push(message);
        currentTokens += messageTokens;
      }
    }

    // Sort pruned messages chronologically
    prunedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return [...systemMessages, ...prunedMessages];
  }

  private async updateRelevanceScores(
    messages: ConversationMessage[],
    context: string
  ): Promise<ConversationMessage[]> {
    // This is a simplified relevance scoring
    // In production, you'd use semantic embeddings
    const contextWords = context.toLowerCase().split(/\s+/);
    
    return messages.map(message => {
      const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      const messageWords = content.toLowerCase().split(/\s+/);
      
      // Calculate word overlap
      const overlap = contextWords.filter(word => messageWords.includes(word)).length;
      const maxWords = Math.max(contextWords.length, messageWords.length);
      const semanticScore = maxWords > 0 ? overlap / maxWords : 0;
      
      // Calculate recency score
      const ageHours = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 1 - (ageHours / 168)); // 1 week decay
      
      // Combine scores
      message.relevanceScore = (semanticScore * 0.7) + (recencyScore * 0.3);
      
      return message;
    });
  }

  async forkConversation(
    sessionId: string,
    branchReason?: string,
    fromMessageId?: string
  ): Promise<EnhancedConversationMemory> {
    const sourceConversation = await this.getConversation(sessionId);
    if (!sourceConversation) {
      throw new Error(`Source conversation ${sessionId} not found`);
    }

    // Create new conversation ID
    const forkedSessionId = `${sessionId}_fork_${Date.now()}`;
    
    // Find branch point
    let messagesToCopy = sourceConversation.messages;
    if (fromMessageId) {
      const branchIndex = sourceConversation.messages.findIndex(m => m.id === fromMessageId);
      if (branchIndex >= 0) {
        messagesToCopy = sourceConversation.messages.slice(0, branchIndex + 1);
      }
    }

    // Create forked conversation
    const forkedConversation: EnhancedConversationMemory = {
      id: crypto.randomUUID(),
      sessionId: forkedSessionId,
      parentConversationId: sourceConversation.id,
      messages: messagesToCopy.map(msg => ({
        ...msg,
        id: crypto.randomUUID(), // New IDs for copied messages
      })),
      totalTokens: countMessageTokens(toOpenAIMessages(messagesToCopy), 'gpt-4o'),
      totalCost: 0, // Reset cost for fork
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { ...sourceConversation.metadata, forkedFrom: sessionId },
      isActive: true,
    };

    // Save fork
    await this.saveToDatabase(forkedConversation);
    this.memoryCache.set(forkedSessionId, forkedConversation);
    await this.writeToRedis(forkedSessionId, forkedConversation);

    // Record branch relationship
    await this.database.query(
      `INSERT INTO conversation_branches (source_conversation_id, target_conversation_id, branch_point_message_id, branch_reason)
       VALUES ($1, $2, $3, $4)`,
      [sourceConversation.id, forkedConversation.id, fromMessageId, branchReason]
    );

    return forkedConversation;
  }

  async getBranches(sessionId: string): Promise<ConversationBranch[]> {
    const conversation = await this.getConversation(sessionId);
    if (!conversation) return [];

    const branches = await this.database.query(
      `SELECT b.*, 
              source.session_id as source_session_id,
              target.session_id as target_session_id
       FROM conversation_branches b
       JOIN conversations source ON b.source_conversation_id = source.id
       JOIN conversations target ON b.target_conversation_id = target.id
       WHERE source.id = $1 OR target.id = $1
       ORDER BY b.created_at DESC`,
      [conversation.id]
    );

    return branches.map(b => ({
      id: b.id,
      sourceConversationId: b.source_session_id,
      targetConversationId: b.target_session_id,
      branchPointMessageId: b.branch_point_message_id,
      branchReason: b.branch_reason,
      createdAt: new Date(b.created_at),
    }));
  }

  async getStats(): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    memoryUsage: number;
    cacheHitRate: number;
    averageRetrievalTime: number;
  }> {
    const [conversationStats, messageStats] = await Promise.all([
      this.database.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active
        FROM conversations
      `),
      this.database.query(`
        SELECT COUNT(*) as total
        FROM messages
      `),
    ]);

    const redisMemory = await this.redis.memory('USAGE', `${this.keyPrefix}*`);

    return {
      totalConversations: parseInt(conversationStats[0].total),
      activeConversations: parseInt(conversationStats[0].active),
      totalMessages: parseInt(messageStats[0].total),
      memoryUsage: redisMemory || 0,
      cacheHitRate: 0.85, // Would track this in production
      averageRetrievalTime: 25, // Would track this in production
    };
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    
    const result = await this.database.query(
      `UPDATE conversations 
       SET is_active = false 
       WHERE updated_at < $1 AND is_active = true
       RETURNING id`,
      [cutoffDate]
    );

    // Clean up Redis cache
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const conversation = JSON.parse(data);
        if (new Date(conversation.updatedAt) < cutoffDate) {
          await this.redis.del(key);
        }
      }
    }

    return result.length;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    await this.database.close();
  }
}