/**
 * @package mcp-manager/tests/fixtures
 * Error scenario simulation for comprehensive MCP testing
 */

import { ErrorType } from './index';

export interface ErrorScenario {
  type: ErrorType;
  description: string;
  triggerCondition: string;
  expectedBehavior: string;
  simulation: () => Error;
}

export class McpErrorScenarios {
  private static scenarios: Map<ErrorType, ErrorScenario> = new Map([
    [
      'connection_failed',
      {
        type: 'connection_failed',
        description: 'Server fails to establish connection',
        triggerCondition: 'During initial connection attempt',
        expectedBehavior: 'Should retry according to retry policy, then mark as error',
        simulation: () => new Error('ECONNREFUSED: Connection refused'),
      },
    ],
    [
      'timeout',
      {
        type: 'timeout',
        description: 'Request exceeds configured timeout',
        triggerCondition: 'When request takes longer than timeout setting',
        expectedBehavior: 'Should abort request and return timeout error',
        simulation: () => new Error('Request timeout after 30000ms'),
      },
    ],
    [
      'protocol_error',
      {
        type: 'protocol_error',
        description: 'Invalid MCP protocol response',
        triggerCondition: 'When server returns malformed JSON-RPC response',
        expectedBehavior: 'Should parse error gracefully and log protocol violation',
        simulation: () => new Error('Invalid JSON-RPC response: missing id field'),
      },
    ],
    [
      'auth_failed',
      {
        type: 'auth_failed',
        description: 'Authentication credentials are rejected',
        triggerCondition: 'When credentials are invalid or expired',
        expectedBehavior: 'Should return 401/403 error and not retry',
        simulation: () => new Error('Authentication failed: Invalid bearer token'),
      },
    ],
    [
      'resource_exhausted',
      {
        type: 'resource_exhausted',
        description: 'Server has reached resource limits',
        triggerCondition: 'When server CPU/memory/connections are at capacity',
        expectedBehavior: 'Should implement backoff and retry later',
        simulation: () => new Error('Resource exhausted: Too many concurrent connections'),
      },
    ],
    [
      'invalid_request',
      {
        type: 'invalid_request',
        description: 'Request parameters are invalid',
        triggerCondition: 'When request validation fails',
        expectedBehavior: 'Should return validation error without retry',
        simulation: () => new Error('Invalid request: Missing required parameter "name"'),
      },
    ],
    [
      'server_crash',
      {
        type: 'server_crash',
        description: 'Server process crashes unexpectedly',
        triggerCondition: 'During normal operation when server becomes unresponsive',
        expectedBehavior: 'Should detect crash, mark as disconnected, and attempt reconnection',
        simulation: () => new Error('Server process exited with code 139 (SIGSEGV)'),
      },
    ],
  ]);

  /**
   * Get error scenario by type
   */
  static getScenario(type: ErrorType): ErrorScenario | undefined {
    return this.scenarios.get(type);
  }

  /**
   * Get all available error scenarios
   */
  static getAllScenarios(): ErrorScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Simulate a specific error type
   */
  static simulateError(type: ErrorType): Error {
    const scenario = this.scenarios.get(type);
    if (!scenario) {
      throw new Error(`Unknown error type: ${type}`);
    }
    return scenario.simulation();
  }

  /**
   * Generate network-related errors
   */
  static generateNetworkErrors(): ErrorScenario[] {
    return [
      {
        type: 'connection_failed',
        description: 'Network connection refused',
        triggerCondition: 'TCP connection rejected by target',
        expectedBehavior: 'Retry with exponential backoff',
        simulation: () => new Error('ECONNREFUSED'),
      },
      {
        type: 'timeout',
        description: 'Network timeout',
        triggerCondition: 'No response within timeout period',
        expectedBehavior: 'Cancel request and retry',
        simulation: () => new Error('ETIMEDOUT'),
      },
      {
        type: 'connection_failed',
        description: 'DNS resolution failure',
        triggerCondition: 'Cannot resolve hostname',
        expectedBehavior: 'Return DNS error',
        simulation: () => new Error('ENOTFOUND'),
      },
    ];
  }

  /**
   * Generate STDIO transport specific errors
   */
  static generateStdioErrors(): ErrorScenario[] {
    return [
      {
        type: 'server_crash',
        description: 'Child process exits unexpectedly',
        triggerCondition: 'Process terminates with non-zero exit code',
        expectedBehavior: 'Detect exit and mark as crashed',
        simulation: () => new Error('Child process exited with code 1'),
      },
      {
        type: 'connection_failed',
        description: 'Process fails to start',
        triggerCondition: 'Executable not found or permission denied',
        expectedBehavior: 'Return spawn error',
        simulation: () => new Error('ENOENT: no such file or directory'),
      },
      {
        type: 'timeout',
        description: 'Process becomes unresponsive',
        triggerCondition: 'No response to stdin writes',
        expectedBehavior: 'Kill process and restart',
        simulation: () => new Error('Process unresponsive - no output received'),
      },
    ];
  }

