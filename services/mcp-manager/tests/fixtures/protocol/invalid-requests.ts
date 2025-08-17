/**
 * @package mcp-manager/tests/fixtures/protocol
 * Invalid JSON-RPC request fixtures for error testing
 */

import { JsonRpcError } from './types.js';

export class InvalidRequestFixtures {
  /**
   * Generate invalid JSON-RPC requests for error testing
   */
  static generateInvalidRequests(): Array<{ request: any; expectedError: JsonRpcError }> {
    return [
      {
        request: {
          // Missing jsonrpc field
          id: 1,
          method: 'test',
        },
        expectedError: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Missing jsonrpc field',
        },
      },
      {
        request: {
          jsonrpc: '1.0', // Wrong version
          id: 2,
          method: 'test',
        },
        expectedError: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Unsupported JSON-RPC version',
        },
      },
      {
        request: {
          jsonrpc: '2.0',
          // Missing id field
          method: 'test',
        },
        expectedError: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Missing id field',
        },
      },
      {
        request: {
          jsonrpc: '2.0',
          id: 3,
          // Missing method field
        },
        expectedError: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Missing method field',
        },
      },
      {
        request: {
          jsonrpc: '2.0',
          id: 4,
          method: 'unknown_method',
        },
        expectedError: {
          code: -32601,
          message: 'Method not found',
        },
      },
      {
        request: {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            // Missing required name parameter
            arguments: {},
          },
        },
        expectedError: {
          code: -32602,
          message: 'Invalid params',
          data: 'Missing required parameter: name',
        },
      },
    ];
  }
}