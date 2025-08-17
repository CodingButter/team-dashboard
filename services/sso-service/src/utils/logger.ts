/**
 * Enterprise Logging Utility
 * Winston-based structured logging with compliance features
 */

import winston from 'winston';
import { config } from '../config/index.js';

// Custom log levels for compliance
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    audit: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    audit: 'blue',
    debug: 'gray'
  }
};

// Log format for JSON structured logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
);

// Log format for human-readable text
const textFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.monitoring.logLevel,
  format: config.monitoring.logFormat === 'json' ? jsonFormat : textFormat,
  defaultMeta: {
    service: 'sso-service',
    environment: config.server.environment,
    version: '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      handleExceptions: true,
      handleRejections: true,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Audit log transport (compliance requirement)
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'audit',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 52428800, // 50MB
      maxFiles: 100, // Long retention for compliance
      tailable: true
    })
  ],
  
  // Exit on handled exceptions
  exitOnError: false
});

// Add colors to winston
winston.addColors(customLevels.colors);

// Create specialized audit logger
export const auditLogger = {
  log: (level: string, message: string, meta?: Record<string, any>) => {
    logger.log('audit', message, {
      auditLevel: level,
      compliance: true,
      retention: 'long-term',
      ...meta
    });
  },
  
  authentication: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('authentication', `Authentication event: ${action}`, meta);
  },
  
  authorization: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('authorization', `Authorization event: ${action}`, meta);
  },
  
  session: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('session', `Session event: ${action}`, meta);
  },
  
  configuration: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('configuration', `Configuration event: ${action}`, meta);
  },
  
  security: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('security', `Security event: ${action}`, meta);
  },
  
  compliance: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('compliance', `Compliance event: ${action}`, meta);
  },
  
  dataAccess: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('data_access', `Data access event: ${action}`, meta);
  },
  
  adminAction: (action: string, meta?: Record<string, any>) => {
    auditLogger.log('admin_action', `Admin action: ${action}`, meta);
  }
};

// Performance monitoring logger
export const performanceLogger = {
  timing: (operation: string, duration: number, meta?: Record<string, any>) => {
    logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      performance: true,
      ...meta
    });
  },
  
  slowQuery: (query: string, duration: number, meta?: Record<string, any>) => {
    logger.warn(`Slow query detected: ${query} (${duration}ms)`, {
      query,
      duration,
      performance: true,
      slowQuery: true,
      ...meta
    });
  },
  
  resourceUsage: (resource: string, usage: number, limit: number, meta?: Record<string, any>) => {
    const percentage = (usage / limit) * 100;
    const level = percentage > 90 ? 'error' : percentage > 70 ? 'warn' : 'info';
    
    logger.log(level, `Resource usage: ${resource} at ${percentage.toFixed(2)}%`, {
      resource,
      usage,
      limit,
      percentage,
      performance: true,
      ...meta
    });
  }
};

// Security event logger
export const securityLogger = {
  suspiciousActivity: (activity: string, meta?: Record<string, any>) => {
    logger.warn(`Suspicious activity detected: ${activity}`, {
      security: true,
      suspicious: true,
      activity,
      ...meta
    });
  },
  
  authenticationFailure: (reason: string, meta?: Record<string, any>) => {
    logger.warn(`Authentication failure: ${reason}`, {
      security: true,
      authentication: true,
      failure: true,
      reason,
      ...meta
    });
  },
  
  authorizationFailure: (reason: string, meta?: Record<string, any>) => {
    logger.warn(`Authorization failure: ${reason}`, {
      security: true,
      authorization: true,
      failure: true,
      reason,
      ...meta
    });
  },
  
  rateLimitExceeded: (key: string, meta?: Record<string, any>) => {
    logger.warn(`Rate limit exceeded for key: ${key}`, {
      security: true,
      rateLimit: true,
      key,
      ...meta
    });
  },
  
  invalidToken: (reason: string, meta?: Record<string, any>) => {
    logger.warn(`Invalid token: ${reason}`, {
      security: true,
      token: true,
      invalid: true,
      reason,
      ...meta
    });
  },
  
  securityViolation: (violation: string, meta?: Record<string, any>) => {
    logger.error(`Security violation: ${violation}`, {
      security: true,
      violation: true,
      event: violation,
      ...meta
    });
  }
};

// Error enrichment for better debugging
export const enrichError = (error: Error, context?: Record<string, any>) => {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  };
};

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  // Directory already exists or permission issue
  console.warn('Could not create logs directory:', error);
}

export default logger;