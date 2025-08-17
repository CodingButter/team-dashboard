/**
 * Enhanced Conversation Memory Manager with Data Validation & Optimization
 * Comprehensive memory management for agent conversations with validation pipeline
 */

import Redis from 'ioredis';
import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ConversationMemory } from '../types';
import { countMessageTokens } from '../utils/tokens';

// Enhanced Validation Schemas
const ChatRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);

const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string().max(50000, 'Message content too long'), // 50KB limit
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.array(z.any()).optional()
});

const ConversationMemorySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  messages: z.array(ChatMessageSchema).max(1000, 'Too many messages in conversation'),
  totalTokens: z.number().int().nonnegative(),
  totalCost: z.number().nonnegative(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  metadata: z.object({
    agentId: z.string().optional(),
    model: z.string().optional(),
    userId: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});

export interface EnhancedConversationMemory extends ConversationMemory {
  metadata?: {
    agentId?: string;
    model?: string;
    userId?: string;
    tags?: string[];
  };
}

export interface MemoryManagerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  ttl: number; // Time to live in seconds
  maxMessages: number;
  maxTokens: number;
  maxConversations: number;
  compressionThreshold: number; // Compress conversations with more messages
  cleanupInterval: number; // Auto-cleanup interval in seconds
}

export interface MemoryStats {
  totalConversations: number;
  totalMemoryUsage: number;
  averageMessagesPerConversation: number;
  oldestConversation: number;
  newestConversation: number;
  compressionRatio: number;
}

export interface MemoryValidationResult {
  valid: boolean;
  errors?: string[];
  sanitized?: EnhancedConversationMemory;
  warnings?: string[];
}

export class EnhancedConversationManager {
  private redis: Redis;
  private config: MemoryManagerConfig;
  private keyPrefix = 'conversation:';
  private statsKey = 'conversation:stats';
  private cleanupInterval?: NodeJS.Timeout;
  private compressionEnabled = true;

  constructor(config: MemoryManagerConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error: Error) => {
      console.error('[MemoryManager] Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('[MemoryManager] Connected to Redis');
    });

