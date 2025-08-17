/**
 * Data Validation Pipeline for Agent Messages
 * High-performance validation engine with comprehensive error handling
 * 
 * Maya Rodriguez - Data Processing & CSV Expert
 * P0 Critical Security Implementation
 */

import { z } from 'zod';
import { ValidationSchemaMap, ValidationSchemaType } from './schemas';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  metadata: {
    schema: ValidationSchemaType;
    duration: number;
    timestamp: number;
    messageId?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
  context?: Record<string, unknown>;
}

export interface ValidationMetrics {
  totalValidations: number;
  successRate: number;
  averageDuration: number;
  errorsByType: Record<string, number>;
  errorsByField: Record<string, number>;
  recentErrors: ValidationError[];
}

// ============================================================================
// Validation Pipeline Configuration
// ============================================================================

export interface ValidationPipelineConfig {
  enableMetrics: boolean;
  maxErrorHistory: number;
  performanceThreshold: number; // milliseconds
  sanitizeData: boolean;
  strictMode: boolean;
  logLevel: 'none' | 'errors' | 'all';
}

export const DefaultValidationConfig: ValidationPipelineConfig = {
  enableMetrics: true,
  maxErrorHistory: 1000,
  performanceThreshold: 100,
  sanitizeData: true,
  strictMode: true,
  logLevel: 'errors'
};

// ============================================================================
// Data Sanitization Functions
// ============================================================================

