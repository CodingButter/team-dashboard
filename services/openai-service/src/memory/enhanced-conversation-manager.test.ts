/**
 * Comprehensive Tests for Enhanced Conversation Memory Manager
 * Testing validation, compression, optimization, and performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Redis from 'ioredis'
import { EnhancedConversationManager, type MemoryManagerConfig } from './enhanced-conversation-manager'
import type { ChatCompletionMessageParam } from 'openai/resources/chat'

// Mock Redis for testing
vi.mock('ioredis')

describe('EnhancedConversationManager', () => {
  let manager: EnhancedConversationManager
  let mockRedis: any
  let config: MemoryManagerConfig

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      memory: vi.fn(),
      ping: vi.fn(),
      quit: vi.fn(),
      on: vi.fn()
    }

    // Mock Redis constructor
    ;(Redis as any).mockImplementation(() => mockRedis)

    config = {
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'test'
      },
      ttl: 3600,
      maxMessages: 100,
      maxTokens: 8000,
      maxConversations: 1000,
      compressionThreshold: 20,
      cleanupInterval: 3600
    }

    manager = new EnhancedConversationManager(config)
  })

  afterEach(async () => {
    await manager.disconnect()
    vi.clearAllMocks()
  })

  describe('Conversation Validation', () => {
    it('should validate conversation memory structure', async () => {
      const validConversation = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        totalTokens: 10,
        totalCost: 0.001,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(validConversation))
      
      const result = await manager.getConversation('550e8400-e29b-41d4-a716-446655440000')
      
      expect(result).toBeDefined()
      expect(result!.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result!.messages).toHaveLength(2)
    })

    it('should reject invalid conversation data', async () => {
      const invalidConversation = {
        sessionId: 'invalid-uuid',
        messages: 'not-an-array',
        totalTokens: -5, // negative tokens
        totalCost: 'invalid-cost'
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(invalidConversation))
      
      const result = await manager.getConversation('invalid-session')
      
      expect(result).toBeNull()
    })

    it('should sanitize malicious content in messages', async () => {
      const maliciousMessage: ChatCompletionMessageParam = {
        role: 'user',
        content: 'Hello <script>alert("xss")</script> there!'
      }

      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      mockRedis.get.mockResolvedValue(null) // No existing conversation

      const result = await manager.addMessage(sessionId, maliciousMessage, 'gpt-4o')

      expect(result.messages[0].content).not.toContain('<script>')
      expect(result.messages[0].content).toBe('Hello  there!')
    })

    it('should validate message structure before adding', async () => {
      const invalidMessage = {
        role: 'invalid-role',
        content: 'x'.repeat(60000) // Exceeds 50KB limit
      } as any

      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      await expect(
        manager.addMessage(sessionId, invalidMessage, 'gpt-4o')
      ).rejects.toThrow('Invalid message')
    })
  })

  describe('Message Optimization', () => {
    it('should optimize conversations when approaching limits', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const existingConversation = {
        sessionId,
        messages: Array.from({ length: 95 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i}`
        })),
        totalTokens: 7500,
        totalCost: 0.01,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConversation))

      const newMessage: ChatCompletionMessageParam = {
        role: 'user',
        content: 'This should trigger optimization'
      }

      const result = await manager.addMessage(sessionId, newMessage, 'gpt-4o')

      // Should have optimized the conversation
      expect(result.messages.length).toBeLessThanOrEqual(config.maxMessages)
    })

    it('should prioritize important messages during optimization', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        ...Array.from({ length: 90 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: i === 85 ? 'This is a very important long message that should be preserved during optimization because it contains crucial information.' : `Message ${i}`
        })),
        {
          role: 'assistant',
          content: 'Recent important response',
          tool_calls: [{ id: 'tool1', type: 'function', function: { name: 'test', arguments: '{}' } }]
        }
      ]

      const existingConversation = {
        sessionId,
        messages,
        totalTokens: 7500,
        totalCost: 0.01,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingConversation))

      const newMessage: ChatCompletionMessageParam = {
        role: 'user',
        content: 'New message'
      }

      const result = await manager.addMessage(sessionId, newMessage, 'gpt-4o')

      // System message should always be preserved
      expect(result.messages.find(m => m.role === 'system')).toBeDefined()
      
      // Recent tool call should be preserved (high priority)
      expect(result.messages.find(m => 'tool_calls' in m && m.tool_calls)).toBeDefined()
    })
  })

  describe('Compression', () => {
    it('should compress large conversations', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const largeConversation = {
        sessionId,
        messages: Array.from({ length: 25 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Long message content that will benefit from compression: ${i}`
        })),
        totalTokens: 1000,
        totalCost: 0.01,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await manager.saveConversation(sessionId, largeConversation)

      // Should have saved to compressed key
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('compressed:'),
        expect.any(Number),
        expect.any(String)
      )
    })

    it('should decompress conversations when retrieving', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const conversation = {
        sessionId,
        messages: [{ role: 'user', content: 'Test' }],
        totalTokens: 5,
        totalCost: 0.001,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const compressed = Buffer.from(JSON.stringify(conversation)).toString('base64')
      
      mockRedis.get
        .mockResolvedValueOnce(null) // No uncompressed version
        .mockResolvedValueOnce(compressed) // Compressed version exists

      const result = await manager.getConversation(sessionId)

      expect(result).toBeDefined()
      expect(result!.sessionId).toBe(sessionId)
      expect(result!.messages).toHaveLength(1)
    })
  })

  describe('Memory Statistics', () => {
    it('should calculate comprehensive memory statistics', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['conversation:session1', 'conversation:session2'])
        .mockResolvedValueOnce(['conversation:compressed:session3'])

      mockRedis.memory.mockResolvedValue(1024)

      const conversations = [
        {
          sessionId: 'session1',
          messages: [{ role: 'user', content: 'Test1' }],
          totalTokens: 5,
          totalCost: 0.001,
          createdAt: Date.now() - 7200000, // 2 hours ago
          updatedAt: Date.now() - 3600000   // 1 hour ago
        },
        {
          sessionId: 'session2',
          messages: [{ role: 'user', content: 'Test2' }],
          totalTokens: 8,
          totalCost: 0.002,
          createdAt: Date.now() - 1800000,  // 30 minutes ago
          updatedAt: Date.now()              // now
        }
      ]

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(conversations[0]))
        .mockResolvedValueOnce(JSON.stringify(conversations[1]))
        .mockResolvedValueOnce(Buffer.from(JSON.stringify({
          sessionId: 'session3',
          messages: [{ role: 'user', content: 'Test3' }],
          totalTokens: 10,
          totalCost: 0.003,
          createdAt: Date.now() - 900000,   // 15 minutes ago
          updatedAt: Date.now() - 600000    // 10 minutes ago
        })).toString('base64'))

      const stats = await manager.getStats()

      expect(stats.totalConversations).toBe(3)
      expect(stats.totalMemoryUsage).toBe(3072) // 3 * 1024
      expect(stats.averageMessagesPerConversation).toBe(1)
      expect(stats.compressionRatio).toBeGreaterThan(1)
    })
  })

  describe('Cleanup Operations', () => {
    it('should cleanup old conversations', async () => {
      const oldTime = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const recentTime = Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago

      const keys = ['conversation:old', 'conversation:recent']
      mockRedis.keys
        .mockResolvedValueOnce(keys)
        .mockResolvedValueOnce([])

      const oldConversation = {
        sessionId: 'old',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: oldTime,
        updatedAt: oldTime
      }

      const recentConversation = {
        sessionId: 'recent',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: recentTime,
        updatedAt: recentTime
      }

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(oldConversation))
        .mockResolvedValueOnce(JSON.stringify(recentConversation))

      const deletedCount = await manager.cleanup(24) // 24 hours

      expect(deletedCount).toBe(1)
      expect(mockRedis.del).toHaveBeenCalledWith('conversation:old')
    })

    it('should cleanup corrupted conversation data', async () => {
      const keys = ['conversation:corrupted']
      mockRedis.keys
        .mockResolvedValueOnce(keys)
        .mockResolvedValueOnce([])

      mockRedis.get.mockResolvedValue('invalid-json-data')

      const deletedCount = await manager.cleanup()

      expect(deletedCount).toBe(1)
      expect(mockRedis.del).toHaveBeenCalledWith('conversation:corrupted')
    })
  })

  describe('Health Check', () => {
    it('should return healthy status when Redis is responsive', async () => {
      mockRedis.ping.mockResolvedValue('PONG')
      mockRedis.keys.mockResolvedValue(['conversation:test'])
      mockRedis.memory.mockResolvedValue(1024)
      mockRedis.get.mockResolvedValue(JSON.stringify({
        sessionId: 'test',
        messages: [],
        totalTokens: 0,
        totalCost: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))

      const health = await manager.healthCheck()

      expect(health.healthy).toBe(true)
      expect(health.details.redisLatency).toBeDefined()
      expect(health.details.totalConversations).toBeDefined()
    })

    it('should return unhealthy status when Redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'))

      const health = await manager.healthCheck()

      expect(health.healthy).toBe(false)
      expect(health.details.error).toBe('Redis connection failed')
    })
  })

  describe('Metadata Handling', () => {
    it('should preserve and update conversation metadata', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const metadata = {
        agentId: 'agent-123',
        userId: 'user-456',
        tags: ['important', 'customer-support']
      }

      mockRedis.get.mockResolvedValue(null) // No existing conversation

      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: 'Test message with metadata'
      }

      const result = await manager.addMessage(sessionId, message, 'gpt-4o', metadata)

      expect(result.metadata).toEqual(metadata)
    })
  })

  describe('Performance Monitoring', () => {
    it('should handle large numbers of messages efficiently', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'
      const largeConversation = {
        sessionId,
        messages: Array.from({ length: 500 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i} with content`
        })),
        totalTokens: 5000,
        totalCost: 0.05,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(largeConversation))

      const start = Date.now()
      const result = await manager.getConversation(sessionId)
      const end = Date.now()

      expect(result).toBeDefined()
      expect(end - start).toBeLessThan(100) // Should complete within 100ms
    })
  })
})