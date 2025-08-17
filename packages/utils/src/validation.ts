import { z } from 'zod'

/**
 * Enhanced Agent Message Validation Pipeline
 * Comprehensive validation for all WebSocket agent messages with security and performance
 */

export const EmailSchema = z.string().email()
export const UrlSchema = z.string().url()
export const UuidSchema = z.string().uuid()

// Enhanced Agent Message Validation Schemas
export const AgentIdSchema = z.string().min(1, 'Agent ID is required')
export const MessageIdSchema = z.string().uuid('Message ID must be a valid UUID')
export const TimestampSchema = z.number().int().positive('Timestamp must be a positive integer')
export const AgentNameSchema = z.string().min(1).max(100, 'Agent name must be 1-100 characters')
export const CommandSchema = z.string().min(1, 'Command cannot be empty')
export const TokenSchema = z.string().min(10, 'Token must be at least 10 characters')

// Message Type Validation
export const MessageTypeSchema = z.enum([
  'auth', 'agent:create', 'agent:command', 'agent:terminate',
  'agent:pause', 'agent:resume', 'subscribe:agent', 'subscribe:metrics',
  'subscribe:logs', 'unsubscribe', 'agent:status', 'agent:output',
  'agent:created', 'agent:error', 'metrics:update', 'system:alert',
  'ack', 'ping', 'pong', 'agent:message', 'agent:broadcast',
  'agent:handoff', 'agent:handoff:accept', 'agent:handoff:reject',
  'agent:handoff:initiated', 'agent:handoff:response',
  'agent:task:request', 'agent:task:response', 'agent:event'
] as const)

// Base WebSocket Message Schema
export const BaseWSMessageSchema = z.object({
  id: MessageIdSchema,
  type: MessageTypeSchema,
  timestamp: TimestampSchema,
  payload: z.unknown(),
  metadata: z.object({
    correlationId: z.string().uuid().optional(),
    agentId: AgentIdSchema.optional(),
    priority: z.enum(['low', 'normal', 'high']).optional()
  }).optional()
})

// Authentication Message Schema
export const AuthMessageSchema = BaseWSMessageSchema.extend({
  type: z.literal('auth'),
  payload: z.object({
    token: TokenSchema,
    clientId: z.string().min(1, 'Client ID is required')
  })
})

// Agent Creation Message Schema
export const CreateAgentMessageSchema = BaseWSMessageSchema.extend({
  type: z.literal('agent:create'),
  payload: z.object({
    name: AgentNameSchema,
    model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku']),
    workspace: z.string().min(1, 'Workspace is required'),
    environment: z.record(z.string()).optional(),
    resourceLimits: z.object({
      memory: z.number().int().positive(),
      cpu: z.number().int().positive()
    }).optional(),
    systemPrompt: z.string().max(10000, 'System prompt too long').optional(),
    enableMemento: z.boolean().optional(),
    mementoConfig: z.object({
      dbPath: z.string().optional(),
      maxEntities: z.number().int().positive().optional(),
      maxRelations: z.number().int().positive().optional()
    }).optional()
  })
})

// Agent Command Message Schema
export const AgentCommandMessageSchema = BaseWSMessageSchema.extend({
  type: z.literal('agent:command'),
  payload: z.object({
    agentId: AgentIdSchema,
    command: CommandSchema,
    interactive: z.boolean().optional(),
    timeout: z.number().int().positive().max(300000).optional() // Max 5 minutes
  })
})

// Agent Termination Message Schema
export const TerminateAgentMessageSchema = BaseWSMessageSchema.extend({
  type: z.literal('agent:terminate'),
  payload: z.object({
    agentId: AgentIdSchema,
    force: z.boolean().optional()
  })
})

/**
 * Validation Error Types
 */
export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
  sanitized?: T
}

/**
 * Enhanced validation functions
 */
export const isValidEmail = (email: string): boolean => {
  return EmailSchema.safeParse(email).success
}

export const isValidUrl = (url: string): boolean => {
  return UrlSchema.safeParse(url).success
}

/**
 * Validate WebSocket Message with comprehensive error reporting
 */
export function validateWSMessage(message: unknown): ValidationResult<any> {
  try {
    const result = BaseWSMessageSchema.safeParse(message)
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        sanitized: sanitizeMessage(result.data)
      }
    }
    
    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: undefined
    }))
    
    return { success: false, errors }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'message',
        message: 'Invalid message format',
        code: 'INVALID_FORMAT'
      }]
    }
  }
}

/**
 * Validate specific message types with type-specific schemas
 */
export function validateMessageByType(message: any): ValidationResult<any> {
  try {
    let schema: z.ZodSchema
    
    switch (message.type) {
      case 'auth':
        schema = AuthMessageSchema
        break
      case 'agent:create':
        schema = CreateAgentMessageSchema
        break
      case 'agent:command':
        schema = AgentCommandMessageSchema
        break
      case 'agent:terminate':
        schema = TerminateAgentMessageSchema
        break
      default:
        return validateWSMessage(message) // Fallback to base validation
    }
    
    const result = schema.safeParse(message)
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        sanitized: sanitizeMessage(result.data)
      }
    }
    
    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: undefined
    }))
    
    return { success: false, errors }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'message',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      }]
    }
  }
}

/**
 * Sanitize message data to prevent XSS and injection attacks
 */
export function sanitizeMessage(message: any): any {
  return {
    ...message,
    payload: sanitizePayload(message.payload)
  }
}

/**
 * Recursively sanitize payload data
 */
function sanitizePayload(payload: any): any {
  if (typeof payload === 'string') {
    return payload
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }
  
  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload)
  }
  
  if (payload && typeof payload === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(payload)) {
      // Sanitize keys as well
      const cleanKey = key.replace(/[<>"']/g, '')
      sanitized[cleanKey] = sanitizePayload(value)
    }
    return sanitized
  }
  
  return payload
}

/**
 * Rate limiting validation
 */
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(clientId: string, config: RateLimitConfig): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(clientId)
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return true
  }
  
  if (entry.count >= config.maxRequests) {
    return false
  }
  
  entry.count++
  return true
}