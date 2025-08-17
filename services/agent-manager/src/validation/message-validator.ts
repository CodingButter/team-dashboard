/**
 * Agent Message Validation Pipeline
 * Comprehensive validation and sanitization for all agent WebSocket messages
 */

import {
  validateWSMessage,
  validateMessageByType,
  ValidationResult,
  ValidationError,
  checkRateLimit,
  RateLimitConfig
} from '@team-dashboard/utils'
import { WSMessage } from '@team-dashboard/types'

export interface ValidationConfig {
  enableSanitization: boolean
  enableRateLimit: boolean
  rateLimitConfig?: RateLimitConfig
  maxPayloadSize: number
  enableSecurityFiltering: boolean
}

export interface ValidationContext {
  clientId: string
  remoteAddress: string
  userAgent?: string
  timestamp: number
}

export interface ExtendedValidationResult<T> extends ValidationResult<T> {
  rateLimited?: boolean
  payloadTooLarge?: boolean
  securityViolation?: boolean
  processingTime?: number
}

/**
 * Enhanced Message Validator with security, performance, and data integrity checks
 */
export class MessageValidator {
  private config: ValidationConfig
  private securityPatterns: RegExp[]

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      enableSanitization: true,
      enableRateLimit: true,
      rateLimitConfig: {
        windowMs: 60000, // 1 minute
        maxRequests: 100  // 100 requests per minute
      },
      maxPayloadSize: 1024 * 1024, // 1MB
      enableSecurityFiltering: true,
      ...config
    }

    // Security patterns to detect potential attacks
    this.securityPatterns = [
      /(?:javascript|vbscript|livescript|mocha):/i,
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi
    ]
  }

  /**
   * Comprehensive validation pipeline for agent messages
   */
  async validateMessage(
    rawData: Buffer,
    context: ValidationContext
  ): Promise<ExtendedValidationResult<WSMessage>> {
    const startTime = performance.now()
    
    try {
      // Step 1: Size validation
      if (rawData.length > this.config.maxPayloadSize) {
        return {
          success: false,
          payloadTooLarge: true,
          errors: [{
            field: 'payload',
            message: `Payload too large: ${rawData.length} bytes (max: ${this.config.maxPayloadSize})`,
            code: 'PAYLOAD_TOO_LARGE'
          }],
          processingTime: performance.now() - startTime
        }
      }

      // Step 2: Parse JSON safely
      let message: unknown
      try {
        const messageStr = rawData.toString('utf8')
        message = JSON.parse(messageStr)
      } catch (parseError) {
        return {
          success: false,
          errors: [{
            field: 'message',
            message: 'Invalid JSON format',
            code: 'INVALID_JSON'
          }],
          processingTime: performance.now() - startTime
        }
      }

      // Step 3: Rate limiting check
      if (this.config.enableRateLimit && this.config.rateLimitConfig) {
        const rateLimitPassed = checkRateLimit(context.clientId, this.config.rateLimitConfig)
        if (!rateLimitPassed) {
          return {
            success: false,
            rateLimited: true,
            errors: [{
              field: 'client',
              message: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED'
            }],
            processingTime: performance.now() - startTime
          }
        }
      }

      // Step 4: Security filtering
      if (this.config.enableSecurityFiltering) {
        const securityCheck = this.checkSecurity(message)
        if (!securityCheck.safe) {
          return {
            success: false,
            securityViolation: true,
            errors: [{
              field: 'payload',
              message: `Security violation detected: ${securityCheck.reason}`,
              code: 'SECURITY_VIOLATION'
            }],
            processingTime: performance.now() - startTime
          }
        }
      }

      // Step 5: Base message structure validation
      const baseValidation = validateWSMessage(message)
      if (!baseValidation.success) {
        return {
          ...baseValidation,
          processingTime: performance.now() - startTime
        }
      }

      // Step 6: Type-specific validation
      const typedValidation = validateMessageByType(baseValidation.data!)
      if (!typedValidation.success) {
        return {
          ...typedValidation,
          processingTime: performance.now() - startTime
        }
      }

      // Step 7: Return validated and optionally sanitized message
      const result: ExtendedValidationResult<WSMessage> = {
        success: true,
        data: typedValidation.data as WSMessage,
        processingTime: performance.now() - startTime
      }

      if (this.config.enableSanitization && typedValidation.sanitized) {
        result.sanitized = typedValidation.sanitized as WSMessage
      }

      return result

    } catch (error) {
      console.error('[MessageValidator] Unexpected validation error:', error)
      return {
        success: false,
        errors: [{
          field: 'system',
          message: 'Internal validation error',
          code: 'VALIDATION_SYSTEM_ERROR'
        }],
        processingTime: performance.now() - startTime
      }
    }
  }

  /**
   * Security check for potential malicious content
   */
  private checkSecurity(message: unknown): { safe: boolean; reason?: string } {
    try {
      const messageStr = JSON.stringify(message)
      
      for (const pattern of this.securityPatterns) {
        if (pattern.test(messageStr)) {
          return {
            safe: false,
            reason: `Detected potential security pattern: ${pattern.source}`
          }
        }
      }

      // Check for excessive nesting (potential DoS)
      if (this.getObjectDepth(message) > 20) {
        return {
          safe: false,
          reason: 'Object nesting too deep (max 20 levels)'
        }
      }

      // Check for circular references
      try {
        JSON.stringify(message)
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
          return {
            safe: false,
            reason: 'Circular reference detected'
          }
        }
      }

      return { safe: true }
    } catch (error) {
      return {
        safe: false,
        reason: 'Security check failed'
      }
    }
  }

  /**
   * Calculate object nesting depth
   */
  private getObjectDepth(obj: any, depth = 0): number {
    if (depth > 20) return depth // Prevent stack overflow
    
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return Math.max(depth, ...obj.map(item => this.getObjectDepth(item, depth + 1)))
      } else {
        return Math.max(depth, ...Object.values(obj).map(value => this.getObjectDepth(value, depth + 1)))
      }
    }
    
    return depth
  }

  /**
   * Get validation metrics for monitoring
   */
  getMetrics(): {
    totalValidations: number
    successRate: number
    averageProcessingTime: number
    rateLimitViolations: number
    securityViolations: number
  } {
    // This would be implemented with proper metrics collection
    // For now, return placeholder values
    return {
      totalValidations: 0,
      successRate: 100,
      averageProcessingTime: 0,
      rateLimitViolations: 0,
      securityViolations: 0
    }
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

/**
 * Default validator instance with secure defaults
 */
export const defaultMessageValidator = new MessageValidator({
  enableSanitization: true,
  enableRateLimit: true,
  rateLimitConfig: {
    windowMs: 60000,    // 1 minute
    maxRequests: 100    // 100 requests per minute
  },
  maxPayloadSize: 1024 * 1024, // 1MB
  enableSecurityFiltering: true
})

/**
 * High-performance validator for trusted internal messages
 */
export const internalMessageValidator = new MessageValidator({
  enableSanitization: false,
  enableRateLimit: false,
  maxPayloadSize: 10 * 1024 * 1024, // 10MB
  enableSecurityFiltering: false
})