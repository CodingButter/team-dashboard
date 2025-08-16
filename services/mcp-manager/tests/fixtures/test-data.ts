/**
 * @package mcp-manager/tests/fixtures
 * Test data generation for various MCP scenarios
 */

import { McpServer, McpStdioConfig, McpHttpConfig, McpServerStatus, McpHealthCheck } from '@team-dashboard/types';
import { TestScenario, TestData } from './index';

export class McpTestData {
  /**
   * Generate test data for different scenarios
   */
  static generateTestData(scenario: TestScenario): TestData {
    switch (scenario) {
      case 'basic_operation':
        return this.generateBasicOperationData();
      case 'large_payload':
        return this.generateLargePayloadData();
      case 'unicode_handling':
        return this.generateUnicodeData();
      case 'binary_data':
        return this.generateBinaryData();
      case 'concurrent_requests':
        return this.generateConcurrentRequestsData();
      case 'edge_cases':
        return this.generateEdgeCasesData();
      default:
        return this.generateBasicOperationData();
    }
  }

  /**
   * Generate mock MCP server configurations for testing
   */
  static generateMockServers(): {
    stdio: McpStdioConfig[];
    http: McpHttpConfig[];
  } {
    return {
      stdio: [
        {
          id: 'test-stdio-1',
          name: 'Test STDIO Server',
          description: 'A test server using STDIO transport',
          transport: 'stdio',
          command: 'node',
          args: ['test-server.js'],
          workingDirectory: '/tmp/test',
          enabled: true,
          autoConnect: false,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 5000,
          environment: [
            {
              key: 'TEST_MODE',
              value: 'true',
              encrypted: false,
              required: false,
            },
          ],
          tags: ['test', 'stdio'],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'test-stdio-2',
          name: 'Python MCP Server',
          description: 'A Python-based MCP server',
          transport: 'stdio',
          command: 'python',
          args: ['-m', 'mcp_server'],
          workingDirectory: '/opt/mcp-servers/python',
          enabled: true,
          autoConnect: true,
          timeout: 60000,
          retryAttempts: 5,
          retryDelay: 10000,
          environment: [
            {
              key: 'PYTHON_PATH',
              value: '/opt/mcp-servers/python',
              encrypted: false,
              required: true,
            },
            {
              key: 'API_KEY',
              value: 'encrypted_api_key_value',
              encrypted: true,
              required: true,
            },
          ],
          tags: ['python', 'production'],
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T12:00:00Z'),
        },
      ],
      http: [
        {
          id: 'test-http-1',
          name: 'Test HTTP Server',
          description: 'A test server using HTTP+SSE transport',
          transport: 'http+sse',
          baseUrl: 'http://localhost:8080',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Header': 'test-value',
          },
          authentication: {
            type: 'bearer',
            credentials: {
              token: 'test-bearer-token',
            },
          },
          enabled: true,
          autoConnect: false,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 5000,
          environment: [],
          tags: ['test', 'http'],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'test-http-2',
          name: 'External API Server',
          description: 'An external API MCP server',
          transport: 'http+sse',
          baseUrl: 'https://api.example.com',
          headers: {
            'User-Agent': 'MCP-Client/1.0',
          },
          authentication: {
            type: 'api-key',
            credentials: {
              key: 'x-api-key',
              value: 'secret-api-key',
            },
          },
          enabled: true,
          autoConnect: true,
          timeout: 45000,
          retryAttempts: 2,
          retryDelay: 3000,
          environment: [
            {
              key: 'API_ENDPOINT',
              value: 'https://api.example.com/v1',
              encrypted: false,
              required: true,
            },
          ],
          tags: ['api', 'external', 'production'],
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T08:00:00Z'),
        },
      ],
    };
  }

  /**
   * Generate mock server status data
   */
  static generateServerStatuses(): McpServerStatus[] {
    return [
      {
        serverId: 'test-stdio-1',
        status: 'connected',
        lastConnected: new Date('2024-01-01T10:00:00Z'),
        capabilities: ['tools', 'resources'],
        tools: ['file_read', 'file_write', 'execute_command'],
        resources: ['filesystem', 'environment'],
        prompts: [],
        uptime: 3600000, // 1 hour in milliseconds
        requestCount: 150,
        errorCount: 2,
      },
      {
        serverId: 'test-stdio-2',
        status: 'error',
        lastConnected: new Date('2024-01-02T09:00:00Z'),
        lastError: 'Process exited with code 1',
        capabilities: ['tools', 'prompts'],
        tools: ['data_analysis', 'ml_predict'],
        resources: [],
        prompts: ['analyze_data', 'generate_report'],
        uptime: 0,
        requestCount: 0,
        errorCount: 1,
      },
      {
        serverId: 'test-http-1',
        status: 'connecting',
        capabilities: [],
        tools: [],
        resources: [],
        prompts: [],
        uptime: 0,
        requestCount: 0,
        errorCount: 0,
      },
      {
        serverId: 'test-http-2',
        status: 'connected',
        lastConnected: new Date('2024-01-03T08:30:00Z'),
        capabilities: ['tools', 'resources', 'prompts'],
        tools: ['api_call', 'webhook_register'],
        resources: ['external_data', 'api_docs'],
        prompts: ['api_request', 'data_transform'],
        uptime: 2700000, // 45 minutes
        requestCount: 85,
        errorCount: 0,
      },
    ];
  }

  /**
   * Generate mock health check data
   */
  static generateHealthChecks(): McpHealthCheck[] {
    const now = new Date();
    return [
      {
        serverId: 'test-stdio-1',
        healthy: true,
        latency: 50,
        timestamp: new Date(now.getTime() - 60000), // 1 minute ago
      },
      {
        serverId: 'test-stdio-2',
        healthy: false,
        error: 'Connection timeout',
        timestamp: new Date(now.getTime() - 120000), // 2 minutes ago
      },
      {
        serverId: 'test-http-1',
        healthy: true,
        latency: 120,
        timestamp: new Date(now.getTime() - 30000), // 30 seconds ago
      },
      {
        serverId: 'test-http-2',
        healthy: true,
        latency: 200,
        timestamp: new Date(now.getTime() - 10000), // 10 seconds ago
      },
    ];
  }

  private static generateBasicOperationData(): TestData {
    return {
      requests: [
        { method: 'initialize', params: {} },
        { method: 'tools/list', params: {} },
        { method: 'resources/list', params: {} },
      ],
      responses: [
        { id: 1, result: { capabilities: ['tools', 'resources'] } },
        { id: 2, result: { tools: [{ name: 'test_tool' }] } },
        { id: 3, result: { resources: [{ uri: 'test://resource' }] } },
      ],
      metadata: {
        scenario: 'basic_operation',
        duration: 150,
        requestCount: 3,
      },
    };
  }

  private static generateLargePayloadData(): TestData {
    const largeData = 'x'.repeat(10000); // 10KB string
    return {
      requests: [
        {
          method: 'tools/call',
          params: {
            name: 'process_large_data',
            arguments: { data: largeData },
          },
        },
      ],
      responses: [
        {
          id: 1,
          result: {
            processed: true,
            size: largeData.length,
            data: largeData,
          },
        },
      ],
      metadata: {
        scenario: 'large_payload',
        payloadSize: largeData.length,
        duration: 500,
      },
    };
  }

  private static generateUnicodeData(): TestData {
    const unicodeData = '🌟 Unicode test: 你好世界 🚀 Émojis and ñon-ASCII';
    return {
      requests: [
        {
          method: 'tools/call',
          params: {
            name: 'process_unicode',
            arguments: { text: unicodeData },
          },
        },
      ],
      responses: [
        {
          id: 1,
          result: {
            original: unicodeData,
            processed: unicodeData.toUpperCase(),
            encoding: 'UTF-8',
          },
        },
      ],
      metadata: {
        scenario: 'unicode_handling',
        encoding: 'UTF-8',
        duration: 100,
      },
    };
  }

  private static generateBinaryData(): TestData {
    const binaryData = Buffer.from('Binary data test', 'utf8').toString('base64');
    return {
      requests: [
        {
          method: 'resources/read',
          params: {
            uri: 'file://test.bin',
            encoding: 'base64',
          },
        },
      ],
      responses: [
        {
          id: 1,
          result: {
            contents: binaryData,
            mimeType: 'application/octet-stream',
          },
        },
      ],
      metadata: {
        scenario: 'binary_data',
        encoding: 'base64',
        size: binaryData.length,
      },
    };
  }

  private static generateConcurrentRequestsData(): TestData {
    const requests = Array.from({ length: 10 }, (_, i) => ({
      method: 'tools/call',
      params: {
        name: 'concurrent_test',
        arguments: { requestId: i },
      },
    }));

    const responses = requests.map((_, i) => ({
      id: i + 1,
      result: { requestId: i, processed: true },
    }));

    return {
      requests,
      responses,
      metadata: {
        scenario: 'concurrent_requests',
        concurrency: 10,
        duration: 800,
      },
    };
  }

  private static generateEdgeCasesData(): TestData {
    return {
      requests: [
        { method: 'invalid_method', params: {} },
        { method: 'tools/call', params: { name: null } },
        { method: 'resources/read', params: { uri: '' } },
      ],
      responses: [
        { id: 1, error: { code: -32601, message: 'Method not found' } },
        { id: 2, error: { code: -32602, message: 'Invalid params' } },
        { id: 3, error: { code: -32603, message: 'Internal error' } },
      ],
      metadata: {
        scenario: 'edge_cases',
        errorCount: 3,
        duration: 200,
      },
    };
  }
}