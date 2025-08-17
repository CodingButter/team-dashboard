/**
 * @package mcp-manager/tests/fixtures
 * Base factory for creating MCP protocol fixtures
 */

import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from './types';

export class BaseFixtureFactory {
  private static idCounter = 1;

  /**
   * Create a basic JSON-RPC request
   */
  static createRequest(method: string, params?: any): JsonRpcRequest {
    return {
      jsonrpc: '2.0',
      id: this.idCounter++,
      method,
      params
    };
  }

  /**
   * Create a basic JSON-RPC response
   */
  static createResponse(id: string | number, result?: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  /**
   * Create a JSON-RPC error response
   */
  static createErrorResponse(id: string | number, code: number, message: string, data?: any): JsonRpcResponse {
    const error: JsonRpcError = { code, message, data };
    return {
      jsonrpc: '2.0',
      id,
      error
    };
  }

  /**
   * Reset the ID counter for predictable test results
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }

  /**
   * Generate a series of requests with auto-incrementing IDs
   */
  static createRequestSeries(methodParams: Array<{ method: string; params?: any }>): JsonRpcRequest[] {
    return methodParams.map(({ method, params }) => this.createRequest(method, params));
  }
}