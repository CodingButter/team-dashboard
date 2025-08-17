/**
 * Agent Message Validation Middleware
 * Integration layer for validation pipeline in agent manager
 * 
 * Maya Rodriguez - Data Processing & CSV Expert
 * P0 Critical Security Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationPipeline, ValidationErrorHandler, ErrorSeverity } from '@team-dashboard/types';
import { WSMessage, AgentMessage, BroadcastMessage, TaskHandoff } from '@team-dashboard/types';

// ============================================================================
// Middleware Configuration
// ============================================================================

export interface ValidationMiddlewareConfig {
  enableValidation: boolean;
  enableRecovery: boolean;
  strictMode: boolean;
  logValidationErrors: boolean;
  blockOnCriticalErrors: boolean;
  metricsEndpoint?: string;
}

export const DefaultValidationMiddlewareConfig: ValidationMiddlewareConfig = {
  enableValidation: true,
  enableRecovery: true,
  strictMode: true,
  logValidationErrors: true,
  blockOnCriticalErrors: true,
  metricsEndpoint: '/api/validation/metrics'
};

// ============================================================================
// Validation Middleware Class
// ============================================================================

export class ValidationMiddleware {
  private pipeline: ValidationPipeline;
  private errorHandler: ValidationErrorHandler;
  private config: ValidationMiddlewareConfig;

  constructor(config: Partial<ValidationMiddlewareConfig> = {}) {
    this.config = { ...DefaultValidationMiddlewareConfig, ...config };
    
    this.pipeline = new ValidationPipeline({
      enableMetrics: true,
      sanitizeData: true,
      strictMode: this.config.strictMode,
      logLevel: this.config.logValidationErrors ? 'errors' : 'none'
    });

    this.errorHandler = new ValidationErrorHandler({
      securityMode: this.config.strictMode ? 'strict' : 'moderate',
      enableAutoRecovery: this.config.enableRecovery,
      enableLearning: true
    });
  }

  /**
   * Express middleware for WebSocket message validation
   */
  validateWebSocketMessage() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableValidation) {
        return next();
      }

      try {
        const messageData = req.body;
        
        // Validate basic WebSocket message structure
        const result = await this.pipeline.validate(messageData, 'WSMessage');
        
        if (!result.success) {
          if (this.config.enableRecovery) {
            const recoveryResult = await this.errorHandler.attemptRecovery(result, messageData);
            
            if (recoveryResult.success) {
              // Replace request body with recovered data
              req.body = recoveryResult.data;
              req.validationRecovery = recoveryResult;
              return next();
            }
          }

          // Log validation failure
          console.error('WebSocket message validation failed:', {
            errors: result.errors,
            messageType: messageData.type,
            timestamp: new Date().toISOString()
          });

          if (this.config.blockOnCriticalErrors) {
            return res.status(400).json({
              error: 'Message validation failed',
              details: result.errors.map(e => ({
                field: e.field,
                message: e.message
              }))
            });
          }
        }

        // Store validation result for logging/metrics
        req.validationResult = result;
        next();
      } catch (error) {
        console.error('Validation middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Middleware for agent-to-agent communication validation
   */
  validateAgentMessage() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableValidation) {
        return next();
      }

      try {
        const messageData = req.body;
        const messageType = this.determineMessageType(messageData);
        
        if (!messageType) {
          return res.status(400).json({
            error: 'Unable to determine message type for validation'
          });
        }

        const result = await this.pipeline.validate(messageData, messageType);
        
        if (!result.success) {
          // Attempt recovery for non-critical errors
          if (this.config.enableRecovery) {
            const recoveryResult = await this.errorHandler.attemptRecovery(result, messageData);
            
            if (recoveryResult.success) {
              req.body = recoveryResult.data;
              req.validationRecovery = recoveryResult;
              
              // Log successful recovery
              console.info('Message validation recovery successful:', {
                originalErrors: recoveryResult.originalErrors.length,
                recoveryActions: recoveryResult.recoveryActions.length,
                messageType
              });
              
              return next();
            }
          }

          // Check if any errors are critical security risks
          const criticalErrors = result.errors.filter(error => 
            error.message.toLowerCase().includes('script') ||
            error.message.toLowerCase().includes('injection') ||
            error.message.toLowerCase().includes('xss')
          );

          if (criticalErrors.length > 0) {
            console.error('Critical security validation failure:', {
              errors: criticalErrors,
              messageType,
              agentId: messageData.from || messageData.agentId,
              timestamp: new Date().toISOString()
            });

            return res.status(403).json({
              error: 'Message blocked due to security violations',
              details: criticalErrors.map(e => e.message)
            });
          }

          // Non-critical errors - log and optionally block
          console.warn('Message validation failed:', {
            errors: result.errors,
            messageType,
            agentId: messageData.from || messageData.agentId
          });

          if (this.config.blockOnCriticalErrors) {
            return res.status(400).json({
              error: 'Message validation failed',
              details: result.errors.map(e => ({
                field: e.field,
                message: e.message,
                severity: e.severity
              }))
            });
          }
        }

        req.validationResult = result;
        next();
      } catch (error) {
        console.error('Agent message validation middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Middleware for task handoff validation
   */
  validateTaskHandoff() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableValidation) {
        return next();
      }

      try {
        const handoffData = req.body;
        
        const result = await this.pipeline.validate(handoffData, 'TaskHandoff');
        
        if (!result.success) {
          console.error('Task handoff validation failed:', {
            errors: result.errors,
            from: handoffData.from,
            to: handoffData.to,
            taskId: handoffData.task?.task?.id
          });

          // Task handoffs are critical - don't allow invalid ones
          return res.status(400).json({
            error: 'Task handoff validation failed',
            details: result.errors.map(e => ({
              field: e.field,
              message: e.message
            }))
          });
        }

        req.validationResult = result;
        next();
      } catch (error) {
        console.error('Task handoff validation middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Metrics endpoint for validation statistics
   */
  getMetricsHandler() {
    return (req: Request, res: Response) => {
      const validationMetrics = this.pipeline.getMetrics();
      const recoveryStats = this.errorHandler.getRecoveryStats();
      const errorPatterns = this.errorHandler.getErrorPatterns();

      res.json({
        validation: validationMetrics,
        recovery: recoveryStats,
        patterns: errorPatterns,
        config: {
          enableValidation: this.config.enableValidation,
          enableRecovery: this.config.enableRecovery,
          strictMode: this.config.strictMode
        },
        timestamp: new Date().toISOString()
      });
    };
  }

  /**
   * Health check for validation system
   */
  getHealthHandler() {
    return (req: Request, res: Response) => {
      const metrics = this.pipeline.getMetrics();
      const recentErrors = this.pipeline.getRecentErrors(10);
      
      const isHealthy = 
        metrics.successRate >= 95 || // 95% success rate threshold
        metrics.totalValidations < 10; // Not enough data yet

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        validation: {
          totalValidations: metrics.totalValidations,
          successRate: metrics.successRate,
          averageDuration: metrics.averageDuration
        },
        recentErrors: recentErrors.slice(0, 5), // Last 5 errors
        timestamp: new Date().toISOString()
      });
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private determineMessageType(data: any): 'AgentMessage' | 'BroadcastMessage' | 'TaskHandoff' | 'AgentEvent' | null {
    if (data.from && data.to && data.content && !data.task) {
      return 'AgentMessage';
    }
    
    if (data.from && data.channel && data.content) {
      return 'BroadcastMessage';
    }
    
    if (data.from && data.to && data.task && data.reason) {
      return 'TaskHandoff';
    }
    
    if (data.agentId && data.type && data.source) {
      return 'AgentEvent';
    }

    return null;
  }
}

// ============================================================================
// Express Type Extensions
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      validationResult?: any;
      validationRecovery?: any;
    }
  }
}

// ============================================================================
// Factory Function for Easy Setup
// ============================================================================

export function createValidationMiddleware(config?: Partial<ValidationMiddlewareConfig>) {
  return new ValidationMiddleware(config);
}

// ============================================================================
// Pre-configured Middleware Instances
// ============================================================================

export const strictValidationMiddleware = new ValidationMiddleware({
  enableValidation: true,
  enableRecovery: false,
  strictMode: true,
  blockOnCriticalErrors: true
});

export const permissiveValidationMiddleware = new ValidationMiddleware({
  enableValidation: true,
  enableRecovery: true,
  strictMode: false,
  blockOnCriticalErrors: false
});

export const productionValidationMiddleware = new ValidationMiddleware({
  enableValidation: true,
  enableRecovery: true,
  strictMode: true,
  blockOnCriticalErrors: true,
  logValidationErrors: true
});