export class DataSanitizer {
  /**
   * Sanitize string content to prevent XSS and injection attacks
   */
  static sanitizeContent(content: string): string {
    return content
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove on* event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: protocols (more precise regex)
      .replace(/javascript\s*:\s*/gi, '')
      // Remove data: urls with javascript
      .replace(/data:\s*text\/\w+;.*,/gi, '')
      // Trim excessive whitespace
      .trim()
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * Sanitize agent IDs to ensure they're safe
   */
  static sanitizeAgentId(agentId: string): string {
    return agentId
      .replace(/[^\w\-:.]/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Sanitize file paths to prevent directory traversal
   */
  static sanitizeFilePath(path: string): string {
    return path
      .replace(/\.\./g, '')
      .replace(/\/+/g, '/')
      .replace(/^\//, '')
      .trim();
  }

  /**
   * Sanitize metadata to remove potentially dangerous values
   */
  static sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeContent(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeContent(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// ============================================================================
// Main Validation Pipeline
// ============================================================================

export class ValidationPipeline {
  private config: ValidationPipelineConfig;
  private metrics: ValidationMetrics;
  private errorHistory: ValidationError[] = [];

  constructor(config: Partial<ValidationPipelineConfig> = {}) {
    this.config = { ...DefaultValidationConfig, ...config };
    this.metrics = {
      totalValidations: 0,
      successRate: 0,
      averageDuration: 0,
      errorsByType: {},
      errorsByField: {},
      recentErrors: []
    };
  }

  /**
   * Validate any agent message type
   */
  async validate<T>(
    data: unknown,
    schemaType: ValidationSchemaType,
    messageId?: string
  ): Promise<ValidationResult<T>> {
    const startTime = performance.now();
    const schema = ValidationSchemaMap[schemaType];
    
    if (!schema) {
      throw new Error(`Unknown validation schema type: ${schemaType}`);
    }

    let sanitizedData = data;
    
    // Apply data sanitization if enabled
    if (this.config.sanitizeData) {
      sanitizedData = this.sanitizeInput(data, schemaType);
    }

    // Perform validation
    const result = schema.safeParse(sanitizedData);
    const duration = performance.now() - startTime;

    // Build validation result
    const validationResult: ValidationResult<T> = {
      success: result.success,
      data: result.success ? result.data as T : undefined,
      errors: result.success ? [] : this.formatZodErrors(result.error),
      metadata: {
        schema: schemaType,
        duration,
        timestamp: Date.now(),
        messageId
      }
    };

    // Update metrics if enabled
    if (this.config.enableMetrics) {
      this.updateMetrics(validationResult);
    }

    // Log if configured
    this.logValidation(validationResult);

    // Performance warning
    if (duration > this.config.performanceThreshold) {
      console.warn(`Validation performance warning: ${schemaType} took ${duration.toFixed(2)}ms`);
    }

    return validationResult;
  }

  /**
   * Validate multiple messages in batch
   */
  async validateBatch<T>(
    items: Array<{ data: unknown; schemaType: ValidationSchemaType; messageId?: string }>
  ): Promise<ValidationResult<T>[]> {
    const results = await Promise.all(
      items.map(item => this.validate<T>(item.data, item.schemaType, item.messageId))
    );

    return results;
  }

  /**
   * Validate with custom schema
   */
  async validateWithSchema<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    messageId?: string
  ): Promise<ValidationResult<T>> {
    const startTime = performance.now();
    
    const result = schema.safeParse(data);
    const duration = performance.now() - startTime;

    const validationResult: ValidationResult<T> = {
      success: result.success,
      data: result.success ? result.data : undefined,
      errors: result.success ? [] : this.formatZodErrors(result.error),
      metadata: {
        schema: 'custom' as ValidationSchemaType,
        duration,
        timestamp: Date.now(),
        messageId
      }
    };

    if (this.config.enableMetrics) {
      this.updateMetrics(validationResult);
    }

    return validationResult;
  }

  /**
   * Get validation metrics
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      successRate: 0,
      averageDuration: 0,
      errorsByType: {},
      errorsByField: {},
      recentErrors: []
    };
    this.errorHistory = [];
  }

  /**
   * Get recent validation errors
   */
  getRecentErrors(limit: number = 50): ValidationError[] {
    return this.errorHistory.slice(-limit);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private sanitizeInput(data: unknown, schemaType: ValidationSchemaType): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const cloned = JSON.parse(JSON.stringify(data));

    switch (schemaType) {
      case 'AgentMessage':
      case 'BroadcastMessage':
        if (cloned.content && typeof cloned.content === 'string') {
          cloned.content = DataSanitizer.sanitizeContent(cloned.content);
        }
        if (cloned.from && typeof cloned.from === 'string') {
          cloned.from = DataSanitizer.sanitizeAgentId(cloned.from);
        }
        if (cloned.to && typeof cloned.to === 'string') {
          cloned.to = DataSanitizer.sanitizeAgentId(cloned.to);
        }
        if (cloned.metadata) {
          cloned.metadata = DataSanitizer.sanitizeMetadata(cloned.metadata);
        }
        break;

      case 'TaskHandoff':
      case 'TaskHandoffResponse':
        if (cloned.from && typeof cloned.from === 'string') {
          cloned.from = DataSanitizer.sanitizeAgentId(cloned.from);
        }
        if (cloned.to && typeof cloned.to === 'string') {
          cloned.to = DataSanitizer.sanitizeAgentId(cloned.to);
        }
        if (cloned.reason && typeof cloned.reason === 'string') {
          cloned.reason = DataSanitizer.sanitizeContent(cloned.reason);
        }
        break;

      case 'FileReference':
        if (cloned.path && typeof cloned.path === 'string') {
          cloned.path = DataSanitizer.sanitizeFilePath(cloned.path);
        }
        if (cloned.content && typeof cloned.content === 'string') {
          cloned.content = DataSanitizer.sanitizeContent(cloned.content);
        }
        break;

      default:
        break;
    }

    return cloned;
  }

  private formatZodErrors(error: z.ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      code: err.code,
      severity: 'error' as const,
      context: {
        expected: err.expected,
        received: err.received,
        path: err.path
      }
    }));
  }

  private updateMetrics(result: ValidationResult): void {
    // Calculate success count before incrementing totalValidations
    const previousSuccessCount = (this.metrics.totalValidations) * (this.metrics.successRate / 100);
    
    this.metrics.totalValidations++;
    
    // Update success rate
    const newSuccessCount = result.success ? previousSuccessCount + 1 : previousSuccessCount;
    this.metrics.successRate = (newSuccessCount / this.metrics.totalValidations) * 100;

    // Update average duration
    const totalDuration = this.metrics.averageDuration * (this.metrics.totalValidations - 1);
    this.metrics.averageDuration = (totalDuration + result.metadata.duration) / this.metrics.totalValidations;

    // Update error tracking
    if (!result.success) {
      result.errors.forEach(error => {
        // Track by error code
        this.metrics.errorsByType[error.code] = (this.metrics.errorsByType[error.code] || 0) + 1;
        
        // Track by field
        this.metrics.errorsByField[error.field] = (this.metrics.errorsByField[error.field] || 0) + 1;
        
        // Add to error history
        this.errorHistory.push(error);
      });

      // Trim error history if it exceeds max size
      if (this.errorHistory.length > this.config.maxErrorHistory) {
        this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
      }

      // Update recent errors in metrics
      this.metrics.recentErrors = this.errorHistory.slice(-10);
    }
  }

  private logValidation(result: ValidationResult): void {
    if (this.config.logLevel === 'none') return;

    if (!result.success && this.config.logLevel === 'errors') {
      console.error('Validation failed:', {
        schema: result.metadata.schema,
        messageId: result.metadata.messageId,
        errors: result.errors,
        duration: result.metadata.duration
      });
    } else if (this.config.logLevel === 'all') {
      console.log('Validation result:', {
        success: result.success,
        schema: result.metadata.schema,
        messageId: result.metadata.messageId,
        duration: result.metadata.duration,
        errorCount: result.errors.length
      });
    }
  }
}

// ============================================================================
// Singleton Instance for Global Use
// ============================================================================

export const globalValidationPipeline = new ValidationPipeline();

// ============================================================================
// Convenience Functions
// ============================================================================

export function validateAgentMessage(data: unknown, messageId?: string) {
  return globalValidationPipeline.validate(data, 'AgentMessage', messageId);
}

export function validateBroadcastMessage(data: unknown, messageId?: string) {
  return globalValidationPipeline.validate(data, 'BroadcastMessage', messageId);
}

export function validateTaskHandoff(data: unknown, messageId?: string) {
  return globalValidationPipeline.validate(data, 'TaskHandoff', messageId);
}

export function validateAgentEvent(data: unknown, messageId?: string) {
  return globalValidationPipeline.validate(data, 'AgentEvent', messageId);
}

export function validateWSMessage(data: unknown, messageId?: string) {
  return globalValidationPipeline.validate(data, 'WSMessage', messageId);
}