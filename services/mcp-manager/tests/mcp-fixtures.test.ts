/**
 * @package mcp-manager/tests
 * Comprehensive test suite using MCP fixtures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MockMcpServer,
  McpTestData, 
  McpErrorScenarios, 
  McpPerformanceFixtures,
  McpIntegrationHarness,
  McpProtocolFixtures,
  createMockServer,
  createIntegrationHarness,
  mockServers,
} from './fixtures';

describe('MCP Server Test Fixtures', () => {
  describe('MockMcpServer', () => {
    let server: MockMcpServer;

    beforeEach(() => {
      server = createMockServer({
        transport: 'stdio',
        name: 'test-server',
        capabilities: ['tools', 'resources'],
      });
    });

    afterEach(async () => {
      if (server.isConnected()) {
        await server.disconnect();
      }
    });

    it('should create and connect a mock server', async () => {
      expect(server.isConnected()).toBe(false);
      
      await server.connect();
      expect(server.isConnected()).toBe(true);
      
      const metrics = server.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    it('should simulate latency correctly', async () => {
      server.simulateLatency(100);
      await server.connect();
      
      const startTime = Date.now();
      await server.healthCheck();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it('should simulate connection errors', async () => {
      server.simulateError('connection_failed');
      
      await expect(server.connect()).rejects.toThrow('Mock connection failed');
    });

    it('should handle health checks', async () => {
      await server.connect();
      
      const health = await server.healthCheck();
      expect(health.serverId).toBe('test-server');
      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should provide mock tools', async () => {
      await server.connect();
      
      const tools = await server.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
      expect(tools[0]).toHaveProperty('inputSchema');
    });

    it('should execute tools with mock results', async () => {
      await server.connect();
      
      const result = await server.executeTool('mock_tool_1', { param1: 'test' });
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('timestamp');
      expect(result.parameters.param1).toBe('test');
    });

    it('should track request metrics', async () => {
      await server.connect();
      
      await server.healthCheck();
      await server.getTools();
      await server.getResources();
      
      const metrics = server.getMetrics();
      expect(metrics.requestCount).toBe(3);
    });
  });

  describe('Pre-configured Mock Servers', () => {
    it('should create STDIO server with correct config', () => {
      const server = mockServers.stdio();
      expect(server).toBeInstanceOf(MockMcpServer);
    });

    it('should create HTTP server with correct config', () => {
      const server = mockServers.http();
      expect(server).toBeInstanceOf(MockMcpServer);
    });

    it('should create unreliable server with latency', async () => {
      const server = mockServers.unreliable();
      await server.connect();
      
      const startTime = Date.now();
      await server.healthCheck();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900); // Should have 2000ms latency
    });

    it('should create fast response server', async () => {
      const server = mockServers.fastResponse();
      await server.connect();
      
      const startTime = Date.now();
      await server.healthCheck();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('McpTestData', () => {
    it('should generate basic operation test data', () => {
      const testData = McpTestData.generateTestData('basic_operation');
      
      expect(testData.requests).toHaveLength(3);
      expect(testData.responses).toHaveLength(3);
      expect(testData.metadata.scenario).toBe('basic_operation');
      expect(testData.metadata.requestCount).toBe(3);
    });

    it('should generate large payload test data', () => {
      const testData = McpTestData.generateTestData('large_payload');
      
      expect(testData.requests).toHaveLength(1);
      expect(testData.responses).toHaveLength(1);
      expect(testData.metadata.scenario).toBe('large_payload');
      expect(testData.metadata.payloadSize).toBeGreaterThan(1000);
    });

    it('should generate unicode handling test data', () => {
      const testData = McpTestData.generateTestData('unicode_handling');
      
      expect(testData.metadata.scenario).toBe('unicode_handling');
      expect(testData.metadata.encoding).toBe('UTF-8');
    });

    it('should generate concurrent requests test data', () => {
      const testData = McpTestData.generateTestData('concurrent_requests');
      
      expect(testData.requests).toHaveLength(10);
      expect(testData.responses).toHaveLength(10);
      expect(testData.metadata.concurrency).toBe(10);
    });

    it('should generate mock server configurations', () => {
      const servers = McpTestData.generateMockServers();
      
      expect(servers.stdio).toHaveLength(2);
      expect(servers.http).toHaveLength(2);
      
      expect(servers.stdio[0].transport).toBe('stdio');
      expect(servers.stdio[0]).toHaveProperty('command');
      expect(servers.stdio[0]).toHaveProperty('args');
      
      expect(servers.http[0].transport).toBe('http+sse');
      expect(servers.http[0]).toHaveProperty('baseUrl');
    });

    it('should generate server status data', () => {
      const statuses = McpTestData.generateServerStatuses();
      
      expect(statuses).toHaveLength(4);
      expect(statuses[0]).toHaveProperty('serverId');
      expect(statuses[0]).toHaveProperty('status');
      expect(statuses[0]).toHaveProperty('capabilities');
    });

    it('should generate health check data', () => {
      const healthChecks = McpTestData.generateHealthChecks();
      
      expect(healthChecks).toHaveLength(4);
      expect(healthChecks[0]).toHaveProperty('serverId');
      expect(healthChecks[0]).toHaveProperty('healthy');
      expect(healthChecks[0]).toHaveProperty('timestamp');
    });
  });

  describe('McpErrorScenarios', () => {
    it('should provide error scenarios for all error types', () => {
      const scenarios = McpErrorScenarios.getAllScenarios();
      
      expect(scenarios.length).toBeGreaterThan(5);
      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('type');
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('triggerCondition');
        expect(scenario).toHaveProperty('expectedBehavior');
        expect(scenario).toHaveProperty('simulation');
      });
    });

    it('should simulate connection failed error', () => {
      const error = McpErrorScenarios.simulateError('connection_failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Connection refused');
    });

    it('should simulate timeout error', () => {
      const error = McpErrorScenarios.simulateError('timeout');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('timeout');
    });

    it('should generate network-specific errors', () => {
      const networkErrors = McpErrorScenarios.generateNetworkErrors();
      
      expect(networkErrors.length).toBeGreaterThan(0);
      networkErrors.forEach(error => {
        expect(error.type).toBe('connection_failed' || 'timeout');
      });
    });

    it('should generate STDIO transport errors', () => {
      const stdioErrors = McpErrorScenarios.generateStdioErrors();
      
      expect(stdioErrors.length).toBeGreaterThan(0);
      stdioErrors.forEach(error => {
        expect(['server_crash', 'connection_failed', 'timeout']).toContain(error.type);
      });
    });

    it('should generate HTTP transport errors', () => {
      const httpErrors = McpErrorScenarios.generateHttpErrors();
      
      expect(httpErrors.length).toBeGreaterThan(0);
      httpErrors.forEach(error => {
        expect(['auth_failed', 'resource_exhausted', 'protocol_error']).toContain(error.type);
      });
    });

    it('should create error chains', () => {
      const errorTypes = ['connection_failed', 'timeout', 'server_crash'];
      const chain = McpErrorScenarios.createErrorChain(errorTypes);
      
      expect(chain).toHaveLength(3);
      expect(chain[0].description).toContain('Chain step 1');
      expect(chain[1].description).toContain('Chain step 2');
      expect(chain[2].description).toContain('Chain step 3');
    });

    it('should generate random errors', () => {
      const error1 = McpErrorScenarios.generateRandomError();
      const error2 = McpErrorScenarios.generateRandomError();
      
      expect(error1).toHaveProperty('type');
      expect(error2).toHaveProperty('type');
      // They might be the same, but the function should work
    });
  });

  describe('McpPerformanceFixtures', () => {
    it('should generate load test configurations', () => {
      const configs = McpPerformanceFixtures.generateLoadTestConfigs();
      
      expect(configs.length).toBeGreaterThan(3);
      configs.forEach(config => {
        expect(config).toHaveProperty('duration');
        expect(config).toHaveProperty('concurrency');
        expect(config).toHaveProperty('requestsPerSecond');
        expect(config).toHaveProperty('scenario');
        expect(config.duration).toBeGreaterThan(0);
        expect(config.concurrency).toBeGreaterThan(0);
      });
    });

    it('should generate performance targets', () => {
      const targets = McpPerformanceFixtures.generatePerformanceTargets();
      
      expect(targets).toHaveProperty('stdio_server');
      expect(targets).toHaveProperty('http_server');
      expect(targets).toHaveProperty('production_server');
      
      expect(targets.stdio_server.maxResponseTime).toBeGreaterThan(0);
      expect(targets.http_server.minThroughput).toBeGreaterThan(0);
    });

    it('should generate mock performance metrics', () => {
      const metrics = McpPerformanceFixtures.generateMockMetrics('baseline_load');
      
      expect(metrics).toHaveLength(60);
      metrics.forEach(metric => {
        expect(metric).toHaveProperty('responseTime');
        expect(metric).toHaveProperty('throughput');
        expect(metric).toHaveProperty('errorRate');
        expect(metric).toHaveProperty('memoryUsage');
        expect(metric).toHaveProperty('cpuUsage');
      });
    });

    it('should generate test payloads of different sizes', () => {
      const payloads = McpPerformanceFixtures.generateTestPayloads();
      
      expect(payloads).toHaveProperty('small');
      expect(payloads).toHaveProperty('medium');
      expect(payloads).toHaveProperty('large');
      expect(payloads).toHaveProperty('xlarge');
      
      expect(payloads.small.size).toBeLessThan(payloads.medium.size);
      expect(payloads.medium.size).toBeLessThan(payloads.large.size);
      expect(payloads.large.size).toBeLessThan(payloads.xlarge.size);
    });

    it('should generate concurrency patterns', () => {
      const patterns = McpPerformanceFixtures.generateConcurrencyPatterns();
      
      expect(patterns.length).toBeGreaterThan(3);
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('description');
        expect(Array.isArray(pattern.pattern)).toBe(true);
      });
    });

    it('should generate response time percentiles', () => {
      const percentiles = McpPerformanceFixtures.generateResponseTimePercentiles('baseline_load');
      
      expect(percentiles).toHaveProperty('p50');
      expect(percentiles).toHaveProperty('p90');
      expect(percentiles).toHaveProperty('p99');
      expect(percentiles).toHaveProperty('max');
      expect(percentiles).toHaveProperty('min');
      
      expect(percentiles.p90).toBeGreaterThan(percentiles.p50);
      expect(percentiles.p99).toBeGreaterThan(percentiles.p90);
      expect(percentiles.max).toBeGreaterThan(percentiles.p99);
    });
  });

  describe('McpProtocolFixtures', () => {
    it('should generate valid JSON-RPC requests', () => {
      const requests = McpProtocolFixtures.generateValidRequests();
      
      expect(requests.length).toBeGreaterThan(5);
      requests.forEach(request => {
        expect(request.jsonrpc).toBe('2.0');
        expect(request).toHaveProperty('id');
        expect(request).toHaveProperty('method');
        
        const validation = McpProtocolFixtures.validateRequest(request);
        expect(validation.valid).toBe(true);
      });
    });

    it('should generate valid JSON-RPC responses', () => {
      const responses = McpProtocolFixtures.generateValidResponses();
      
      expect(responses.length).toBeGreaterThan(5);
      responses.forEach(response => {
        expect(response.jsonrpc).toBe('2.0');
        expect(response).toHaveProperty('id');
        expect(response.result || response.error).toBeDefined();
        
        const validation = McpProtocolFixtures.validateResponse(response);
        expect(validation.valid).toBe(true);
      });
    });

    it('should generate invalid requests with expected errors', () => {
      const invalidRequests = McpProtocolFixtures.generateInvalidRequests();
      
      expect(invalidRequests.length).toBeGreaterThan(3);
      invalidRequests.forEach(({ request, expectedError }) => {
        const validation = McpProtocolFixtures.validateRequest(request);
        expect(validation.valid).toBe(false);
        expect(expectedError).toHaveProperty('code');
        expect(expectedError).toHaveProperty('message');
      });
    });

    it('should generate notifications', () => {
      const notifications = McpProtocolFixtures.generateNotifications();
      
      expect(notifications.length).toBeGreaterThan(3);
      notifications.forEach(notification => {
        expect(notification.jsonrpc).toBe('2.0');
        expect(notification).toHaveProperty('method');
        expect(notification).not.toHaveProperty('id'); // Notifications don't have IDs
      });
    });

    it('should generate error responses', () => {
      const errorResponses = McpProtocolFixtures.generateErrorResponses();
      
      expect(errorResponses.length).toBeGreaterThan(3);
      errorResponses.forEach(response => {
        expect(response.jsonrpc).toBe('2.0');
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('error');
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
        
        const validation = McpProtocolFixtures.validateResponse(response);
        expect(validation.valid).toBe(true);
      });
    });

    it('should generate batch requests', () => {
      const batchRequests = McpProtocolFixtures.generateBatchRequests();
      
      expect(batchRequests.length).toBeGreaterThan(2);
      batchRequests.forEach(request => {
        const validation = McpProtocolFixtures.validateRequest(request);
        expect(validation.valid).toBe(true);
      });
    });

    it('should generate large requests for payload testing', () => {
      const largeRequest = McpProtocolFixtures.generateLargeRequest();
      
      expect(largeRequest.method).toBe('tools/call');
      expect(largeRequest.params?.arguments?.dataset).toBeDefined();
      expect(Array.isArray(largeRequest.params.arguments.dataset)).toBe(true);
      expect(largeRequest.params.arguments.dataset.length).toBe(1000);
      
      const validation = McpProtocolFixtures.validateRequest(largeRequest);
      expect(validation.valid).toBe(true);
    });

    it('should validate request structure correctly', () => {
      const validRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: { test: true },
      };
      
      const validation = McpProtocolFixtures.validateRequest(validRequest);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid request structure', () => {
      const invalidRequest = {
        jsonrpc: '1.0', // Wrong version
        // Missing id
        method: 123, // Wrong type
      };
      
      const validation = McpProtocolFixtures.validateRequest(invalidRequest);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('McpIntegrationHarness', () => {
    let harness: McpIntegrationHarness;

    beforeEach(async () => {
      harness = createIntegrationHarness();
      await harness.setup();
    });

    afterEach(async () => {
      await harness.cleanup();
    });

    it('should setup and cleanup properly', async () => {
      // Harness is already set up in beforeEach
      expect(harness).toBeDefined();
      
      // Cleanup is tested in afterEach, but we can verify it doesn't throw
      await expect(harness.cleanup()).resolves.not.toThrow();
    });

    it('should run basic operation scenario', async () => {
      const result = await harness.runScenario('basic_operation');
      
      expect(result.requests).toHaveLength(3);
      expect(result.responses).toHaveLength(3);
      expect(result.metadata.scenario).toBe('basic_operation');
    });

    it('should run large payload scenario', async () => {
      const result = await harness.runScenario('large_payload');
      
      expect(result.metadata.scenario).toBe('large_payload');
      expect(result.metadata.payloadSize).toBeGreaterThan(1000);
    });

    it('should run concurrent requests scenario', async () => {
      const result = await harness.runScenario('concurrent_requests');
      
      expect(result.requests).toHaveLength(10);
      expect(result.responses).toHaveLength(10);
      expect(result.metadata.concurrency).toBe(10);
    });

    it('should validate responses correctly', () => {
      const validResponse = { id: 1, result: { test: true } };
      const invalidResponse = { id: 1 }; // Missing result or error
      
      expect(harness.validateResponse(validResponse)).toBe(true);
      expect(harness.validateResponse(invalidResponse)).toBe(false);
    });

    it('should run lifecycle tests', async () => {
      const results = await harness.runLifecycleTests();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.metadata.scenario).toBe('lifecycle_test');
        expect(result.metadata).toHaveProperty('serverName');
        expect(result.metadata).toHaveProperty('totalTime');
      });
    });

    it('should run error handling tests', async () => {
      const results = await harness.runErrorHandlingTests();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.metadata.scenario).toBe('error_handling');
        expect(result.metadata).toHaveProperty('errorType');
        expect(result.metadata).toHaveProperty('expectsError');
      });
    });

    it('should run performance tests', async () => {
      const results = await harness.runPerformanceTests();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.metadata.scenario).toBe('performance_test');
        expect(result.metadata).toHaveProperty('loadConfig');
        expect(result.metadata).toHaveProperty('throughput');
      });
    });

    it('should provide test summary', async () => {
      await harness.runScenario('basic_operation');
      await harness.runScenario('unicode_handling');
      
      const summary = harness.getTestSummary();
      
      expect(summary.totalTests).toBe(2);
      expect(summary.passedTests).toBeGreaterThanOrEqual(0);
      expect(summary.failedTests).toBeGreaterThanOrEqual(0);
      expect(summary.scenarios).toContain('basic_operation');
      expect(summary.scenarios).toContain('unicode_handling');
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });
  });
});