  /**
   * Generate HTTP transport specific errors
   */
  static generateHttpErrors(): ErrorScenario[] {
    return [
      {
        type: 'auth_failed',
        description: 'HTTP 401 Unauthorized',
        triggerCondition: 'Invalid or expired authentication',
        expectedBehavior: 'Return auth error without retry',
        simulation: () => new Error('HTTP 401: Unauthorized'),
      },
      {
        type: 'auth_failed',
        description: 'HTTP 403 Forbidden',
        triggerCondition: 'Valid auth but insufficient permissions',
        expectedBehavior: 'Return permission error',
        simulation: () => new Error('HTTP 403: Forbidden'),
      },
      {
        type: 'resource_exhausted',
        description: 'HTTP 429 Too Many Requests',
        triggerCondition: 'Rate limit exceeded',
        expectedBehavior: 'Implement exponential backoff',
        simulation: () => new Error('HTTP 429: Too Many Requests'),
      },
      {
        type: 'protocol_error',
        description: 'HTTP 500 Internal Server Error',
        triggerCondition: 'Server-side error',
        expectedBehavior: 'Retry with backoff',
        simulation: () => new Error('HTTP 500: Internal Server Error'),
      },
    ];
  }

  /**
   * Generate protocol-level errors
   */
  static generateProtocolErrors(): ErrorScenario[] {
    return [
      {
        type: 'protocol_error',
        description: 'Malformed JSON-RPC request',
        triggerCondition: 'Invalid JSON syntax',
        expectedBehavior: 'Return parse error',
        simulation: () => new Error('JSON parse error: Unexpected token'),
      },
      {
        type: 'protocol_error',
        description: 'Missing required JSON-RPC fields',
        triggerCondition: 'Request missing id, method, or params',
        expectedBehavior: 'Return invalid request error',
        simulation: () => new Error('Invalid JSON-RPC: missing method field'),
      },
      {
        type: 'invalid_request',
        description: 'Unknown method called',
        triggerCondition: 'Client calls non-existent method',
        expectedBehavior: 'Return method not found error',
        simulation: () => new Error('Method not found: unknown_method'),
      },
    ];
  }

  /**
   * Generate resource exhaustion scenarios
   */
  static generateResourceExhaustionErrors(): ErrorScenario[] {
    return [
      {
        type: 'resource_exhausted',
        description: 'Memory limit exceeded',
        triggerCondition: 'Server process uses too much memory',
        expectedBehavior: 'Kill process and restart with limits',
        simulation: () => new Error('Process killed: memory limit exceeded (OOM)'),
      },
      {
        type: 'resource_exhausted',
        description: 'CPU limit exceeded',
        triggerCondition: 'Server process uses too much CPU',
        expectedBehavior: 'Throttle or restart process',
        simulation: () => new Error('Process throttled: CPU limit exceeded'),
      },
      {
        type: 'resource_exhausted',
        description: 'File descriptor limit',
        triggerCondition: 'Too many open files/connections',
        expectedBehavior: 'Close idle connections and retry',
        simulation: () => new Error('EMFILE: too many open files'),
      },
      {
        type: 'resource_exhausted',
        description: 'Disk space exhausted',
        triggerCondition: 'No space left on device',
        expectedBehavior: 'Return disk full error',
        simulation: () => new Error('ENOSPC: no space left on device'),
      },
    ];
  }

  /**
   * Create error simulation chain for testing cascading failures
   */
  static createErrorChain(errorTypes: ErrorType[]): ErrorScenario[] {
    return errorTypes.map((type, index) => {
      const baseScenario = this.scenarios.get(type);
      if (!baseScenario) {
        throw new Error(`Unknown error type in chain: ${type}`);
      }

      return {
        ...baseScenario,
        description: `Chain step ${index + 1}: ${baseScenario.description}`,
        triggerCondition: `After previous error: ${baseScenario.triggerCondition}`,
      };
    });
  }

  /**
   * Generate random error for chaos testing
   */
  static generateRandomError(): ErrorScenario {
    const scenarios = Array.from(this.scenarios.values());
    const randomIndex = Math.floor(Math.random() * scenarios.length);
    return scenarios[randomIndex];
  }
}