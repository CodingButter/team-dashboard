/**
 * @package mcp-manager/tests/fixtures/protocol
 * JSON-RPC validation utilities for MCP testing
 */

export class ValidationFixtures {
  /**
   * Validate JSON-RPC request structure
   */
  static validateRequest(request: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof request !== 'object' || request === null) {
      errors.push('Request must be an object');
      return { valid: false, errors };
    }

    if (request.jsonrpc !== '2.0') {
      errors.push('jsonrpc field must be "2.0"');
    }

    if (!('id' in request) && !this.isNotification(request)) {
      errors.push('id field is required for requests');
    }

    if (!request.method || typeof request.method !== 'string') {
      errors.push('method field must be a non-empty string');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate JSON-RPC response structure
   */
  static validateResponse(response: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof response !== 'object' || response === null) {
      errors.push('Response must be an object');
      return { valid: false, errors };
    }

    if (response.jsonrpc !== '2.0') {
      errors.push('jsonrpc field must be "2.0"');
    }

    if (!('id' in response)) {
      errors.push('id field is required');
    }

    const hasResult = 'result' in response;
    const hasError = 'error' in response;

    if (!hasResult && !hasError) {
      errors.push('Either result or error field must be present');
    }

    if (hasResult && hasError) {
      errors.push('Cannot have both result and error fields');
    }

    if (hasError) {
      const error = response.error;
      if (typeof error !== 'object' || error === null) {
        errors.push('error field must be an object');
      } else {
        if (typeof error.code !== 'number') {
          errors.push('error.code must be a number');
        }
        if (typeof error.message !== 'string') {
          errors.push('error.message must be a string');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if request is a notification (no id field)
   */
  private static isNotification(request: any): boolean {
    return !('id' in request) && typeof request.method === 'string';
  }
}