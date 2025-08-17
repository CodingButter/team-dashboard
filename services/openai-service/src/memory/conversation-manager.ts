import Redis from 'ioredis';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import type { ConversationMemory } from '../types';
import { countMessageTokens } from '../utils/tokens';

export interface ConversationManagerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  ttl: number; // Time to live in seconds
  maxMessages: number;
  maxTokens: number;
}

export class ConversationManager {
  private redis: Redis;
  private config: ConversationManagerConfig;
  private keyPrefix = 'conversation:';

  constructor(config: ConversationManagerConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    this.redis.on('error', (error: Error) => {
      console.error('Redis connection error:', error);
    });
  }

  private getKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  async getConversation(sessionId: string): Promise<ConversationMemory | null> {
    try {
      const data = await this.redis.get(this.getKey(sessionId));
      if (!data) return null;

      const conversation: ConversationMemory = JSON.parse(data);
      
      // Update access time
      conversation.updatedAt = Date.now();
      await this.saveConversation(sessionId, conversation);
      
      return conversation;
    } catch (error) {
      console.error(`Error getting conversation ${sessionId}:`, error);
      return null;
    }
  }

  async saveConversation(sessionId: string, conversation: ConversationMemory): Promise<void> {
    try {
      conversation.updatedAt = Date.now();
      
      const key = this.getKey(sessionId);
      await this.redis.setex(key, this.config.ttl, JSON.stringify(conversation));
    } catch (error) {
      console.error(`Error saving conversation ${sessionId}:`, error);
      throw error;
    }
  }

  async addMessage(
    sessionId: string,
    message: ChatCompletionMessageParam,
    model: string
  ): Promise<ConversationMemory> {
    const conversation = await this.getConversation(sessionId) || {
      sessionId,
      messages: [],
      totalTokens: 0,
      totalCost: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    conversation.messages.push(message);
    
    // Optimize conversation length
    conversation.messages = this.optimizeMessages(conversation.messages, model);
    conversation.totalTokens = countMessageTokens(conversation.messages, model as any);
    
    await this.saveConversation(sessionId, conversation);
    return conversation;
  }

  async addMessages(
    sessionId: string,
    messages: ChatCompletionMessageParam[],
    model: string
  ): Promise<ConversationMemory> {
    const conversation = await this.getConversation(sessionId) || {
      sessionId,
      messages: [],
      totalTokens: 0,
      totalCost: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    conversation.messages.push(...messages);
    
    // Optimize conversation length
    conversation.messages = this.optimizeMessages(conversation.messages, model);
    conversation.totalTokens = countMessageTokens(conversation.messages, model as any);
    
    await this.saveConversation(sessionId, conversation);
    return conversation;
  }

  async updateCost(sessionId: string, additionalCost: number): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    if (conversation) {
      conversation.totalCost += additionalCost;
      await this.saveConversation(sessionId, conversation);
    }
  }

  private optimizeMessages(
    messages: ChatCompletionMessageParam[],
    model: string
  ): ChatCompletionMessageParam[] {
    // Keep system messages and recent conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // If we're under limits, return all messages
    if (conversationMessages.length <= this.config.maxMessages &&
        countMessageTokens(messages, model as any) <= this.config.maxTokens) {
      return messages;
    }

    // Keep recent messages within limits
    let optimizedConversation: ChatCompletionMessageParam[] = [];
    let currentTokens = countMessageTokens(systemMessages, model as any);

    // Add messages from most recent, maintaining conversation pairs
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const message = conversationMessages[i];
      const messageTokens = countMessageTokens([message], model as any);
      
      if (currentTokens + messageTokens > this.config.maxTokens * 0.8 ||
          optimizedConversation.length >= this.config.maxMessages) {
        break;
      }
      
      optimizedConversation.unshift(message);
      currentTokens += messageTokens;
    }

    return [...systemMessages, ...optimizedConversation];
  }

  async deleteConversation(sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(sessionId));
    } catch (error) {
      console.error(`Error deleting conversation ${sessionId}:`, error);
      throw error;
    }
  }

  async listConversations(pattern?: string): Promise<string[]> {
    try {
      const searchPattern = pattern ? `${this.keyPrefix}${pattern}*` : `${this.keyPrefix}*`;
      const keys = await this.redis.keys(searchPattern);
      return keys.map(key => key.replace(this.keyPrefix, ''));
    } catch (error) {
      console.error('Error listing conversations:', error);
      return [];
    }
  }

  async getStats(): Promise<{
    totalConversations: number;
    totalMemoryUsage: number; // in bytes
  }> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      let totalSize = 0;

      for (const key of keys) {
        const size = await this.redis.memory('USAGE', key);
        totalSize += size || 0;
      }

      return {
        totalConversations: keys.length,
        totalMemoryUsage: totalSize,
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return { totalConversations: 0, totalMemoryUsage: 0 };
    }
  }

  async cleanup(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      let deletedCount = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const conversation: ConversationMemory = JSON.parse(data);
          if (new Date(conversation.updatedAt).getTime() < cutoffTime) {
            await this.redis.del(key);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error during conversation cleanup:', error);
      return 0;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}