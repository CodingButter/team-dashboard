/**
 * @package mcp-manager/tests/fixtures
 * MCP tools protocol fixtures
 */

import { BaseFixtureFactory } from './base-factory';
import { JsonRpcRequest, JsonRpcResponse, McpTool } from './types';

export class ToolsFixtures extends BaseFixtureFactory {
  /**
   * Generate valid tools requests
   */
  static generateToolsRequests(): JsonRpcRequest[] {
    return [
      this.createRequest('tools/list'),
      this.createRequest('tools/call', {
        name: 'test_tool',
        arguments: {
          param1: 'value1',
          param2: 42
        }
      }),
      this.createRequest('tools/call', {
        name: 'file_operation',
        arguments: {
          action: 'read',
          path: '/test/file.txt'
        }
      })
    ];
  }

  /**
   * Generate sample tool definitions
   */
  static generateToolDefinitions(): McpTool[] {
    return [
      {
        name: 'test_tool',
        description: 'A simple test tool for validation',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
            param2: { type: 'number' }
          },
          required: ['param1']
        }
      },
      {
        name: 'file_operation',
        description: 'Perform file operations',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['read', 'write', 'delete'] },
            path: { type: 'string' }
          },
          required: ['action', 'path']
        }
      },
      {
        name: 'data_processor',
        description: 'Process and transform data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            operation: { type: 'string' },
            format: { type: 'string', default: 'json' }
          },
          required: ['data', 'operation']
        }
      }
    ];
  }

  /**
   * Generate tools responses
   */
  static generateToolsResponses(): JsonRpcResponse[] {
    return [
      this.createResponse(1, {
        tools: this.generateToolDefinitions()
      }),
      this.createResponse(2, {
        content: [
          {
            type: 'text',
            text: 'Tool executed successfully'
          }
        ]
      }),
      this.createResponse(3, {
        content: [
          {
            type: 'text',
            text: 'File contents: Hello, World!'
          }
        ]
      })
    ];
  }

  /**
   * Generate tools error scenarios
   */
  static generateToolsErrors(): JsonRpcResponse[] {
    return [
      this.createErrorResponse(1, -32601, 'Tool not found'),
      this.createErrorResponse(2, -32602, 'Invalid tool parameters'),
      this.createErrorResponse(3, -32000, 'Tool execution failed')
    ];
  }
}