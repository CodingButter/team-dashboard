/**
 * @package mcp-manager/tests/fixtures/protocol
 * Valid JSON-RPC response fixtures for MCP testing
 */

import { JsonRpcResponse } from './types.js';

export class ValidResponseFixtures {
  /**
   * Generate valid JSON-RPC responses for MCP methods
   */
  static generateValidResponses(): JsonRpcResponse[] {
    return [
      {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            logging: {},
            tools: {
              listChanged: true,
            },
            resources: {
              subscribe: true,
              listChanged: true,
            },
            prompts: {
              listChanged: true,
            },
          },
          serverInfo: {
            name: 'test-server',
            version: '1.0.0',
          },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        result: {},
      },
      {
        jsonrpc: '2.0',
        id: 3,
        result: {},
      },
      {
        jsonrpc: '2.0',
        id: 4,
        result: {
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool for demonstration',
              inputSchema: {
                type: 'object',
                properties: {
                  param1: {
                    type: 'string',
                    description: 'First parameter',
                  },
                  param2: {
                    type: 'number',
                    description: 'Second parameter',
                  },
                },
                required: ['param1'],
              },
            },
            {
              name: 'file_operations',
              description: 'File system operations',
              inputSchema: {
                type: 'object',
                properties: {
                  operation: {
                    type: 'string',
                    enum: ['read', 'write', 'delete'],
                  },
                  path: {
                    type: 'string',
                    description: 'File path',
                  },
                  content: {
                    type: 'string',
                    description: 'Content for write operations',
                  },
                },
                required: ['operation', 'path'],
              },
            },
          ],
        },
      },
      {
        jsonrpc: '2.0',
        id: 5,
        result: {
          content: [
            {
              type: 'text',
              text: 'Tool execution completed successfully',
            },
          ],
          isError: false,
        },
      },
      {
        jsonrpc: '2.0',
        id: 6,
        result: {
          resources: [
            {
              uri: 'file://config.json',
              name: 'Configuration',
              description: 'Application configuration file',
              mimeType: 'application/json',
            },
            {
              uri: 'file://logs/app.log',
              name: 'Application Logs',
              description: 'Recent application logs',
              mimeType: 'text/plain',
            },
          ],
        },
      },
      {
        jsonrpc: '2.0',
        id: 7,
        result: {
          contents: [
            {
              uri: 'file://test.txt',
              mimeType: 'text/plain',
              text: 'This is test file content',
            },
          ],
        },
      },
      {
        jsonrpc: '2.0',
        id: 8,
        result: {
          prompts: [
            {
              name: 'test_prompt',
              description: 'A test prompt for demonstration',
              arguments: [
                {
                  name: 'context',
                  description: 'Context for the prompt',
                  required: true,
                },
                {
                  name: 'style',
                  description: 'Output style preference',
                  required: false,
                },
              ],
            },
          ],
        },
      },
      {
        jsonrpc: '2.0',
        id: 9,
        result: {
          description: 'Generated prompt based on context',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Based on the context: test context, please provide analysis.',
              },
            },
          ],
        },
      },
      {
        jsonrpc: '2.0',
        id: 10,
        result: {
          completion: {
            values: ['test completion 1', 'test completion 2', 'test completion 3'],
            total: 3,
            hasMore: false,
          },
        },
      },
    ];
  }
}