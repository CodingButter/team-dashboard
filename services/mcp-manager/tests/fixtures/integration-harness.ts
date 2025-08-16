/**
 * @package mcp-manager/tests/fixtures
 * Integration test harness for comprehensive MCP testing
 */

import { TestScenario, TestData, TestHarness, ServerConfig, ErrorType } from './index';
import { MockMcpServer } from './mock-server';
import { McpTestData } from './test-data';
import { McpErrorScenarios } from './error-scenarios';
import { McpPerformanceFixtures } from './performance-fixtures';

export class McpIntegrationHarness implements TestHarness {
  private mockServers: Map<string, MockMcpServer> = new Map();
  private testResults: TestData[] = [];
  private setupComplete = false;

  /**
   * Setup test environment
   */
  async setup(): Promise<void> {
    if (this.setupComplete) {
      return;
    }

    // Create mock servers for different scenarios
    const configs: ServerConfig[] = [
      {
        transport: 'stdio',
        name: 'test-stdio-server',
        capabilities: ['tools', 'resources'],
        tools: ['file_operations', 'system_info'],
        resources: ['config', 'logs'],
      },
      {
        transport: 'http+sse',
        name: 'test-http-server',
        capabilities: ['tools', 'prompts'],
        tools: ['api_call', 'data_processing'],
        prompts: ['analysis', 'summary'],
      },
    ];

    for (const config of configs) {
      const server = new MockMcpServer(config);
      this.mockServers.set(config.name, server);
    }

    this.setupComplete = true;
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    // Disconnect all mock servers
    for (const [_, server] of this.mockServers) {
      if (server.isConnected()) {
        await server.disconnect();
      }
    }

    this.mockServers.clear();
    this.testResults = [];
    this.setupComplete = false;
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestData> {
    if (!this.setupComplete) {
      throw new Error('Test harness not initialized. Call setup() first.');
    }

    switch (scenario) {
      case 'basic_operation':
        return await this.runBasicOperationScenario();
      case 'large_payload':
        return await this.runLargePayloadScenario();
      case 'unicode_handling':
        return await this.runUnicodeScenario();
      case 'binary_data':
        return await this.runBinaryDataScenario();
      case 'concurrent_requests':
        return await this.runConcurrentRequestsScenario();
      case 'edge_cases':
        return await this.runEdgeCasesScenario();
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  /**
   * Validate server response
   */
  validateResponse(response: any): boolean {
    // Basic JSON-RPC validation
    if (typeof response !== 'object' || response === null) {
      return false;
    }

    // Check for required fields
    if (!('id' in response)) {
      return false;
    }

    // Must have either result or error, but not both
    const hasResult = 'result' in response;
    const hasError = 'error' in response;

    if (hasResult && hasError) {
      return false;
    }

    if (!hasResult && !hasError) {
      return false;
    }

    // Validate error structure if present
    if (hasError) {
      const error = response.error;
      return (
        typeof error === 'object' &&
        typeof error.code === 'number' &&
        typeof error.message === 'string'
      );
    }

    return true;
  }

  /**
   * Run server lifecycle tests
   */
  async runLifecycleTests(): Promise<TestData[]> {
    const results: TestData[] = [];

    for (const [name, server] of this.mockServers) {
      const startTime = Date.now();
      
      // Test connection
      await server.connect();
      const connectTime = Date.now() - startTime;

      // Test health check
      const healthStart = Date.now();
      const health = await server.healthCheck();
      const healthTime = Date.now() - healthStart;

      // Test disconnection
      const disconnectStart = Date.now();
      await server.disconnect();
      const disconnectTime = Date.now() - disconnectStart;

      results.push({
        requests: [
          { method: 'connect', params: {} },
          { method: 'healthCheck', params: {} },
          { method: 'disconnect', params: {} },
        ],
        responses: [
          { id: 1, result: { connected: true, time: connectTime } },
          { id: 2, result: health },
          { id: 3, result: { disconnected: true, time: disconnectTime } },
        ],
        metadata: {
          scenario: 'lifecycle_test',
          serverName: name,
          totalTime: connectTime + healthTime + disconnectTime,
        },
      });
    }

    return results;
  }

  /**
   * Run error handling tests
   */
  async runErrorHandlingTests(): Promise<TestData[]> {
    const results: TestData[] = [];
    const errorTypes: ErrorType[] = [
      'connection_failed',
      'timeout',
      'protocol_error',
      'auth_failed',
      'resource_exhausted',
      'invalid_request',
      'server_crash',
    ];

    for (const errorType of errorTypes) {
      const server = this.mockServers.get('test-stdio-server');
      if (!server) continue;

      server.simulateError(errorType);
      
      try {
        await server.connect();
        const result = await server.healthCheck();
        
        results.push({
          requests: [{ method: 'healthCheck', params: {} }],
          responses: [{ id: 1, result }],
          metadata: {
            scenario: 'error_handling',
            errorType,
            expectsError: false,
          },
        });
      } catch (error) {
        results.push({
          requests: [{ method: 'healthCheck', params: {} }],
          responses: [{ 
            id: 1, 
            error: { 
              code: -32603, 
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          }],
          metadata: {
            scenario: 'error_handling',
            errorType,
            expectsError: true,
          },
        });
      }
      
      // Reset error simulation
      server.simulateError = () => {};
    }

    return results;
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests(): Promise<TestData[]> {
    const results: TestData[] = [];
    const loadConfigs = McpPerformanceFixtures.generateLoadTestConfigs();

    for (const config of loadConfigs.slice(0, 3)) { // Run first 3 configs for testing
      const server = this.mockServers.get('test-http-server');
      if (!server) continue;

      await server.connect();
      server.simulateLatency(config.payloadSize > 10000 ? 200 : 50);

      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      // Simulate concurrent requests
      for (let i = 0; i < config.concurrency; i++) {
        promises.push(server.getTools());
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      results.push({
        requests: Array(config.concurrency).fill({ method: 'tools/list', params: {} }),
        responses: responses.map((result, i) => ({ id: i + 1, result })),
        metadata: {
          scenario: 'performance_test',
          loadConfig: config.scenario,
          duration,
          concurrency: config.concurrency,
          throughput: (config.concurrency / duration) * 1000,
        },
      });

      await server.disconnect();
    }

    return results;
  }

  /**
   * Get test results summary
   */
  getTestSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    scenarios: string[];
    duration: number;
  } {
    const passedTests = this.testResults.filter(result => 
      result.responses.every(response => this.validateResponse(response))
    ).length;

    const scenarios = [...new Set(this.testResults.map(result => 
      result.metadata.scenario as string
    ))];

    const totalDuration = this.testResults.reduce((sum, result) => 
      sum + (result.metadata.duration as number || 0), 0
    );

    return {
      totalTests: this.testResults.length,
      passedTests,
      failedTests: this.testResults.length - passedTests,
      scenarios,
      duration: totalDuration,
    };
  }

  private async runBasicOperationScenario(): Promise<TestData> {
    const server = this.mockServers.get('test-stdio-server');
    if (!server) {
      throw new Error('Test server not available');
    }

    await server.connect();
    
    const [capabilities, tools, resources] = await Promise.all([
      server.getCapabilities(),
      server.getTools(),
      server.getResources(),
    ]);

    const result = {
      requests: [
        { method: 'capabilities', params: {} },
        { method: 'tools/list', params: {} },
        { method: 'resources/list', params: {} },
      ],
      responses: [
        { id: 1, result: capabilities },
        { id: 2, result: tools },
        { id: 3, result: resources },
      ],
      metadata: {
        scenario: 'basic_operation',
        duration: 150,
        requestCount: 3,
      },
    };

    this.testResults.push(result);
    return result;
  }

  private async runLargePayloadScenario(): Promise<TestData> {
    const server = this.mockServers.get('test-http-server');
    if (!server) {
      throw new Error('Test server not available');
    }

    await server.connect();
    server.simulateLatency(300); // Simulate processing time for large payload

    const largeData = 'x'.repeat(10000);
    const result = await server.executeTool('process_large_data', { data: largeData });

    const testResult = {
      requests: [
        {
          method: 'tools/call',
          params: {
            name: 'process_large_data',
            arguments: { data: largeData },
          },
        },
      ],
      responses: [{ id: 1, result }],
      metadata: {
        scenario: 'large_payload',
        payloadSize: largeData.length,
        duration: 300,
      },
    };

    this.testResults.push(testResult);
    return testResult;
  }

  private async runUnicodeScenario(): Promise<TestData> {
    const server = this.mockServers.get('test-stdio-server');
    if (!server) {
      throw new Error('Test server not available');
    }

    await server.connect();

    const unicodeData = '🌟 Unicode test: 你好世界 🚀 Émojis and ñon-ASCII';
    const result = await server.executeTool('process_unicode', { text: unicodeData });

    const testResult = {
      requests: [
        {
          method: 'tools/call',
          params: {
            name: 'process_unicode',
            arguments: { text: unicodeData },
          },
        },
      ],
      responses: [{ id: 1, result }],
      metadata: {
        scenario: 'unicode_handling',
        encoding: 'UTF-8',
        duration: 100,
      },
    };

    this.testResults.push(testResult);
    return testResult;
  }

  private async runBinaryDataScenario(): Promise<TestData> {
    const testResult = McpTestData.generateTestData('binary_data');
    this.testResults.push(testResult);
    return testResult;
  }

  private async runConcurrentRequestsScenario(): Promise<TestData> {
    const server = this.mockServers.get('test-http-server');
    if (!server) {
      throw new Error('Test server not available');
    }

    await server.connect();

    const concurrency = 10;
    const promises = Array.from({ length: concurrency }, (_, i) =>
      server.executeTool('concurrent_test', { requestId: i })
    );

    const results = await Promise.all(promises);

    const testResult = {
      requests: Array.from({ length: concurrency }, (_, i) => ({
        method: 'tools/call',
        params: {
          name: 'concurrent_test',
          arguments: { requestId: i },
        },
      })),
      responses: results.map((result, i) => ({ id: i + 1, result })),
      metadata: {
        scenario: 'concurrent_requests',
        concurrency,
        duration: 800,
      },
    };

    this.testResults.push(testResult);
    return testResult;
  }

  private async runEdgeCasesScenario(): Promise<TestData> {
    const testResult = McpTestData.generateTestData('edge_cases');
    this.testResults.push(testResult);
    return testResult;
  }
}

/**
 * Factory function for creating test harness
 */
export function createIntegrationHarness(): McpIntegrationHarness {
  return new McpIntegrationHarness();
}