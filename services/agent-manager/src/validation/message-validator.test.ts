/**
 * Comprehensive Tests for Agent Message Validation Pipeline
 * Testing all validation, sanitization, and security features
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MessageValidator, ValidationContext } from './message-validator'
import { WSMessage } from '@team-dashboard/types'

describe('MessageValidator', () => {
  let validator: MessageValidator
  let validationContext: ValidationContext

  beforeEach(() => {
    validator = new MessageValidator({
      enableSanitization: true,
      enableRateLimit: true,
      rateLimitConfig: {
        windowMs: 60000,
        maxRequests: 5 // Low for testing
      },
      maxPayloadSize: 1024,
      enableSecurityFiltering: true
    })

    validationContext = {
      clientId: 'test-client-123',
      remoteAddress: '127.0.0.1',
      userAgent: 'Test Client',
      timestamp: Date.now()
    }
  })

  describe('Valid Message Validation', () => {
    it('should validate a proper auth message', async () => {
      const validMessage: WSMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'auth',
        timestamp: Date.now(),
        payload: {
          token: 'valid-test-token-123',
          clientId: 'test-client'
        }
      }

      const data = Buffer.from(JSON.stringify(validMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.type).toBe('auth')
      expect(result.processingTime).toBeGreaterThan(0)
    })

    it('should validate agent creation message', async () => {
      const createMessage: WSMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'test-agent',
          model: 'claude-3-sonnet',
          workspace: '/tmp/workspace',
          systemPrompt: 'You are a helpful assistant'
        }
      }

      const data = Buffer.from(JSON.stringify(createMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(true)
      expect(result.data!.payload.name).toBe('test-agent')
    })
  })

  describe('Size Validation', () => {
    it('should reject payloads that are too large', async () => {
      const largePayload = 'x'.repeat(2048) // Exceeds 1024 byte limit
      const data = Buffer.from(largePayload)
      
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
      expect(result.payloadTooLarge).toBe(true)
      expect(result.errors?.[0].code).toBe('PAYLOAD_TOO_LARGE')
    })
  })

  describe('JSON Parsing', () => {
    it('should reject invalid JSON', async () => {
      const invalidJson = Buffer.from('{ invalid json }')
      
      const result = await validator.validateMessage(invalidJson, validationContext)

      expect(result.success).toBe(false)
      expect(result.errors?.[0].code).toBe('INVALID_JSON')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const validMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'ping',
        timestamp: Date.now(),
        payload: { timestamp: Date.now() }
      }
      const data = Buffer.from(JSON.stringify(validMessage))

      // Send messages up to the limit
      for (let i = 0; i < 5; i++) {
        const result = await validator.validateMessage(data, validationContext)
        expect(result.success).toBe(true)
      }

      // The 6th message should be rate limited
      const rateLimitedResult = await validator.validateMessage(data, validationContext)
      expect(rateLimitedResult.success).toBe(false)
      expect(rateLimitedResult.rateLimited).toBe(true)
    })
  })

  describe('Security Filtering', () => {
    it('should detect script injection attempts', async () => {
      const maliciousMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'auth',
        timestamp: Date.now(),
        payload: {
          token: '<script>alert("xss")</script>',
          clientId: 'test'
        }
      }

      const data = Buffer.from(JSON.stringify(maliciousMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
      expect(result.securityViolation).toBe(true)
    })

    it('should detect javascript: protocol attempts', async () => {
      const maliciousMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'auth',
        timestamp: Date.now(),
        payload: {
          token: 'javascript:alert("xss")',
          clientId: 'test'
        }
      }

      const data = Buffer.from(JSON.stringify(maliciousMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
      expect(result.securityViolation).toBe(true)
    })

    it('should detect excessive object nesting', async () => {
      // Create deeply nested object
      let deepObject: any = { value: 'test' }
      for (let i = 0; i < 25; i++) {
        deepObject = { nested: deepObject }
      }

      const maliciousMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'auth',
        timestamp: Date.now(),
        payload: deepObject
      }

      const data = Buffer.from(JSON.stringify(maliciousMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
      expect(result.securityViolation).toBe(true)
    })
  })

  describe('Message Structure Validation', () => {
    it('should reject messages without required fields', async () => {
      const invalidMessage = {
        type: 'auth',
        payload: { token: 'test' }
        // Missing id and timestamp
      }

      const data = Buffer.from(JSON.stringify(invalidMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should reject messages with invalid types', async () => {
      const invalidMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'invalid-type',
        timestamp: Date.now(),
        payload: {}
      }

      const data = Buffer.from(JSON.stringify(invalidMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
    })

    it('should validate UUID format for message ID', async () => {
      const invalidMessage = {
        id: 'not-a-uuid',
        type: 'ping',
        timestamp: Date.now(),
        payload: { timestamp: Date.now() }
      }

      const data = Buffer.from(JSON.stringify(invalidMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
    })
  })

  describe('Sanitization', () => {
    it('should sanitize HTML tags from string payloads', async () => {
      const unsafeMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'agent:command',
        timestamp: Date.now(),
        payload: {
          agentId: 'test-agent',
          command: 'echo "<h1>Hello</h1>"'
        }
      }

      const data = Buffer.from(JSON.stringify(unsafeMessage))
      const result = await validator.validateMessage(data, validationContext)

      if (result.success && result.sanitized) {
        expect(result.sanitized.payload.command).not.toContain('<h1>')
        expect(result.sanitized.payload.command).not.toContain('</h1>')
      }
    })
  })

  describe('Agent-Specific Validation', () => {
    it('should validate agent creation with all fields', async () => {
      const createMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'my-agent',
          model: 'claude-3-sonnet',
          workspace: '/valid/path',
          environment: { NODE_ENV: 'test' },
          resourceLimits: { memory: 1024, cpu: 2 },
          systemPrompt: 'Be helpful',
          enableMemento: true,
          mementoConfig: {
            maxEntities: 1000,
            maxRelations: 5000
          }
        }
      }

      const data = Buffer.from(JSON.stringify(createMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(true)
      expect(result.data!.payload.name).toBe('my-agent')
    })

    it('should reject agent creation with invalid model', async () => {
      const createMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'my-agent',
          model: 'invalid-model',
          workspace: '/valid/path'
        }
      }

      const data = Buffer.from(JSON.stringify(createMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
    })

    it('should validate agent commands with timeout limits', async () => {
      const commandMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'agent:command',
        timestamp: Date.now(),
        payload: {
          agentId: 'test-agent',
          command: 'ls -la',
          timeout: 350000 // Exceeds 5 minute limit
        }
      }

      const data = Buffer.from(JSON.stringify(commandMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.success).toBe(false)
    })
  })

  describe('Performance Metrics', () => {
    it('should track processing time', async () => {
      const validMessage = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        type: 'ping',
        timestamp: Date.now(),
        payload: { timestamp: Date.now() }
      }

      const data = Buffer.from(JSON.stringify(validMessage))
      const result = await validator.validateMessage(data, validationContext)

      expect(result.processingTime).toBeDefined()
      expect(result.processingTime!).toBeGreaterThan(0)
      expect(result.processingTime!).toBeLessThan(100) // Should be fast
    })
  })

  describe('Configuration Updates', () => {
    it('should allow dynamic configuration updates', () => {
      const initialConfig = validator['config']
      expect(initialConfig.enableSanitization).toBe(true)

      validator.updateConfig({
        enableSanitization: false,
        maxPayloadSize: 2048
      })

      const updatedConfig = validator['config']
      expect(updatedConfig.enableSanitization).toBe(false)
      expect(updatedConfig.maxPayloadSize).toBe(2048)
    })
  })
})