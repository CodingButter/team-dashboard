/**
 * Error Code Definitions
 * Standardized error codes for consistent error handling
 */

export enum ErrorCode {
  // ============================================================================
  // Authentication & Authorization Errors (1xxx)
  // ============================================================================
  AUTH_FAILED = 1001,
  TOKEN_EXPIRED = 1002,
  INSUFFICIENT_PERMISSIONS = 1003,
  INVALID_CREDENTIALS = 1004,
  MFA_REQUIRED = 1005,
  MFA_INVALID = 1006,
  SESSION_EXPIRED = 1007,
  
  // ============================================================================
  // Agent Management Errors (2xxx)
  // ============================================================================
  AGENT_NOT_FOUND = 2001,
  AGENT_SPAWN_FAILED = 2002,
  AGENT_LIMIT_EXCEEDED = 2003,
  AGENT_COMMAND_TIMEOUT = 2004,
  AGENT_ALREADY_EXISTS = 2005,
  AGENT_NOT_RUNNING = 2006,
  AGENT_RESOURCE_LIMIT = 2007,
  AGENT_WORKSPACE_INVALID = 2008,
  AGENT_EXECUTION_FAILED = 2009,
  AGENT_TERMINATION_FAILED = 2010,
  
  // ============================================================================
  // System & Resource Errors (3xxx)
  // ============================================================================
  RESOURCE_EXHAUSTED = 3001,
  SERVICE_UNAVAILABLE = 3002,
  INTERNAL_ERROR = 3003,
  DATABASE_ERROR = 3004,
  NETWORK_ERROR = 3005,
  FILE_SYSTEM_ERROR = 3006,
  PROCESS_SPAWN_ERROR = 3007,
  
  // ============================================================================
  // Protocol & Communication Errors (4xxx)
  // ============================================================================
  INVALID_MESSAGE = 4001,
  UNSUPPORTED_TYPE = 4002,
  RATE_LIMIT_EXCEEDED = 4003,
  MESSAGE_TOO_LARGE = 4004,
  INVALID_PAYLOAD = 4005,
  SUBSCRIPTION_FAILED = 4006,
  CONNECTION_CLOSED = 4007,
  
  // ============================================================================
  // Validation Errors (5xxx)
  // ============================================================================
  VALIDATION_FAILED = 5001,
  INVALID_INPUT = 5002,
  MISSING_REQUIRED_FIELD = 5003,
  INVALID_FORMAT = 5004,
  VALUE_OUT_OF_RANGE = 5005,
  
  // ============================================================================
  // Neo4j & Graph Errors (6xxx)
  // ============================================================================
  GRAPH_CONNECTION_FAILED = 6001,
  GRAPH_QUERY_FAILED = 6002,
  GRAPH_ENTITY_NOT_FOUND = 6003,
  GRAPH_RELATIONSHIP_EXISTS = 6004,
  GRAPH_CONSTRAINT_VIOLATION = 6005,
  
  // ============================================================================
  // Task & Workflow Errors (7xxx)
  // ============================================================================
  TASK_NOT_FOUND = 7001,
  TASK_ALREADY_RUNNING = 7002,
  TASK_DEPENDENCY_FAILED = 7003,
  TASK_TIMEOUT = 7004,
  WORKFLOW_INVALID = 7005,
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
  requestId?: string;
}

/**
 * Custom error class with error code
 */
export class DashboardError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DashboardError';
  }
  
  toJSON(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: Date.now()
    };
  }
}

/**
 * Error message mapping
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.AUTH_FAILED]: 'Authentication failed',
  [ErrorCode.TOKEN_EXPIRED]: 'Token has expired',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCode.MFA_REQUIRED]: 'Multi-factor authentication required',
  [ErrorCode.MFA_INVALID]: 'Invalid MFA code',
  [ErrorCode.SESSION_EXPIRED]: 'Session has expired',
  
  // Agent Management
  [ErrorCode.AGENT_NOT_FOUND]: 'Agent not found',
  [ErrorCode.AGENT_SPAWN_FAILED]: 'Failed to spawn agent',
  [ErrorCode.AGENT_LIMIT_EXCEEDED]: 'Agent limit exceeded',
  [ErrorCode.AGENT_COMMAND_TIMEOUT]: 'Agent command timed out',
  [ErrorCode.AGENT_ALREADY_EXISTS]: 'Agent already exists',
  [ErrorCode.AGENT_NOT_RUNNING]: 'Agent is not running',
  [ErrorCode.AGENT_RESOURCE_LIMIT]: 'Agent resource limit exceeded',
  [ErrorCode.AGENT_WORKSPACE_INVALID]: 'Invalid workspace path',
  [ErrorCode.AGENT_EXECUTION_FAILED]: 'Agent command execution failed',
  [ErrorCode.AGENT_TERMINATION_FAILED]: 'Agent termination failed',
  
  // System
  [ErrorCode.RESOURCE_EXHAUSTED]: 'System resources exhausted',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCode.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.NETWORK_ERROR]: 'Network error occurred',
  [ErrorCode.FILE_SYSTEM_ERROR]: 'File system operation failed',
  [ErrorCode.PROCESS_SPAWN_ERROR]: 'Failed to spawn process',
  
  // Protocol
  [ErrorCode.INVALID_MESSAGE]: 'Invalid message format',
  [ErrorCode.UNSUPPORTED_TYPE]: 'Unsupported message type',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ErrorCode.MESSAGE_TOO_LARGE]: 'Message size exceeds limit',
  [ErrorCode.INVALID_PAYLOAD]: 'Invalid message payload',
  [ErrorCode.SUBSCRIPTION_FAILED]: 'Subscription failed',
  [ErrorCode.CONNECTION_CLOSED]: 'Connection closed',
  
  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required field',
  [ErrorCode.INVALID_FORMAT]: 'Invalid format',
  [ErrorCode.VALUE_OUT_OF_RANGE]: 'Value out of acceptable range',
  
  // Graph
  [ErrorCode.GRAPH_CONNECTION_FAILED]: 'Failed to connect to graph database',
  [ErrorCode.GRAPH_QUERY_FAILED]: 'Graph query failed',
  [ErrorCode.GRAPH_ENTITY_NOT_FOUND]: 'Graph entity not found',
  [ErrorCode.GRAPH_RELATIONSHIP_EXISTS]: 'Relationship already exists',
  [ErrorCode.GRAPH_CONSTRAINT_VIOLATION]: 'Graph constraint violation',
  
  // Task
  [ErrorCode.TASK_NOT_FOUND]: 'Task not found',
  [ErrorCode.TASK_ALREADY_RUNNING]: 'Task is already running',
  [ErrorCode.TASK_DEPENDENCY_FAILED]: 'Task dependency failed',
  [ErrorCode.TASK_TIMEOUT]: 'Task execution timed out',
  [ErrorCode.WORKFLOW_INVALID]: 'Invalid workflow configuration',
};

/**
 * Helper function to create error response
 */
export function createErrorResponse(
  code: ErrorCode,
  details?: any,
  message?: string
): ErrorResponse {
  return {
    code,
    message: message || ErrorMessages[code] || 'Unknown error',
    details,
    timestamp: Date.now()
  };
}