/**
 * @package mcp-manager/tests/fixtures/protocol
 * Error response fixtures for MCP testing
 */

import { JsonRpcResponse } from './types.js';

export class ErrorResponseFixtures {
  /**
   * Generate error responses for various scenarios
   */
  static generateErrorResponses(): JsonRpcResponse[] {
    return [
      {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32700,
          message: 'Parse error',
          data: 'Invalid JSON syntax',
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Request is not a valid JSON-RPC request',
        },
      },
      {
        jsonrpc: '2.0',
        id: 3,
        error: {
          code: -32601,
          message: 'Method not found',
          data: 'The requested method does not exist',
        },
      },
      {
        jsonrpc: '2.0',
        id: 4,
        error: {
          code: -32602,
          message: 'Invalid params',
          data: 'Invalid method parameters',
        },
      },
      {
        jsonrpc: '2.0',
        id: 5,
        error: {
          code: -32603,
          message: 'Internal error',
          data: 'An internal server error occurred',
        },
      },
      {
        jsonrpc: '2.0',
        id: 6,
        error: {
          code: -32000,
          message: 'Server error',
          data: 'Tool execution failed',
        },
      },
    ];
  }
}