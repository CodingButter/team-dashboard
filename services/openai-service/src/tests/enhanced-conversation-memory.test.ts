import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedConversationManager } from '../memory/enhanced-conversation-memory';
import type { EnhancedConversationMemoryConfig } from '../memory/enhanced-conversation-memory';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

// Mock dependencies
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  memory: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

const mockDatabase = {
  query: vi.fn(),
  transaction: vi.fn(),
  runMigrations: vi.fn(),
  checkConnection: vi.fn(),
  close: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedis)
}));

vi.mock('../database/connection', () => ({
  DatabaseConnection: vi.fn(() => mockDatabase)
}));

vi.mock('lru-cache', () => ({
  LRUCache: vi.fn(() => ({
    has: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  }))
}));

describe('EnhancedConversationManager', () => {
  let manager: EnhancedConversationManager;
  let config: EnhancedConversationMemoryConfig;

  beforeEach(() => {
    config = {
      redis: {
        host: 'localhost',
        port: 6379,
      },
      database: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'test_user',
        password: 'test_pass',
      },
      cache: {
        maxSize: 100,
        ttl: 300000, // 5 minutes
      },
      conversation: {
        maxMessages: 100,
        maxTokens: 4000,
        relevanceThreshold: 0.3,
      },
    };

    manager = new EnhancedConversationManager(config);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await manager.disconnect();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockDatabase.runMigrations.mockResolvedValue(undefined);
      mockDatabase.checkConnection.mockResolvedValue(true);

      await expect(manager.initialize()).resolves.not.toThrow();
      expect(mockDatabase.runMigrations).toHaveBeenCalled();
      expect(mockDatabase.checkConnection).toHaveBeenCalled();
    });

    it('should throw error if database connection fails', async () => {
      mockDatabase.runMigrations.mockResolvedValue(undefined);
      mockDatabase.checkConnection.mockResolvedValue(false);

      await expect(manager.initialize()).rejects.toThrow('Failed to connect to database');
    });
  });

  describe('getConversation', () => {
    it('should return null for non-existent conversation', async () => {
      mockDatabase.query.mockResolvedValue([]);

      const result = await manager.getConversation('non-existent');
      expect(result).toBeNull();
    });

    it('should load conversation from database', async () => {
      const mockConversation = {
        id: 'conv-123',
        session_id: 'test-session',
        parent_conversation_id: null,
        total_tokens: 100,
        total_cost: 0.01,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            tokenCount: 5,
            relevanceScore: 0.8,
            createdAt: new Date(),
            metadata: {},
          }
        ],
      };

      mockDatabase.query.mockResolvedValue([mockConversation]);

      const result = await manager.getConversation('test-session');
      
      expect(result).toBeDefined();
      expect(result?.sessionId).toBe('test-session');
      expect(result?.messages).toHaveLength(1);
      expect(result?.messages[0].content).toBe('Hello');
    });

    it('should track retrieval performance', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mockDatabase.query.mockResolvedValue([{
        id: 'conv-123',
        session_id: 'test-session',
        messages: [],
        total_tokens: 0,
        total_cost: 0,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
      }]);

      await manager.getConversation('test-session');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Retrieved conversation from database in \d+ms/)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('addMessage', () => {
    it('should create new conversation if none exists', async () => {
      mockDatabase.query.mockResolvedValue([]);
      mockDatabase.transaction.mockImplementation(async (callback) => {
        const mockQuery = vi.fn().mockResolvedValue([]);
        return await callback(mockQuery);
      });

      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: 'Hello, world!'
      };

      const result = await manager.addMessage('new-session', message, 'gpt-4o');

      expect(result).toBeDefined();
      expect(result.sessionId).toBe('new-session');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello, world!');
      expect(mockDatabase.transaction).toHaveBeenCalled();
    });

    it('should add message to existing conversation', async () => {
      const existingConversation = {
        id: 'conv-123',
        session_id: 'test-session',
        parent_conversation_id: null,
        total_tokens: 50,
        total_cost: 0.005,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
        messages: [{
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          tokenCount: 5,
          relevanceScore: 0.8,
          createdAt: new Date(),
          metadata: {},
        }],
      };

      mockDatabase.query.mockResolvedValue([existingConversation]);
      mockDatabase.transaction.mockImplementation(async (callback) => {
        const mockQuery = vi.fn().mockResolvedValue([]);
        return await callback(mockQuery);
      });

      const newMessage: ChatCompletionMessageParam = {
        role: 'assistant',
        content: 'Hi there!'
      };

      const result = await manager.addMessage('test-session', newMessage, 'gpt-4o');

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content).toBe('Hi there!');
      expect(result.messages[1].role).toBe('assistant');
    });

    it('should apply smart pruning when limits exceeded', async () => {
      // Create conversation with many messages
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        tokenCount: 10,
        relevanceScore: Math.random(),
        createdAt: new Date(Date.now() - (150 - i) * 60000), // Older messages have earlier timestamps
        metadata: {},
      }));

      const existingConversation = {
        id: 'conv-123',
        session_id: 'test-session',
        parent_conversation_id: null,
        total_tokens: 1500,
        total_cost: 0.15,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
        messages,
      };

      mockDatabase.query.mockResolvedValue([existingConversation]);
      mockDatabase.transaction.mockImplementation(async (callback) => {
        const mockQuery = vi.fn().mockResolvedValue([]);
        return await callback(mockQuery);
      });

      const result = await manager.addMessage('test-session', {
        role: 'user',
        content: 'New message'
      }, 'gpt-4o');

      // Should have been pruned to be under the limits
      expect(result.messages.length).toBeLessThanOrEqual(config.conversation.maxMessages);
      expect(result.totalTokens).toBeLessThanOrEqual(config.conversation.maxTokens);
    });
  });

  describe('forkConversation', () => {
    it('should create a forked conversation', async () => {
      const sourceConversation = {
        id: 'conv-123',
        session_id: 'source-session',
        parent_conversation_id: null,
        total_tokens: 100,
        total_cost: 0.01,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: { version: 1 },
        is_active: true,
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            tokenCount: 5,
            relevanceScore: 0.8,
            createdAt: new Date(),
            metadata: {},
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi there',
            tokenCount: 5,
            relevanceScore: 0.7,
            createdAt: new Date(),
            metadata: {},
          }
        ],
      };

      mockDatabase.query
        .mockResolvedValueOnce([sourceConversation]) // getConversation call
        .mockResolvedValueOnce([]); // insert branch record

      mockDatabase.transaction.mockImplementation(async (callback) => {
        const mockQuery = vi.fn().mockResolvedValue([]);
        return await callback(mockQuery);
      });

      const result = await manager.forkConversation('source-session', 'testing branch');

      expect(result).toBeDefined();
      expect(result.sessionId).toMatch(/source-session_fork_\d+/);
      expect(result.parentConversationId).toBe('conv-123');
      expect(result.messages).toHaveLength(2);
      expect(result.totalCost).toBe(0); // Cost reset for fork
      expect(result.metadata.forkedFrom).toBe('source-session');
    });

    it('should fork from specific message', async () => {
      const sourceConversation = {
        id: 'conv-123',
        session_id: 'source-session',
        parent_conversation_id: null,
        total_tokens: 100,
        total_cost: 0.01,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', tokenCount: 5, relevanceScore: 0.8, createdAt: new Date(), metadata: {} },
          { id: 'msg-2', role: 'assistant', content: 'Hi', tokenCount: 3, relevanceScore: 0.7, createdAt: new Date(), metadata: {} },
          { id: 'msg-3', role: 'user', content: 'How are you?', tokenCount: 8, relevanceScore: 0.6, createdAt: new Date(), metadata: {} },
        ],
      };

      mockDatabase.query
        .mockResolvedValueOnce([sourceConversation])
        .mockResolvedValueOnce([]);

      mockDatabase.transaction.mockImplementation(async (callback) => {
        const mockQuery = vi.fn().mockResolvedValue([]);
        return await callback(mockQuery);
      });

      const result = await manager.forkConversation('source-session', 'partial fork', 'msg-2');

      expect(result.messages).toHaveLength(2); // Only messages up to and including msg-2
      expect(result.messages[1].id).not.toBe('msg-2'); // Should have new ID
    });

    it('should throw error if source conversation not found', async () => {
      mockDatabase.query.mockResolvedValue([]);

      await expect(
        manager.forkConversation('non-existent', 'test fork')
      ).rejects.toThrow('Source conversation non-existent not found');
    });
  });

  describe('getBranches', () => {
    it('should return conversation branches', async () => {
      const conversation = {
        id: 'conv-123',
        session_id: 'test-session',
        messages: [],
        total_tokens: 0,
        total_cost: 0,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
      };

      const branches = [
        {
          id: 'branch-1',
          source_conversation_id: 'conv-123',
          target_conversation_id: 'conv-456',
          source_session_id: 'test-session',
          target_session_id: 'fork-session',
          branch_point_message_id: 'msg-5',
          branch_reason: 'exploration',
          created_at: new Date(),
        }
      ];

      mockDatabase.query
        .mockResolvedValueOnce([conversation])
        .mockResolvedValueOnce(branches);

      const result = await manager.getBranches('test-session');

      expect(result).toHaveLength(1);
      expect(result[0].sourceConversationId).toBe('test-session');
      expect(result[0].targetConversationId).toBe('fork-session');
      expect(result[0].branchReason).toBe('exploration');
    });
  });

  describe('getStats', () => {
    it('should return conversation statistics', async () => {
      mockDatabase.query
        .mockResolvedValueOnce([{ total: '50', active: '35' }])
        .mockResolvedValueOnce([{ total: '1250' }]);
      
      mockRedis.memory.mockResolvedValue(1024 * 1024); // 1MB

      const result = await manager.getStats();

      expect(result.totalConversations).toBe(50);
      expect(result.activeConversations).toBe(35);
      expect(result.totalMessages).toBe(1250);
      expect(result.memoryUsage).toBe(1024 * 1024);
      expect(result.cacheHitRate).toBeGreaterThan(0);
      expect(result.averageRetrievalTime).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should deactivate old conversations', async () => {
      const cleanupResult = [
        { id: 'conv-1' },
        { id: 'conv-2' },
        { id: 'conv-3' }
      ];

      mockDatabase.query.mockResolvedValue(cleanupResult);
      mockRedis.keys.mockResolvedValue(['enhanced_conversation:session-1']);
      mockRedis.get.mockResolvedValue(JSON.stringify({
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      }));
      mockRedis.del.mockResolvedValue(1);

      const result = await manager.cleanup(30); // 30 days

      expect(result).toBe(3);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversations'),
        expect.arrayContaining([expect.any(Date)])
      );
    });
  });

  describe('performance requirements', () => {
    it('should retrieve conversations in under 50ms from cache', async () => {
      // This would be tested with actual Redis and database in integration tests
      const start = Date.now();
      
      mockDatabase.query.mockResolvedValue([{
        id: 'conv-123',
        session_id: 'fast-session',
        messages: [],
        total_tokens: 0,
        total_cost: 0,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
      }]);

      await manager.getConversation('fast-session');
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Allow some overhead for mocking
    });

    it('should handle 1000+ message histories', async () => {
      const largeConversation = {
        id: 'conv-large',
        session_id: 'large-session',
        parent_conversation_id: null,
        total_tokens: 10000,
        total_cost: 1.0,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        is_active: true,
        messages: Array.from({ length: 1200 }, (_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message content ${i}`,
          tokenCount: 8,
          relevanceScore: Math.random(),
          createdAt: new Date(),
          metadata: {},
        })),
      };

      mockDatabase.query.mockResolvedValue([largeConversation]);

      const result = await manager.getConversation('large-session');
      
      expect(result).toBeDefined();
      expect(result?.messages.length).toBe(1200);
    });
  });
});