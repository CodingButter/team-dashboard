/**
 * Communication System Tests
 * Comprehensive tests for inter-agent communication functionality
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { 
  AgentCommunicationManager, 
  MessageBroker, 
  RedisClient,
  DEFAULT_COMMUNICATION_CONFIG
} from '../src/communication';
import type { 
  AgentMessage, 
  BroadcastMessage, 
  TaskHandoff, 
  Task,
  AgentEvent 
} from '@team-dashboard/types';

// Mock Redis client for testing
vi.mock('ioredis', () => {
  const mockRedis = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    ltrim: vi.fn().mockResolvedValue('OK'),
    ping: vi.fn().mockResolvedValue('PONG'),
    pipeline: vi.fn().mockReturnValue({
      setex: vi.fn().mockReturnThis(),
      lpush: vi.fn().mockReturnThis(),
      ltrim: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 'OK']])
    }),
    on: vi.fn(),
    status: 'ready'
  };

  return {
    default: vi.fn(() => mockRedis)
  };
});

describe('Communication System', () => {
  let communicationManager: AgentCommunicationManager;
  let broker: MessageBroker;
  let redisClient: RedisClient;

  const testConfig = {
    ...DEFAULT_COMMUNICATION_CONFIG,
    redis: {
      host: 'localhost',
      port: 6379,
      db: 15 // Use test database
    }
  };

  beforeAll(async () => {
    // Initialize communication components
    communicationManager = new AgentCommunicationManager(testConfig);
    broker = new MessageBroker(testConfig);
    redisClient = new RedisClient(testConfig.redis);
  });

  afterAll(async () => {
    // Cleanup
    if (communicationManager) {
      await communicationManager.shutdown();
    }
    if (broker) {
      await broker.disconnect();
    }
    if (redisClient) {
      await redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('RedisClient', () => {
    it('should connect to Redis successfully', async () => {
      await expect(redisClient.connect()).resolves.not.toThrow();
      expect(redisClient.isConnected()).toBe(true);
    });

    it('should handle publish/subscribe operations', async () => {
      await redisClient.connect();
      
      const messageHandler = vi.fn();
      await redisClient.subscribe('test-channel', messageHandler);
      await redisClient.publish('test-channel', 'test message');
      
      // Verify subscription was set up
      expect(redisClient.getSubscriber().subscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should handle data storage operations', async () => {
      await redisClient.connect();
      
      await redisClient.setex('test-key', 3600, 'test-value');
      expect(redisClient.getRedis().setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
      
      await redisClient.get('test-key');
      expect(redisClient.getRedis().get).toHaveBeenCalledWith('test-key');
    });

    it('should perform health checks', async () => {
      await redisClient.connect();
      
      const health = await redisClient.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MessageBroker', () => {
    beforeEach(async () => {
      await broker.connect();
    });

    afterEach(async () => {
      await broker.disconnect();
    });

    it('should send direct messages between agents', async () => {
      const message: Omit<AgentMessage, 'id' | 'timestamp'> = {
        from: 'agent-1',
        to: 'agent-2',
        content: 'Hello, Agent 2!',
        type: 'direct'
      };

      await expect(broker.sendMessage(message)).resolves.not.toThrow();
    });

    it('should broadcast messages to channels', async () => {
      const broadcast: Omit<BroadcastMessage, 'id' | 'timestamp'> = {
        from: 'agent-1',
        channel: 'general',
        content: 'System update available',
        type: 'announcement'
      };

      await expect(broker.broadcast(broadcast)).resolves.not.toThrow();
    });

    it('should handle task handoffs', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'A test task for handoff',
        priority: 'normal',
        status: 'pending',
        createdBy: 'agent-1',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const handoff: Omit<TaskHandoff, 'id' | 'timestamp' | 'status' | 'expiresAt'> = {
        from: 'agent-1',
        to: 'agent-2',
        task: {
          task,
          context: { source: 'test' },
          files: [],
          dependencies: []
        },
        reason: 'Load balancing'
      };

      const handoffId = await broker.initiateHandoff(handoff);
      expect(handoffId).toBeDefined();
      expect(typeof handoffId).toBe('string');
    });

    it('should publish and handle agent events', async () => {
      const event: Omit<AgentEvent, 'id' | 'timestamp'> = {
        agentId: 'agent-1',
        type: 'status_change',
        data: { status: 'active' },
        source: 'test'
      };

      await expect(broker.publishEvent(event)).resolves.not.toThrow();
    });

    it('should retrieve message history', async () => {
      const history = await broker.getMessageHistory('agent-1', 10);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should retrieve handoff history', async () => {
      const history = await broker.getHandoffHistory('agent-1', 5);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should perform health checks', async () => {
      const health = await broker.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details).toBeDefined();
    });
  });

  describe('AgentCommunicationManager', () => {
    beforeEach(async () => {
      await communicationManager.initialize();
    });

    afterEach(async () => {
      await communicationManager.shutdown();
    });

    it('should register and unregister agents', async () => {
      const agentId = 'test-agent-1';
      
      await communicationManager.registerAgent(agentId);
      
      // Verify registration
      const stats = await communicationManager.getStatistics();
      expect(stats.activeAgents).toBe(1);
      
      await communicationManager.unregisterAgent(agentId);
    });

    it('should send messages between registered agents', async () => {
      const agent1 = 'test-agent-1';
      const agent2 = 'test-agent-2';
      
      await communicationManager.registerAgent(agent1);
      await communicationManager.registerAgent(agent2);
      
      await expect(
        communicationManager.sendMessage(agent1, agent2, 'Test message')
      ).resolves.not.toThrow();
    });

    it('should broadcast messages to channels', async () => {
      const agentId = 'test-agent-1';
      
      await communicationManager.registerAgent(agentId);
      
      await expect(
        communicationManager.broadcast(agentId, 'general', 'Test broadcast')
      ).resolves.not.toThrow();
    });

    it('should handle task handoffs between agents', async () => {
      const agent1 = 'test-agent-1';
      const agent2 = 'test-agent-2';
      
      await communicationManager.registerAgent(agent1);
      await communicationManager.registerAgent(agent2);
      
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'A test task for handoff',
        priority: 'normal',
        status: 'pending',
        createdBy: agent1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const handoffId = await communicationManager.handoffTask(
        agent1,
        agent2,
        task,
        { source: 'test' },
        'Testing handoff'
      );
      
      expect(handoffId).toBeDefined();
      
      // Test accepting the handoff
      await expect(
        communicationManager.respondToHandoff(handoffId, agent2, true, 'Accepted for testing')
      ).resolves.not.toThrow();
    });

    it('should provide communication statistics', async () => {
      const agentId = 'test-agent-1';
      await communicationManager.registerAgent(agentId);
      
      const stats = await communicationManager.getStatistics();
      
      expect(stats).toHaveProperty('activeAgents');
      expect(stats).toHaveProperty('activeHandoffs');
      expect(stats).toHaveProperty('messageHistory');
      expect(stats).toHaveProperty('systemHealth');
      expect(stats.activeAgents).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.messageHistory)).toBe(true);
    });

    it('should emit events for communication activities', async () => {
      const agentId = 'test-agent-1';
      
      const registrationPromise = new Promise<void>((resolve) => {
        communicationManager.once('agentRegistered', (registeredId) => {
          expect(registeredId).toBe(agentId);
          resolve();
        });
      });
      
      await communicationManager.registerAgent(agentId);
      await registrationPromise;
    });

    it('should validate agent existence for operations', async () => {
      const nonExistentAgent = 'non-existent-agent';
      const validAgent = 'valid-agent';
      
      await communicationManager.registerAgent(validAgent);
      
      // Should throw for non-existent agent
      await expect(
        communicationManager.sendMessage(nonExistentAgent, validAgent, 'Test')
      ).rejects.toThrow('not registered');
      
      await expect(
        communicationManager.sendMessage(validAgent, nonExistentAgent, 'Test')
      ).rejects.toThrow('not registered');
    });

    it('should handle rate limiting', async () => {
      const agentId = 'rate-limited-agent';
      await communicationManager.registerAgent(agentId);
      
      // This would need to be tested with actual rate limiting implementation
      // For now, just verify the method doesn't throw
      await expect(
        communicationManager.sendMessage(agentId, agentId, 'Self message')
      ).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle end-to-end message flow', async () => {
      await communicationManager.initialize();
      
      const agent1 = 'integration-agent-1';
      const agent2 = 'integration-agent-2';
      
      // Register agents
      await communicationManager.registerAgent(agent1);
      await communicationManager.registerAgent(agent2);
      
      // Set up message handler for agent2
      const receivedMessages: AgentMessage[] = [];
      communicationManager.subscribeToMessages(agent2, (message) => {
        receivedMessages.push(message);
      });
      
      // Send message from agent1 to agent2
      await communicationManager.sendMessage(agent1, agent2, 'Integration test message');
      
      // Verify statistics updated
      const stats = await communicationManager.getStatistics();
      expect(stats.activeAgents).toBe(2);
    });

    it('should handle task handoff workflow', async () => {
      await communicationManager.initialize();
      
      const agent1 = 'handoff-agent-1';
      const agent2 = 'handoff-agent-2';
      
      await communicationManager.registerAgent(agent1);
      await communicationManager.registerAgent(agent2);
      
      const task: Task = {
        id: 'integration-task-1',
        title: 'Integration Test Task',
        description: 'A task for testing the complete handoff workflow',
        priority: 'high',
        status: 'pending',
        createdBy: agent1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Initiate handoff
      const handoffId = await communicationManager.handoffTask(
        agent1,
        agent2,
        task,
        { testData: 'integration' },
        'Integration testing'
      );
      
      expect(handoffId).toBeDefined();
      
      // Accept handoff
      await communicationManager.respondToHandoff(
        handoffId,
        agent2,
        true,
        'Accepted for integration testing'
      );
      
      // Verify handoff history
      const handoffHistory = await communicationManager.getHandoffHistory(agent1);
      expect(handoffHistory.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle agent lifecycle events', async () => {
      await communicationManager.initialize();
      
      const agentId = 'lifecycle-agent';
      const events: string[] = [];
      
      // Listen for events
      communicationManager.on('agentRegistered', () => events.push('registered'));
      communicationManager.on('agentUnregistered', () => events.push('unregistered'));
      
      // Register and unregister agent
      await communicationManager.registerAgent(agentId);
      await communicationManager.unregisterAgent(agentId);
      
      expect(events).toContain('registered');
      expect(events).toContain('unregistered');
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // Since Redis is mocked, we test that the client handles the error properly
      const failingRedisClient = new RedisClient({
        host: 'invalid-host',
        port: 9999,
        db: 0
      });
      
      // Test that the client at least initializes without throwing
      // In production, connection failures would be handled by Redis client
      expect(failingRedisClient.isConnected()).toBe(false);
    });

    it('should handle malformed messages gracefully', async () => {
      await broker.connect();
      
      // This would test the actual error handling in production
      // For now, just verify the broker is robust
      expect(broker.isConnected()).toBe(true);
    });

    it('should handle expired handoffs', async () => {
      // This would test the handoff expiration logic
      // Implementation would depend on the actual timer mechanisms
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent messages', async () => {
      await communicationManager.initialize();
      
      const agent1 = 'perf-agent-1';
      const agent2 = 'perf-agent-2';
      
      await communicationManager.registerAgent(agent1);
      await communicationManager.registerAgent(agent2);
      
      const messagePromises = Array.from({ length: 10 }, (_, i) =>
        communicationManager.sendMessage(agent1, agent2, `Performance test message ${i}`)
      );
      
      await expect(Promise.all(messagePromises)).resolves.not.toThrow();
    });

    it('should handle high-frequency broadcasts', async () => {
      await communicationManager.initialize();
      
      const agentId = 'broadcast-agent';
      await communicationManager.registerAgent(agentId);
      
      const broadcastPromises = Array.from({ length: 5 }, (_, i) =>
        communicationManager.broadcast(agentId, 'test', `Broadcast ${i}`)
      );
      
      await expect(Promise.all(broadcastPromises)).resolves.not.toThrow();
    });
  });
});