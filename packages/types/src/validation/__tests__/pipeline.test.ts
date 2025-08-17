/**
 * Validation Pipeline Test Suite
 * Comprehensive testing for agent message validation
 * 
 * Maya Rodriguez - Data Processing & CSV Expert
 * P0 Critical Security Implementation Testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ValidationPipeline, DataSanitizer, globalValidationPipeline } from '../pipeline';
import { AgentMessage, BroadcastMessage, TaskHandoff, AgentEvent } from '../../communication';

describe('ValidationPipeline', () => {
  let pipeline: ValidationPipeline;

  beforeEach(() => {
    pipeline = new ValidationPipeline({
      enableMetrics: true,
      sanitizeData: true,
      strictMode: true,
      logLevel: 'none'
    });
  });

  afterEach(() => {
    pipeline.resetMetrics();
  });

  describe('AgentMessage Validation', () => {
    it('should validate correct agent message', async () => {
      const validMessage: AgentMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: 'Hello, agent2!',
        type: 'direct',
        timestamp: Date.now(),
        correlationId: '123e4567-e89b-12d3-a456-426614174001',
        metadata: { priority: 'normal' }
      };

      const result = await pipeline.validate(validMessage, 'AgentMessage');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMessage);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.schema).toBe('AgentMessage');
    });

    it('should reject message with invalid UUID', async () => {
      const invalidMessage = {
        id: 'invalid-uuid',
        from: 'agent1',
        to: 'agent2',
        content: 'Hello, agent2!',
        type: 'direct',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(invalidMessage, 'AgentMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('id');
      expect(result.errors[0].code).toBe('invalid_string');
    });

    it('should reject message from agent to itself', async () => {
      const selfMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent1',
        content: 'Hello, self!',
        type: 'direct',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(selfMessage, 'AgentMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('cannot send message to itself');
    });

    it('should reject message with old timestamp', async () => {
      const oldMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: 'Hello, agent2!',
        type: 'direct',
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago
      };

      const result = await pipeline.validate(oldMessage, 'AgentMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('timestamp is too old');
    });

    it('should sanitize malicious content', async () => {
      const maliciousMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: '<script>alert("XSS")</script>Hello, agent2!',
        type: 'direct',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(maliciousMessage, 'AgentMessage');

      expect(result.success).toBe(true);
      expect(result.data?.content).not.toContain('<script>');
      expect(result.data?.content).toBe('Hello, agent2!');
    });

    it('should reject empty content', async () => {
      const emptyMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: '',
        type: 'direct',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(emptyMessage, 'AgentMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('content');
    });

    it('should reject content that is too long', async () => {
      const longMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: 'a'.repeat(10001), // 10,001 characters
        type: 'direct',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(longMessage, 'AgentMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum length');
    });
  });

  describe('BroadcastMessage Validation', () => {
    it('should validate correct broadcast message', async () => {
      const validBroadcast: BroadcastMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        channel: 'general',
        content: 'System status update',
        type: 'status',
        timestamp: Date.now(),
        metadata: { severity: 'info' }
      };

      const result = await pipeline.validate(validBroadcast, 'BroadcastMessage');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validBroadcast);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid channel name', async () => {
      const invalidBroadcast = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        channel: 'invalid@channel!',
        content: 'System status update',
        type: 'status',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(invalidBroadcast, 'BroadcastMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('channel');
    });

    it('should reject invalid broadcast type', async () => {
      const invalidBroadcast = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        channel: 'general',
        content: 'System status update',
        type: 'invalid_type',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(invalidBroadcast, 'BroadcastMessage');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('type');
    });
  });

  describe('TaskHandoff Validation', () => {
    it('should validate correct task handoff', async () => {
      const validHandoff: TaskHandoff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        task: {
          task: {
            id: 'task1',
            title: 'Test Task',
            description: 'A test task for validation',
            priority: 'normal',
            status: 'pending',
            createdBy: 'agent1',
            createdAt: Date.now() - 1000,
            updatedAt: Date.now()
          },
          context: {},
        },
        reason: 'Passing task to specialist',
        timestamp: Date.now(),
        status: 'pending',
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
      };

      const result = await pipeline.validate(validHandoff, 'TaskHandoff');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validHandoff);
    });

    it('should reject handoff to same agent', async () => {
      const selfHandoff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent1',
        task: {
          task: {
            id: 'task1',
            title: 'Test Task',
            description: 'A test task',
            priority: 'normal',
            status: 'pending',
            createdBy: 'agent1',
            createdAt: Date.now() - 1000,
            updatedAt: Date.now()
          },
          context: {},
        },
        reason: 'Invalid self-handoff',
        timestamp: Date.now(),
        status: 'pending',
        expiresAt: Date.now() + (30 * 60 * 1000)
      };

      const result = await pipeline.validate(selfHandoff, 'TaskHandoff');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Cannot handoff task to the same agent');
    });

    it('should reject handoff with expiration in the past', async () => {
      const expiredHandoff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        task: {
          task: {
            id: 'task1',
            title: 'Test Task',
            description: 'A test task',
            priority: 'normal',
            status: 'pending',
            createdBy: 'agent1',
            createdAt: Date.now() - 1000,
            updatedAt: Date.now()
          },
          context: {},
        },
        reason: 'Expired handoff test',
        timestamp: Date.now(),
        status: 'pending',
        expiresAt: Date.now() - 1000 // Already expired
      };

      const result = await pipeline.validate(expiredHandoff, 'TaskHandoff');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expiration time must be after');
    });

    it('should reject handoff with expiration too far in future', async () => {
      const farFutureHandoff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        task: {
          task: {
            id: 'task1',
            title: 'Test Task',
            description: 'A test task',
            priority: 'normal',
            status: 'pending',
            createdBy: 'agent1',
            createdAt: Date.now() - 1000,
            updatedAt: Date.now()
          },
          context: {},
        },
        reason: 'Far future handoff test',
        timestamp: Date.now(),
        status: 'pending',
        expiresAt: Date.now() + (48 * 60 * 60 * 1000) // 48 hours
      };

      const result = await pipeline.validate(farFutureHandoff, 'TaskHandoff');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('cannot be more than 24 hours');
    });
  });

  describe('AgentEvent Validation', () => {
    it('should validate correct agent event', async () => {
      const validEvent: AgentEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agentId: 'agent1',
        type: 'status_change',
        data: { status: 'active', load: 0.75 },
        timestamp: Date.now(),
        source: 'agent-manager'
      };

      const result = await pipeline.validate(validEvent, 'AgentEvent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validEvent);
    });

    it('should reject invalid event type', async () => {
      const invalidEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agentId: 'agent1',
        type: 'invalid_event_type',
        data: { status: 'active' },
        timestamp: Date.now(),
        source: 'agent-manager'
      };

      const result = await pipeline.validate(invalidEvent, 'AgentEvent');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('type');
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple messages in batch', async () => {
      const messages = [
        {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            from: 'agent1',
            to: 'agent2',
            content: 'Hello',
            type: 'direct',
            timestamp: Date.now()
          },
          schemaType: 'AgentMessage' as const,
          messageId: 'msg1'
        },
        {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            agentId: 'agent1',
            type: 'info',
            data: { message: 'test' },
            timestamp: Date.now(),
            source: 'test'
          },
          schemaType: 'AgentEvent' as const,
          messageId: 'event1'
        }
      ];

      const results = await pipeline.validateBatch(messages);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle mixed success and failure in batch', async () => {
      const messages = [
        {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            from: 'agent1',
            to: 'agent2',
            content: 'Hello',
            type: 'direct',
            timestamp: Date.now()
          },
          schemaType: 'AgentMessage' as const
        },
        {
          data: {
            id: 'invalid-uuid',
            from: 'agent1',
            to: 'agent2',
            content: 'Hello',
            type: 'direct',
            timestamp: Date.now()
          },
          schemaType: 'AgentMessage' as const
        }
      ];

      const results = await pipeline.validateBatch(messages);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track validation metrics', async () => {
      const validMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: 'Hello',
        type: 'direct',
        timestamp: Date.now()
      };

      const invalidMessage = {
        id: 'invalid-uuid',
        from: 'agent1',
        to: 'agent2',
        content: 'Hello',
        type: 'direct',
        timestamp: Date.now()
      };

      await pipeline.validate(validMessage, 'AgentMessage');
      await pipeline.validate(invalidMessage, 'AgentMessage');

      const metrics = pipeline.getMetrics();

      expect(metrics.totalValidations).toBe(2);
      expect(metrics.successRate).toBe(50);
      expect(metrics.errorsByType['invalid_string']).toBe(1);
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    it('should reset metrics correctly', async () => {
      await pipeline.validate({ id: 'invalid' }, 'AgentMessage');
      
      expect(pipeline.getMetrics().totalValidations).toBe(1);
      
      pipeline.resetMetrics();
      
      const metrics = pipeline.getMetrics();
      expect(metrics.totalValidations).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(Object.keys(metrics.errorsByType)).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should complete validation within performance threshold', async () => {
      const message = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        from: 'agent1',
        to: 'agent2',
        content: 'Hello',
        type: 'direct',
        timestamp: Date.now()
      };

      const result = await pipeline.validate(message, 'AgentMessage');

      expect(result.metadata.duration).toBeLessThan(100); // 100ms threshold
    });

    it('should handle large batch validations efficiently', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        data: {
          id: `123e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`,
          from: 'agent1',
          to: 'agent2',
          content: `Message ${i}`,
          type: 'direct' as const,
          timestamp: Date.now()
        },
        schemaType: 'AgentMessage' as const
      }));

      const startTime = performance.now();
      const results = await pipeline.validateBatch(messages);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(1000); // 1 second for 100 messages
    });
  });
});

describe('DataSanitizer', () => {
  describe('sanitizeContent', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello World';
      const sanitized = DataSanitizer.sanitizeContent(malicious);
      expect(sanitized).toBe('Hello World');
    });

    it('should remove javascript protocols', () => {
      const malicious = 'javascript:alert("XSS") Hello World';
      const sanitized = DataSanitizer.sanitizeContent(malicious);
      expect(sanitized).toBe(' Hello World');
    });

    it('should remove on* event handlers', () => {
      const malicious = '<div onclick="alert(\'XSS\')">Hello</div>';
      const sanitized = DataSanitizer.sanitizeContent(malicious);
      expect(sanitized).not.toContain('onclick');
    });

    it('should normalize line endings', () => {
      const mixed = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const sanitized = DataSanitizer.sanitizeContent(mixed);
      expect(sanitized).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });
  });

  describe('sanitizeAgentId', () => {
    it('should remove invalid characters', () => {
      const invalid = 'agent@#$%1';
      const sanitized = DataSanitizer.sanitizeAgentId(invalid);
      expect(sanitized).toBe('agent1');
    });

    it('should convert to lowercase', () => {
      const uppercase = 'AGENT1';
      const sanitized = DataSanitizer.sanitizeAgentId(uppercase);
      expect(sanitized).toBe('agent1');
    });

    it('should preserve valid characters', () => {
      const valid = 'agent-1:test_id.example';
      const sanitized = DataSanitizer.sanitizeAgentId(valid);
      expect(sanitized).toBe('agent-1:test_id.example');
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove directory traversal attempts', () => {
      const malicious = '../../../etc/passwd';
      const sanitized = DataSanitizer.sanitizeFilePath(malicious);
      expect(sanitized).toBe('etc/passwd');
    });

    it('should normalize slashes', () => {
      const messy = '//path///to////file.txt';
      const sanitized = DataSanitizer.sanitizeFilePath(messy);
      expect(sanitized).toBe('path/to/file.txt');
    });

    it('should remove leading slash', () => {
      const absolute = '/path/to/file.txt';
      const sanitized = DataSanitizer.sanitizeFilePath(absolute);
      expect(sanitized).toBe('path/to/file.txt');
    });
  });

  describe('sanitizeMetadata', () => {
    it('should sanitize nested string values', () => {
      const metadata = {
        description: '<script>alert("XSS")</script>Valid text',
        nested: {
          content: 'javascript:void(0) Clean content'
        },
        array: ['<script>bad</script>good', 'clean']
      };

      const sanitized = DataSanitizer.sanitizeMetadata(metadata);

      expect(sanitized.description).toBe('Valid text');
      expect((sanitized.nested as any).content).toBe(' Clean content');
      expect((sanitized.array as string[])[0]).toBe('good');
      expect((sanitized.array as string[])[1]).toBe('clean');
    });

    it('should preserve non-string values', () => {
      const metadata = {
        number: 42,
        boolean: true,
        null_value: null,
        object: { count: 10 }
      };

      const sanitized = DataSanitizer.sanitizeMetadata(metadata);

      expect(sanitized.number).toBe(42);
      expect(sanitized.boolean).toBe(true);
      expect(sanitized.null_value).toBe(null);
      expect((sanitized.object as any).count).toBe(10);
    });
  });
});

describe('Global Validation Pipeline', () => {
  it('should provide global convenience functions', async () => {
    const { validateAgentMessage, validateBroadcastMessage } = await import('../pipeline');

    const message = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      from: 'agent1',
      to: 'agent2',
      content: 'Hello',
      type: 'direct',
      timestamp: Date.now()
    };

    const result = await validateAgentMessage(message);
    expect(result.success).toBe(true);

    const broadcast = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      from: 'agent1',
      channel: 'general',
      content: 'Status update',
      type: 'status',
      timestamp: Date.now()
    };

    const broadcastResult = await validateBroadcastMessage(broadcast);
    expect(broadcastResult.success).toBe(true);
  });
});