/**
 * @package mcp-manager/tests/fixtures
 * MCP protocol-specific fixtures for testing JSON-RPC communication
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface McpCapability {
  name: string;
  version: string;
  features?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export class McpProtocolFixtures {
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

  /**
   * Generate notification messages (no response expected)
   */
  static generateNotifications(): Array<Omit<JsonRpcRequest, 'id'>> {
    return [
      {
        jsonrpc: '2.0',
        method: 'notifications/cancelled',
        params: {
          requestId: 123,
          reason: 'User cancelled operation',
        },
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'token_123',
          value: {
            kind: 'report',
            message: 'Processing...',
            percentage: 50,
          },
        },
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/resources/updated',
        params: {
          uri: 'file://config.json',
        },
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed',
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/prompts/list_changed',
      },
    ];
  }

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

  /**
   * Generate batch requests for testing batch processing
   */
  static generateBatchRequests(): JsonRpcRequest[] {
    return [
      {
        jsonrpc: '2.0',
        id: 'batch_1',
        method: 'tools/list',
      },
      {
        jsonrpc: '2.0',
        id: 'batch_2',
        method: 'resources/list',
      },
      {
        jsonrpc: '2.0',
        id: 'batch_3',
        method: 'prompts/list',
      },
      {
        jsonrpc: '2.0',
        id: 'batch_4',
        method: 'ping',
      },
    ];
  }

  /**
   * Generate large request for payload testing
   */
  static generateLargeRequest(): JsonRpcRequest {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `item_${i}`,
      data: 'x'.repeat(100),
      metadata: {
        created: new Date().toISOString(),
        tags: [`tag_${i % 10}`],
      },
    }));

    return {
      jsonrpc: '2.0',
      id: 'large_request',
      method: 'tools/call',
      params: {
        name: 'process_large_dataset',
        arguments: {
          dataset: largeData,
        },
      },
    };
  }

  /**
   * Generate streaming response for testing streaming capabilities
   */
  static generateStreamingResponse(): Array<Partial<JsonRpcResponse>> {
    return [
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'progress',
          message: 'Starting processing...',
          percentage: 0,
        },
      },
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'progress',
          message: 'Processing data...',
          percentage: 25,
        },
      },
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'progress',
          message: 'Analyzing results...',
          percentage: 75,
        },
      },
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'complete',
          message: 'Processing completed',
          percentage: 100,
          data: {
            processed: 1000,
            errors: 0,
            duration: 5.2,
          },
        },
      },
    ];
  }

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

    if (!('id' in request)) {
      errors.push('id field is required');
    }

    if (typeof request.method !== 'string') {
      errors.push('method field must be a string');
    }

    if ('params' in request && typeof request.params !== 'object') {
      errors.push('params field must be an object or array');
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
}