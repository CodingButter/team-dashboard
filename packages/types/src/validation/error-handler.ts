/**
 * Validation Error Handler and Recovery System
 * Robust error handling with automated recovery patterns
 * 
 * Maya Rodriguez - Data Processing & CSV Expert
 * P0 Critical Security Implementation
 */

import { ValidationError, ValidationResult } from './pipeline';

// ============================================================================
// Error Handling Types
// ============================================================================

export interface ErrorHandlingStrategy {
  type: 'skip' | 'sanitize' | 'default' | 'reject' | 'retry';
  maxRetries?: number;
  fallbackValue?: unknown;
  customHandler?: (error: ValidationError, data: unknown) => unknown;
}

export interface ErrorRecoveryResult<T = unknown> {
  success: boolean;
  data?: T;
  originalErrors: ValidationError[];
  recoveryActions: RecoveryAction[];
  finalErrors: ValidationError[];
}

export interface RecoveryAction {
  type: 'field_sanitized' | 'field_defaulted' | 'field_skipped' | 'data_rejected';
  field: string;
  originalValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface ErrorPattern {
  field: string;
  errorCode: string;
  frequency: number;
  lastSeen: number;
  recoveryStrategy: ErrorHandlingStrategy;
}

// ============================================================================
// Error Classification
// ============================================================================

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high', 
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ErrorCategory {
  SECURITY = 'security',
  DATA_INTEGRITY = 'data_integrity',
  FORMAT = 'format',
  BUSINESS_RULE = 'business_rule',
  PERFORMANCE = 'performance'
}

export interface ClassifiedError extends ValidationError {
  severity: ErrorSeverity;
  category: ErrorCategory;
  autoRecoverable: boolean;
  securityRisk: boolean;
}

// ============================================================================
// Error Handler Configuration
// ============================================================================

export interface ErrorHandlerConfig {
  defaultStrategy: ErrorHandlingStrategy;
  fieldStrategies: Record<string, ErrorHandlingStrategy>;
  errorCodeStrategies: Record<string, ErrorHandlingStrategy>;
  securityMode: 'strict' | 'moderate' | 'permissive';
  enableAutoRecovery: boolean;
  enableLearning: boolean;
  maxRecoveryAttempts: number;
}

export const DefaultErrorHandlerConfig: ErrorHandlerConfig = {
  defaultStrategy: { type: 'reject' },
  fieldStrategies: {
    'content': { type: 'sanitize' },
    'metadata': { type: 'default', fallbackValue: {} },
    'tags': { type: 'default', fallbackValue: [] },
    'requirements': { type: 'default', fallbackValue: [] }
  },
  errorCodeStrategies: {
    'too_small': { type: 'default' },
    'too_big': { type: 'sanitize' },
    'invalid_type': { type: 'default' },
    'invalid_string': { type: 'sanitize' }
  },
  securityMode: 'strict',
  enableAutoRecovery: true,
  enableLearning: true,
  maxRecoveryAttempts: 3
};

// ============================================================================
// Main Error Handler Class
// ============================================================================

export class ValidationErrorHandler {
  private config: ErrorHandlerConfig;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private recoveryStats: {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    byStrategy: Record<string, number>;
  } = {
    totalAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    byStrategy: {}
  };

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DefaultErrorHandlerConfig, ...config };
  }

  /**
   * Attempt to recover from validation errors
   */
  async attemptRecovery<T>(
    validationResult: ValidationResult<T>,
    originalData: unknown
  ): Promise<ErrorRecoveryResult<T>> {
    if (validationResult.success || !this.config.enableAutoRecovery) {
      return {
        success: validationResult.success,
        data: validationResult.data,
        originalErrors: validationResult.errors,
        recoveryActions: [],
        finalErrors: validationResult.errors
      };
    }

    this.config.maxRecoveryAttempts++;
    const classifiedErrors = this.classifyErrors(validationResult.errors);
    const recoveryActions: RecoveryAction[] = [];
    let recoveredData = JSON.parse(JSON.stringify(originalData));
    let remainingErrors: ValidationError[] = [];

    // Check for critical security errors that cannot be auto-recovered
    const criticalSecurityErrors = classifiedErrors.filter(
      err => err.severity === ErrorSeverity.CRITICAL && err.securityRisk
    );

    if (criticalSecurityErrors.length > 0 && this.config.securityMode === 'strict') {
      return {
        success: false,
        originalErrors: validationResult.errors,
        recoveryActions: [],
        finalErrors: validationResult.errors
      };
    }

    // Attempt recovery for each error
    for (const error of classifiedErrors) {
      if (!error.autoRecoverable && this.config.securityMode === 'strict') {
        remainingErrors.push(error);
        continue;
      }

      const strategy = this.getRecoveryStrategy(error);
      const recoveryResult = await this.applyRecoveryStrategy(
        recoveredData,
        error,
        strategy
      );

      if (recoveryResult.success) {
        recoveredData = recoveryResult.data;
        recoveryActions.push(recoveryResult.action);
        
        // Update success stats
        this.recoveryStats.successfulRecoveries++;
        this.recoveryStats.byStrategy[strategy.type] = 
          (this.recoveryStats.byStrategy[strategy.type] || 0) + 1;
      } else {
        remainingErrors.push(error);
        this.recoveryStats.failedRecoveries++;
      }

      // Learn from recovery patterns if enabled
      if (this.config.enableLearning) {
        this.updateErrorPattern(error, strategy, recoveryResult.success);
      }
    }

    const hasRemainingCriticalErrors = remainingErrors.some(
      err => (err as ClassifiedError).severity === ErrorSeverity.CRITICAL
    );

    return {
      success: !hasRemainingCriticalErrors,
      data: hasRemainingCriticalErrors ? undefined : recoveredData as T,
      originalErrors: validationResult.errors,
      recoveryActions,
      finalErrors: remainingErrors
    };
  }

  /**
   * Classify validation errors by severity and category
   */
  classifyErrors(errors: ValidationError[]): ClassifiedError[] {
    return errors.map(error => {
      const classified: ClassifiedError = {
        ...error,
        severity: this.determineSeverity(error),
        category: this.determineCategory(error),
        autoRecoverable: this.isAutoRecoverable(error),
        securityRisk: this.isSecurityRisk(error)
      };

      return classified;
    });
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    const totalAttempts = this.recoveryStats.totalAttempts;
    return {
      ...this.recoveryStats,
      successRate: totalAttempts > 0 
        ? (this.recoveryStats.successfulRecoveries / totalAttempts) * 100 
        : 0
    };
  }

  /**
   * Get learned error patterns
   */
  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values());
  }

  /**
   * Reset recovery statistics and patterns
   */
  resetStats(): void {
    this.recoveryStats = {
      totalAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      byStrategy: {}
    };
    this.errorPatterns.clear();
  }

  // ============================================================================
  // Private Recovery Methods
  // ============================================================================

  private getRecoveryStrategy(error: ClassifiedError): ErrorHandlingStrategy {
    // Check field-specific strategies first
    if (this.config.fieldStrategies[error.field]) {
      return this.config.fieldStrategies[error.field];
    }

    // Check error code strategies
    if (this.config.errorCodeStrategies[error.code]) {
      return this.config.errorCodeStrategies[error.code];
    }

    // Check learned patterns
    const patternKey = `${error.field}:${error.code}`;
    const pattern = this.errorPatterns.get(patternKey);
    if (pattern) {
      return pattern.recoveryStrategy;
    }

    // Use default strategy
    return this.config.defaultStrategy;
  }

  private async applyRecoveryStrategy(
    data: any,
    error: ClassifiedError,
    strategy: ErrorHandlingStrategy
  ): Promise<{ success: boolean; data?: any; action: RecoveryAction }> {
    const fieldPath = error.field.split('.');
    const originalValue = this.getNestedValue(data, fieldPath);

    try {
      switch (strategy.type) {
        case 'sanitize':
          return this.sanitizeField(data, fieldPath, originalValue, error);

        case 'default':
          return this.applyDefaultValue(data, fieldPath, originalValue, error, strategy);

        case 'skip':
          return this.skipField(data, fieldPath, originalValue, error);

        case 'retry':
          // For retry, we don't modify the data but signal to try validation again
          return {
            success: false,
            action: {
              type: 'field_skipped',
              field: error.field,
              originalValue,
              newValue: originalValue,
              reason: 'Retry strategy - no modification'
            }
          };

        case 'reject':
        default:
          return {
            success: false,
            action: {
              type: 'data_rejected',
              field: error.field,
              originalValue,
              newValue: originalValue,
              reason: 'Recovery strategy rejected modification'
            }
          };
      }
    } catch (recoveryError) {
      return {
        success: false,
        action: {
          type: 'data_rejected',
          field: error.field,
          originalValue,
          newValue: originalValue,
          reason: `Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`
        }
      };
    }
  }

  private sanitizeField(
    data: any,
    fieldPath: string[],
    originalValue: unknown,
    error: ClassifiedError
  ) {
    let sanitizedValue = originalValue;

    if (typeof originalValue === 'string') {
      // Apply string sanitization based on field type
      switch (error.field) {
        case 'content':
          sanitizedValue = this.sanitizeContent(originalValue);
          break;
        case 'from':
        case 'to':
        case 'agentId':
          sanitizedValue = this.sanitizeAgentId(originalValue);
          break;
        default:
          sanitizedValue = this.sanitizeGenericString(originalValue);
      }
    } else if (Array.isArray(originalValue)) {
      sanitizedValue = originalValue.filter(item => item != null);
    }

    this.setNestedValue(data, fieldPath, sanitizedValue);

    return {
      success: true,
      data,
      action: {
        type: 'field_sanitized' as const,
        field: error.field,
        originalValue,
        newValue: sanitizedValue,
        reason: 'Applied field-specific sanitization'
      }
    };
  }

  private applyDefaultValue(
    data: any,
    fieldPath: string[],
    originalValue: unknown,
    error: ClassifiedError,
    strategy: ErrorHandlingStrategy
  ) {
    let defaultValue = strategy.fallbackValue;

    // Determine appropriate default based on field and error
    if (defaultValue === undefined) {
      defaultValue = this.getDefaultValueForField(error.field, error.code);
    }

    this.setNestedValue(data, fieldPath, defaultValue);

    return {
      success: true,
      data,
      action: {
        type: 'field_defaulted' as const,
        field: error.field,
        originalValue,
        newValue: defaultValue,
        reason: 'Applied default value for invalid field'
      }
    };
  }

  private skipField(
    data: any,
    fieldPath: string[],
    originalValue: unknown,
    error: ClassifiedError
  ) {
    this.deleteNestedValue(data, fieldPath);

    return {
      success: true,
      data,
      action: {
        type: 'field_skipped' as const,
        field: error.field,
        originalValue,
        newValue: undefined,
        reason: 'Removed invalid field from data'
      }
    };
  }

  // ============================================================================
  // Error Classification Methods
  // ============================================================================

  private determineSeverity(error: ValidationError): ErrorSeverity {
    // Security-related errors are always critical
    if (this.isSecurityRisk(error)) {
      return ErrorSeverity.CRITICAL;
    }

    // Required field errors are high severity
    if (error.message.includes('required') || error.message.includes('cannot be empty')) {
      return ErrorSeverity.HIGH;
    }

    // Format and size errors are medium
    if (error.code === 'too_big' || error.code === 'too_small' || error.code === 'invalid_string') {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private determineCategory(error: ValidationError): ErrorCategory {
    if (this.isSecurityRisk(error)) {
      return ErrorCategory.SECURITY;
    }

    if (error.code === 'invalid_type' || error.message.includes('required')) {
      return ErrorCategory.DATA_INTEGRITY;
    }

    if (error.code === 'too_big' || error.code === 'too_small') {
      return ErrorCategory.PERFORMANCE;
    }

    if (error.code === 'invalid_string' || error.code === 'invalid_enum_value') {
      return ErrorCategory.FORMAT;
    }

    return ErrorCategory.BUSINESS_RULE;
  }

  private isAutoRecoverable(error: ValidationError): boolean {
    const nonRecoverableErrors = [
      'invalid_uuid',
      'invalid_date',
      'invalid_email'
    ];

    return !nonRecoverableErrors.includes(error.code) && !this.isSecurityRisk(error);
  }

  private isSecurityRisk(error: ValidationError): boolean {
    const securityFields = ['content', 'script', 'html', 'url', 'path'];
    const securityMessages = ['script', 'javascript', 'xss', 'injection', 'malicious'];

    return securityFields.some(field => error.field.includes(field)) ||
           securityMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getNestedValue(obj: any, path: string[]): unknown {
    return path.reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string[], value: unknown): void {
    const lastKey = path.pop()!;
    const target = path.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private deleteNestedValue(obj: any, path: string[]): void {
    const lastKey = path.pop()!;
    const target = path.reduce((current, key) => current?.[key], obj);
    if (target && typeof target === 'object') {
      delete target[lastKey];
    }
  }

  private getDefaultValueForField(field: string, errorCode: string): unknown {
    const defaults: Record<string, unknown> = {
      content: '',
      metadata: {},
      tags: [],
      requirements: [],
      acceptanceCriteria: [],
      priority: 'normal',
      status: 'pending',
      type: 'info'
    };

    return defaults[field] ?? null;
  }

  private sanitizeContent(content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 10000); // Enforce max length
  }

  private sanitizeAgentId(agentId: string): string {
    return agentId
      .replace(/[^\w\-:.]/g, '')
      .toLowerCase()
      .slice(0, 100); // Enforce max length
  }

  private sanitizeGenericString(str: string): string {
    return str.trim().slice(0, 1000); // Generic length limit
  }

  private updateErrorPattern(
    error: ClassifiedError,
    strategy: ErrorHandlingStrategy,
    success: boolean
  ): void {
    const patternKey = `${error.field}:${error.code}`;
    const existing = this.errorPatterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
      if (success) {
        existing.recoveryStrategy = strategy;
      }
    } else {
      this.errorPatterns.set(patternKey, {
        field: error.field,
        errorCode: error.code,
        frequency: 1,
        lastSeen: Date.now(),
        recoveryStrategy: success ? strategy : this.config.defaultStrategy
      });
    }
  }
}

// ============================================================================
// Global Error Handler Instance
// ============================================================================

export const globalErrorHandler = new ValidationErrorHandler();