/**
 * Agent Message Validation Pipeline - Public API
 * Comprehensive data validation system for agent communications
 * 
 * Maya Rodriguez - Data Processing & CSV Expert
 * P0 Critical Security Implementation
 */

// Export validation schemas
export * from './schemas';

// Export validation pipeline
export * from './pipeline';

// Export error handling
export * from './error-handler';

// Export convenience functions
export {
  validateAgentMessage,
  validateBroadcastMessage,
  validateTaskHandoff,
  validateAgentEvent,
  validateWSMessage,
  globalValidationPipeline
} from './pipeline';

export {
  globalErrorHandler
} from './error-handler';

// Re-export for easy access
export type {
  ValidationResult,
  ValidationError,
  ValidationMetrics,
  ValidationPipelineConfig,
  ErrorHandlingStrategy,
  ErrorRecoveryResult,
  ClassifiedError
} from './pipeline';

export {
  ValidationPipeline,
  DataSanitizer
} from './pipeline';

export {
  ValidationErrorHandler,
  ErrorSeverity,
  ErrorCategory
} from './error-handler';