    // Start automatic cleanup
    this.startCleanupScheduler();
  }

  private getKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  private getCompressedKey(sessionId: string): string {
    return `${this.keyPrefix}compressed:${sessionId}`;
  }

  /**
   * Validate conversation memory data with comprehensive checks
   */
  private validateMemory(data: unknown): MemoryValidationResult {
    try {
      const result = ConversationMemorySchema.safeParse(data);
      
      if (!result.success) {
        return {
          valid: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }

      const memory = result.data as EnhancedConversationMemory;
      const warnings: string[] = [];

      // Additional validation checks
      if (memory.messages.length > this.config.maxMessages * 0.8) {
        warnings.push('Conversation approaching message limit');
      }

      if (memory.totalTokens > this.config.maxTokens * 0.8) {
        warnings.push('Conversation approaching token limit');
      }

      // Check for potential security issues
      for (const message of memory.messages) {
        if (typeof message.content === 'string') {
          if (message.content.includes('<script>') || message.content.includes('javascript:')) {
            warnings.push('Potential security content detected');
          }
        }
      }

      return {
        valid: true,
        sanitized: this.sanitizeMemory(memory),
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Memory validation failed: ' + (error as Error).message]
      };
    }
  }

  /**
   * Sanitize conversation memory to prevent XSS and data corruption
   */
  private sanitizeMemory(memory: EnhancedConversationMemory): EnhancedConversationMemory {
    return {
      ...memory,
      messages: memory.messages.map(message => ({
        ...message,
        content: typeof message.content === 'string' 
          ? message.content
              .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+=/gi, '')
              .trim()
          : message.content
      })) as ChatCompletionMessageParam[]
    };
  }

  /**
   * Get conversation with validation and automatic decompression
   */
  async getConversation(sessionId: string): Promise<EnhancedConversationMemory | null> {
    try {
      // Try to get uncompressed first
      let data = await this.redis.get(this.getKey(sessionId));
      let isCompressed = false;

      // If not found, try compressed version
      if (!data) {
        data = await this.redis.get(this.getCompressedKey(sessionId));
        isCompressed = true;
      }

      if (!data) return null;

      let conversation: EnhancedConversationMemory;

      if (isCompressed && this.compressionEnabled) {
        // Decompress data (simple base64 for now, could be upgraded to gzip)
        const decompressed = Buffer.from(data, 'base64').toString('utf8');
        conversation = JSON.parse(decompressed);
      } else {
        conversation = JSON.parse(data);
      }

      // Validate the retrieved conversation
      const validation = this.validateMemory(conversation);
      if (!validation.valid) {
        console.error(`[MemoryManager] Invalid conversation data for ${sessionId}:`, validation.errors);
        return null;
      }

      if (validation.warnings) {
        console.warn(`[MemoryManager] Conversation warnings for ${sessionId}:`, validation.warnings);
      }

      // Update access time and save back
      const sanitizedConversation = validation.sanitized!;
      sanitizedConversation.updatedAt = Date.now();
      await this.saveConversation(sessionId, sanitizedConversation);

      return sanitizedConversation;
    } catch (error) {
      console.error(`[MemoryManager] Error getting conversation ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Save conversation with compression and validation
   */
  async saveConversation(sessionId: string, conversation: EnhancedConversationMemory): Promise<void> {
    try {
      // Validate before saving
      const validation = this.validateMemory(conversation);
      if (!validation.valid) {
        throw new Error(`Invalid conversation data: ${validation.errors?.join(', ')}`);
      }

      const sanitizedConversation = validation.sanitized!;
      sanitizedConversation.updatedAt = Date.now();

      const key = this.getKey(sessionId);
      let dataToStore: string;
      let keyToUse: string;

      // Determine if compression is beneficial
      if (sanitizedConversation.messages.length >= this.config.compressionThreshold && this.compressionEnabled) {
        // Compress the data
        const jsonData = JSON.stringify(sanitizedConversation);
        const compressed = Buffer.from(jsonData).toString('base64');
        
        // Only use compression if it actually saves space
        if (compressed.length < jsonData.length * 0.8) {
          dataToStore = compressed;
          keyToUse = this.getCompressedKey(sessionId);
          
          // Remove uncompressed version if it exists
          await this.redis.del(key);
        } else {
          dataToStore = jsonData;
          keyToUse = key;
        }
      } else {
        dataToStore = JSON.stringify(sanitizedConversation);
        keyToUse = key;
      }

      await this.redis.setex(keyToUse, this.config.ttl, dataToStore);
      await this.updateStats();
    } catch (error) {
      console.error(`[MemoryManager] Error saving conversation ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add message with enhanced validation and optimization
   */
  async addMessage(
    sessionId: string,
    message: ChatCompletionMessageParam,
    model: string,
    metadata?: { agentId?: string; userId?: string; tags?: string[] }
  ): Promise<EnhancedConversationMemory> {
    // Validate the message first
    const messageValidation = ChatMessageSchema.safeParse(message);
    if (!messageValidation.success) {
      throw new Error(`Invalid message: ${messageValidation.error.errors[0].message}`);
    }

    const conversation = await this.getConversation(sessionId) || {
      sessionId,
      messages: [] as ChatCompletionMessageParam[],
      totalTokens: 0,
      totalCost: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata
    };

    // Add the validated message (cast to proper OpenAI type)
    conversation.messages.push(messageValidation.data as ChatCompletionMessageParam);
    
    // Optimize conversation length and recalculate tokens
    conversation.messages = await this.optimizeMessages(conversation.messages, model);
    conversation.totalTokens = countMessageTokens(conversation.messages, model as any);
    
    // Update metadata if provided
    if (metadata) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
    }
    
    await this.saveConversation(sessionId, conversation);
    return conversation;
  }

  /**
   * Enhanced message optimization with intelligent pruning
   */
  private async optimizeMessages(
    messages: ChatCompletionMessageParam[],
    model: string
  ): Promise<ChatCompletionMessageParam[]> {
    // Keep system messages and recent conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // If we're under limits, return all messages
    const currentTokens = countMessageTokens(messages, model as any);
    if (conversationMessages.length <= this.config.maxMessages &&
        currentTokens <= this.config.maxTokens) {
      return messages;
    }

    // Intelligent pruning: keep important messages
    let optimizedConversation: ChatCompletionMessageParam[] = [];
    let tokenCount = countMessageTokens(systemMessages, model as any);

    // Priority order: recent messages, then tool calls, then longer assistant responses
    const prioritizedMessages = conversationMessages
      .map((msg, index) => ({
        message: msg,
        index,
        priority: this.calculateMessagePriority(msg, index, conversationMessages.length)
      }))
      .sort((a, b) => b.priority - a.priority);

    // Add messages by priority until we hit limits
    for (const { message } of prioritizedMessages) {
      const messageTokens = countMessageTokens([message], model as any);
      
      if (tokenCount + messageTokens > this.config.maxTokens * 0.8 ||
          optimizedConversation.length >= this.config.maxMessages) {
        break;
      }
      
      optimizedConversation.push(message);
      tokenCount += messageTokens;
    }

    // Sort back to chronological order
    optimizedConversation.sort((a, b) => {
      const aIndex = conversationMessages.findIndex(msg => 
        msg.role === a.role && msg.content === a.content
      );
      const bIndex = conversationMessages.findIndex(msg => 
        msg.role === b.role && msg.content === b.content
      );
      return aIndex - bIndex;
    });

    return [...systemMessages, ...optimizedConversation];
  }

  /**
   * Calculate message priority for intelligent pruning
   */
  private calculateMessagePriority(
    message: ChatCompletionMessageParam,
    index: number,
    totalMessages: number
  ): number {
    let priority = 0;

    // Recency bonus (more recent = higher priority)
    priority += (index / totalMessages) * 100;

    // Role-based priority
    if (message.role === 'assistant') priority += 30;
    if (message.role === 'tool') priority += 20;
    if (message.role === 'user') priority += 10;

    // Content length bonus (longer responses often more important)
    if (typeof message.content === 'string' && message.content.length > 100) {
      priority += 15;
    }

    // Tool call bonus
    if ('tool_calls' in message && message.tool_calls) {
      priority += 25;
    }

    return priority;
  }

  /**
   * Get comprehensive memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      const [regularKeys, compressedKeys] = await Promise.all([
        this.redis.keys(`${this.keyPrefix}*`),
        this.redis.keys(`${this.keyPrefix}compressed:*`)
      ]);

      const allKeys = [...regularKeys, ...compressedKeys];
      let totalSize = 0;
      let totalMessages = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      let compressedSize = 0;
      let uncompressedSize = 0;

      for (const key of allKeys) {
        try {
          const size = await this.redis.memory('USAGE', key) || 0;
          totalSize += size;

          const data = await this.redis.get(key);
          if (data) {
            const isCompressed = key.includes(':compressed:');
            let conversation: EnhancedConversationMemory;

            if (isCompressed) {
              const decompressed = Buffer.from(data, 'base64').toString('utf8');
              conversation = JSON.parse(decompressed);
              compressedSize += data.length;
              uncompressedSize += decompressed.length;
            } else {
              conversation = JSON.parse(data);
            }

            totalMessages += conversation.messages.length;
            oldestTime = Math.min(oldestTime, new Date(conversation.createdAt).getTime());
            newestTime = Math.max(newestTime, new Date(conversation.updatedAt).getTime());
          }
        } catch (error) {
          console.warn(`[MemoryManager] Error processing key ${key}:`, error);
        }
      }

      return {
        totalConversations: allKeys.length,
        totalMemoryUsage: totalSize,
        averageMessagesPerConversation: allKeys.length > 0 ? totalMessages / allKeys.length : 0,
        oldestConversation: oldestTime,
        newestConversation: newestTime,
        compressionRatio: compressedSize > 0 ? uncompressedSize / compressedSize : 1
      };
    } catch (error) {
      console.error('[MemoryManager] Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        totalMemoryUsage: 0,
        averageMessagesPerConversation: 0,
        oldestConversation: Date.now(),
        newestConversation: Date.now(),
        compressionRatio: 1
      };
    }
  }

  /**
   * Update internal statistics
   */
  private async updateStats(): Promise<void> {
    try {
      const stats = await this.getStats();
      await this.redis.setex(this.statsKey, 300, JSON.stringify(stats)); // Cache for 5 minutes
    } catch (error) {
      console.error('[MemoryManager] Error updating stats:', error);
    }
  }

  /**
   * Start automatic cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        const deleted = await this.cleanup();
        if (deleted > 0) {
          console.log(`[MemoryManager] Automatic cleanup removed ${deleted} conversations`);
        }
      } catch (error) {
        console.error('[MemoryManager] Automatic cleanup failed:', error);
      }
    }, this.config.cleanupInterval * 1000);
  }

  /**
   * Enhanced cleanup with compression and archival
   */
  async cleanup(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      const [regularKeys, compressedKeys] = await Promise.all([
        this.redis.keys(`${this.keyPrefix}*`),
        this.redis.keys(`${this.keyPrefix}compressed:*`)
      ]);

      const allKeys = [...regularKeys, ...compressedKeys];
      let deletedCount = 0;

      for (const key of allKeys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            let conversation: EnhancedConversationMemory;
            
            if (key.includes(':compressed:')) {
              const decompressed = Buffer.from(data, 'base64').toString('utf8');
              conversation = JSON.parse(decompressed);
            } else {
              conversation = JSON.parse(data);
            }

            if (new Date(conversation.updatedAt).getTime() < cutoffTime) {
              await this.redis.del(key);
              deletedCount++;
            }
          }
        } catch (error) {
          console.warn(`[MemoryManager] Error processing key during cleanup ${key}:`, error);
          // Delete corrupted entries
          await this.redis.del(key);
          deletedCount++;
        }
      }

      await this.updateStats();
      return deletedCount;
    } catch (error) {
      console.error('[MemoryManager] Error during conversation cleanup:', error);
      return 0;
    }
  }

  /**
   * Close connections and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    await this.redis.quit();
  }

  /**
   * Health check for the memory manager
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      const stats = await this.getStats();
      
      return {
        healthy: true,
        details: {
          redisLatency: latency,
          totalConversations: stats.totalConversations,
          memoryUsage: stats.totalMemoryUsage,
          compressionRatio: stats.compressionRatio
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: (error as Error).message }
      };
    }
  }
}