/**
 * @package mcp-manager/tests/fixtures/protocol
 * Valid JSON-RPC request fixtures for MCP testing
 */

import { JsonRpcRequest } from './types.js';

export class ValidRequestFixtures {
  /**
   * Generate valid JSON-RPC requests for MCP methods
   */
  static generateValidRequests(): JsonRpcRequest[] {
    return [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: {
              listChanged: true,
            },
            sampling: {},
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'notifications/initialized',
      },
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'ping',
      },
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
      },
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: {
            param1: 'value1',
            param2: 42,
          },
        },
      },
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/list',
      },
      {
        jsonrpc: '2.0',
        id: 7,
        method: 'resources/read',
        params: {
          uri: 'file://test.txt',
        },
      },
      {
        jsonrpc: '2.0',
        id: 8,
        method: 'prompts/list',
      },
      {
        jsonrpc: '2.0',
        id: 9,
        method: 'prompts/get',
        params: {
          name: 'test_prompt',
          arguments: {
            context: 'test context',
          },
        },
      },
      {
        jsonrpc: '2.0',
        id: 10,
        method: 'completion/complete',
        params: {
          ref: {
            type: 'ref',
            name: 'test_completion',
          },
          argument: {
            name: 'query',
            value: 'test query',
          },
        },
      },
    ];
  }
}