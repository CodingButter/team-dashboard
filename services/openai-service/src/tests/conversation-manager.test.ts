import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConversationManager } from '../memory/conversation-manager';
import type { ConversationManagerConfig } from '../memory/conversation-manager';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

// Mock ioredis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  memory: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => mockRedis)
  };
});

describe('ConversationManager', () => {
  let manager: ConversationManager;
  let config: ConversationManagerConfig;

  beforeEach(() => {
    config = {
      redis: {
        host: 'localhost',
        port: 6379,
      },
      ttl: 3600,
      maxMessages: 100,
      maxTokens: 4000,
    };
    manager = new ConversationManager(config);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await manager.disconnect();
  });

  describe('getConversation', () => {
    it('should return null for non-existent conversation', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await manager.getConversation('test-session');
      expect(result).toBeNull();
    });

    it('should return conversation data', async () => {
      const conversationData = {
        sessionId: 'test-session',
        messages: [{ role: 'user', content: 'Hello' }],
        totalTokens: 10,
        totalCost: 0.001,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(conversationData));
      mockRedis.setex.mockResolvedValue('OK');

      const result = await manager.getConversation('test-session');
      expect(result).toBeDefined();
      expect(result?.sessionId).toBe('test-session');
      expect(result?.messages).toHaveLength(1);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await manager.getConversation('test-session');
      expect(result).toBeNull();
    });
  });

  describe('saveConversation', () => {
    it('should save conversation with TTL', async () => {
      const conversation = {
        sessionId: 'test-session',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.setex.mockResolvedValue('OK');

      await manager.saveConversation('test-session', conversation);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'conversation:test-session',
        config.ttl,
        JSON.stringify(conversation)
      );
    });

    it('should throw error if Redis save fails', async () => {
      const conversation = {
        sessionId: 'test-session',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.setex.mockRejectedValue(new Error('Redis save error'));

      await expect(manager.saveConversation('test-session', conversation))
        .rejects.toThrow('Redis save error');
    });
  });

  describe('addMessage', () => {
    it('should add message to existing conversation', async () => {
      const existingConversation = {
        sessionId: 'test-session',
        messages: [{ role: 'user', content: 'Hello' }],
        totalTokens: 10,
        totalCost: 0.001,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConversation));
      mockRedis.setex.mockResolvedValue('OK');

      const newMessage = { role: 'assistant', content: 'Hi there!' } as const;
      const result = await manager.addMessage('test-session', newMessage, 'gpt-4o');

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual(newMessage);
    });

    it('should create new conversation if none exists', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const message = { role: 'user', content: 'Hello' } as const;
      const result = await manager.addMessage('test-session', message, 'gpt-4o');

      expect(result.sessionId).toBe('test-session');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(message);
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages at once', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ] as ChatCompletionMessageParam[];

      const result = await manager.addMessages('test-session', messages, 'gpt-4o');

      expect(result.messages).toHaveLength(2);
      expect(result.messages).toEqual(messages);
    });
  });

  describe('updateCost', () => {
    it('should update conversation cost', async () => {
      const conversation = {
        sessionId: 'test-session',
        messages: [],
        totalTokens: 0,
        totalCost: 0.001,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(conversation));
      mockRedis.setex.mockResolvedValue('OK');

      await manager.updateCost('test-session', 0.002);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'conversation:test-session',
        config.ttl,
        expect.stringContaining('"totalCost":0.003')
      );
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await manager.deleteConversation('test-session');

      expect(mockRedis.del).toHaveBeenCalledWith('conversation:test-session');
    });
  });

  describe('listConversations', () => {
    it('should list all conversations', async () => {
      mockRedis.keys.mockResolvedValue([
        'conversation:session-1',
        'conversation:session-2'
      ]);

      const result = await manager.listConversations();

      expect(result).toEqual(['session-1', 'session-2']);
    });

    it('should filter conversations by pattern', async () => {
      mockRedis.keys.mockResolvedValue([
        'conversation:user-123-session-1',
        'conversation:user-123-session-2'
      ]);

      const result = await manager.listConversations('user-123');

      expect(result).toEqual(['user-123-session-1', 'user-123-session-2']);
      expect(mockRedis.keys).toHaveBeenCalledWith('conversation:user-123*');
    });
  });

  describe('getStats', () => {
    it('should return conversation statistics', async () => {
      mockRedis.keys.mockResolvedValue([
        'conversation:session-1',
        'conversation:session-2'
      ]);
      mockRedis.memory.mockResolvedValue(1024);

      const result = await manager.getStats();

      expect(result.totalConversations).toBe(2);
      expect(result.totalMemoryUsage).toBe(2048); // 1024 * 2
    });
  });

  describe('cleanup', () => {
    it('should delete old conversations', async () => {
      const oldConversation = {
        sessionId: 'old-session',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        updatedAt: Date.now() - (25 * 60 * 60 * 1000),
      };

      const recentConversation = {
        sessionId: 'recent-session',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.keys.mockResolvedValue([
        'conversation:old-session',
        'conversation:recent-session'
      ]);

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(oldConversation))
        .mockResolvedValueOnce(JSON.stringify(recentConversation));

      mockRedis.del.mockResolvedValue(1);

      const deletedCount = await manager.cleanup(24); // 24 hours

      expect(deletedCount).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('conversation:old-session');
    });
  });
});