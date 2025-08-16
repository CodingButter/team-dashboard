/**
 * @package mcp-manager/tests
 * Integration tests for McpService using comprehensive test fixtures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpService } from '../src/service/mcp-service';
import { 
  McpTestData, 
  McpErrorScenarios, 
  McpPerformanceFixtures,
  McpIntegrationHarness,
  createIntegrationHarness,
} from './fixtures';

// Mock Redis and other dependencies
vi.mock('../src/storage/redis-storage', () => ({
  McpRedisStorage: vi.fn().mockImplementation(() => {
    const servers = new Map();
    const statuses = new Map();
    const healthChecks = new Map();
    
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      saveServer: vi.fn().mockImplementation(async (server) => {
        servers.set(server.id, server);
      }),
      getServer: vi.fn().mockImplementation(async (id) => {
        return servers.get(id) || null;
      }),
      getAllServers: vi.fn().mockImplementation(async () => {
        return Array.from(servers.values());
      }),
      deleteServer: vi.fn().mockImplementation(async (id) => {
        return servers.delete(id);
      }),
      saveServerStatus: vi.fn().mockImplementation(async (status) => {
        statuses.set(status.serverId, status);
      }),
      getServerStatus: vi.fn().mockImplementation(async (serverId) => {
        return statuses.get(serverId) || null;
      }),
      saveHealthCheck: vi.fn().mockImplementation(async (serverId, healthCheck) => {
        if (!healthChecks.has(serverId)) {
          healthChecks.set(serverId, []);
        }
        healthChecks.get(serverId).push(healthCheck);
      }),
    };
  }),
}));

vi.mock('../src/security/encryption', () => ({
  McpEncryption: vi.fn().mockImplementation(() => ({
    encryptEnvironmentVariables: vi.fn().mockImplementation((variables) => 
      variables.map((v: any) => ({ ...v, encrypted: true }))
    ),
    decryptEnvironmentVariables: vi.fn().mockImplementation((variables) => 
      variables.reduce((acc: any, v: any) => ({ ...acc, [v.key]: v.value }), {})
    ),
  })),
}));

vi.mock('../src/transport/stdio-transport', () => ({
  StdioTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('../src/transport/http-transport', () => ({
  HttpTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    healthCheck: vi.fn().mockResolvedValue({
      healthy: true,
      latency: 50,
    }),
  })),
}));

vi.mock('../src/config', () => ({
  config: {
    mcp: {
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 5000,
      healthCheckInterval: 60000,
    },
  },
}));

describe('MCP Service Integration with Fixtures', () => {
  let service: McpService;
  let harness: McpIntegrationHarness;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new McpService();
    await service.initialize();
    
    harness = createIntegrationHarness();
    await harness.setup();
  });

  afterEach(async () => {
    await service.shutdown();
    await harness.cleanup();
  });

  describe('Server Creation with Test Data', () => {
    it('should create STDIO servers using test data', async () => {
      const testServers = McpTestData.generateMockServers();
      const stdioServerData = testServers.stdio[0];

      const createRequest = {
        name: stdioServerData.name,
        description: stdioServerData.description,
        transport: stdioServerData.transport,
        config: {
          command: stdioServerData.command,
          args: stdioServerData.args,
          workingDirectory: stdioServerData.workingDirectory,
        },
        environment: stdioServerData.environment,
        tags: stdioServerData.tags,
        enabled: stdioServerData.enabled,
        autoConnect: stdioServerData.autoConnect,
      };

      const createdServer = await service.createServer(createRequest);

      expect(createdServer.name).toBe(stdioServerData.name);
      expect(createdServer.transport).toBe('stdio');
      expect(createdServer.command).toBe(stdioServerData.command);
      expect(createdServer.args).toEqual(stdioServerData.args);
      expect(createdServer.enabled).toBe(stdioServerData.enabled);
    });

    it('should create HTTP servers using test data', async () => {
      const testServers = McpTestData.generateMockServers();
      const httpServerData = testServers.http[0];

      const createRequest = {
        name: httpServerData.name,
        description: httpServerData.description,
        transport: httpServerData.transport,
        config: {
          baseUrl: httpServerData.baseUrl,
          headers: httpServerData.headers,
          authentication: httpServerData.authentication,
        },
        environment: httpServerData.environment,
        tags: httpServerData.tags,
        enabled: httpServerData.enabled,
        autoConnect: httpServerData.autoConnect,
      };

      const createdServer = await service.createServer(createRequest);

      expect(createdServer.name).toBe(httpServerData.name);
      expect(createdServer.transport).toBe('http+sse');
      expect(createdServer.baseUrl).toBe(httpServerData.baseUrl);
      expect(createdServer.headers).toEqual(httpServerData.headers);
      expect(createdServer.authentication).toEqual(httpServerData.authentication);
    });

    it('should handle multiple servers from test data', async () => {
      const testServers = McpTestData.generateMockServers();
      const createdServers = [];

      // Create all STDIO servers
      for (const serverData of testServers.stdio) {
        const createRequest = {
          name: serverData.name,
          description: serverData.description,
          transport: serverData.transport,
          config: {
            command: serverData.command,
            args: serverData.args,
            workingDirectory: serverData.workingDirectory,
          },
          environment: serverData.environment,
          tags: serverData.tags,
          enabled: serverData.enabled,
          autoConnect: serverData.autoConnect,
        };

        const server = await service.createServer(createRequest);
        createdServers.push(server);
      }

      // Create all HTTP servers
      for (const serverData of testServers.http) {
        const createRequest = {
          name: serverData.name,
          description: serverData.description,
          transport: serverData.transport,
          config: {
            baseUrl: serverData.baseUrl,
            headers: serverData.headers,
            authentication: serverData.authentication,
          },
          environment: serverData.environment,
          tags: serverData.tags,
          enabled: serverData.enabled,
          autoConnect: serverData.autoConnect,
        };

        const server = await service.createServer(createRequest);
        createdServers.push(server);
      }

      expect(createdServers).toHaveLength(4); // 2 STDIO + 2 HTTP
      
      const allServers = await service.getAllServers();
      expect(allServers).toHaveLength(4);
    });
  });

  describe('Error Handling with Error Scenarios', () => {
    it('should handle connection failed errors', async () => {
      const testServers = McpTestData.generateMockServers();
      const server = await service.createServer({
        name: testServers.stdio[0].name,
        description: testServers.stdio[0].description,
        transport: 'stdio',
        config: {
          command: 'nonexistent-command',
          args: [],
        },
        environment: [],
      });

      // Mock the transport to simulate connection failure
      const connectionError = McpErrorScenarios.simulateError('connection_failed');
      const mockTransport = (service as any).createTransport(server);
      mockTransport.connect = vi.fn().mockRejectedValue(connectionError);

      await expect(service.connectServer(server.id)).rejects.toThrow();
    });

    it('should handle timeout errors during health checks', async () => {
      const testServers = McpTestData.generateMockServers();
      const server = await service.createServer({
        name: testServers.http[0].name,
        description: testServers.http[0].description,
        transport: 'http+sse',
        config: {
          baseUrl: 'http://localhost:8080',
        },
        environment: [],
      });

      await service.connectServer(server.id);

      // Mock timeout error during health check
      const timeoutError = McpErrorScenarios.simulateError('timeout');
      const mockTransport = (service as any).transports.get(server.id);
      mockTransport.healthCheck = vi.fn().mockRejectedValue(timeoutError);

      const healthCheck = await service.performHealthCheck(server.id);
      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.error).toContain('timeout');
    });

    it('should handle all error types gracefully', async () => {
      const errorTypes = ['connection_failed', 'timeout', 'protocol_error', 'auth_failed'];
      
      for (const errorType of errorTypes) {
        const scenario = McpErrorScenarios.getScenario(errorType);
        expect(scenario).toBeDefined();
        expect(scenario?.type).toBe(errorType);
        
        const error = McpErrorScenarios.simulateError(errorType);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Performance Testing with Load Fixtures', () => {
    it('should handle different load test configurations', async () => {
      const loadConfigs = McpPerformanceFixtures.generateLoadTestConfigs();
      const testServers = McpTestData.generateMockServers();

      for (const config of loadConfigs.slice(0, 2)) { // Test first 2 configs
        const server = await service.createServer({
          name: `${testServers.stdio[0].name}-${config.scenario}`,
          description: `Server for ${config.scenario}`,
          transport: 'stdio',
          config: {
            command: 'node',
            args: ['test-server.js'],
          },
          environment: [],
          timeout: config.duration * 1000, // Convert to ms
        });

        expect(server.name).toContain(config.scenario);
        expect(server.timeout).toBe(config.duration * 1000);
      }
    });

    it('should generate realistic performance metrics', () => {
      const scenarios = ['baseline_load', 'moderate_load', 'high_load'];
      
      for (const scenario of scenarios) {
        const metrics = McpPerformanceFixtures.generateMockMetrics(scenario);
        expect(metrics).toHaveLength(60);
        
        // Verify metrics increase appropriately with load
        const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
        const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
        
        expect(avgResponseTime).toBeGreaterThan(0);
        expect(avgThroughput).toBeGreaterThan(0);
        
        if (scenario === 'high_load') {
          expect(avgResponseTime).toBeGreaterThan(100); // Should be slower under high load
        }
      }
    });

    it('should validate performance targets', () => {
      const targets = McpPerformanceFixtures.generatePerformanceTargets();
      const mockMetrics = McpPerformanceFixtures.generateMockMetrics('baseline_load');
      
      const avgResponseTime = mockMetrics.reduce((sum, m) => sum + m.responseTime, 0) / mockMetrics.length;
      const avgThroughput = mockMetrics.reduce((sum, m) => sum + m.throughput, 0) / mockMetrics.length;
      
      // Should meet STDIO server targets under baseline load
      expect(avgResponseTime).toBeLessThan(targets.stdio_server.maxResponseTime);
      expect(avgThroughput).toBeGreaterThan(targets.stdio_server.minThroughput);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should run basic operation scenario end-to-end', async () => {
      const result = await harness.runScenario('basic_operation');
      
      expect(result.requests).toHaveLength(3);
      expect(result.responses).toHaveLength(3);
      expect(result.metadata.scenario).toBe('basic_operation');
      
      // Validate all responses
      for (const response of result.responses) {
        expect(harness.validateResponse(response)).toBe(true);
      }
    });

    it('should handle large payload scenario', async () => {
      const result = await harness.runScenario('large_payload');
      
      expect(result.metadata.scenario).toBe('large_payload');
      expect(result.metadata.payloadSize).toBeGreaterThan(1000);
      
      // Should complete successfully despite large payload
      expect(result.responses[0]).toHaveProperty('result');
      expect(harness.validateResponse(result.responses[0])).toBe(true);
    });

    it('should handle concurrent requests scenario', async () => {
      const result = await harness.runScenario('concurrent_requests');
      
      expect(result.requests).toHaveLength(10);
      expect(result.responses).toHaveLength(10);
      expect(result.metadata.concurrency).toBe(10);
      
      // All concurrent requests should succeed
      for (const response of result.responses) {
        expect(harness.validateResponse(response)).toBe(true);
        expect(response).toHaveProperty('result');
      }
    });

    it('should handle unicode and edge cases', async () => {
      const unicodeResult = await harness.runScenario('unicode_handling');
      expect(unicodeResult.metadata.scenario).toBe('unicode_handling');
      expect(unicodeResult.metadata.encoding).toBe('UTF-8');
      
      const edgeCasesResult = await harness.runScenario('edge_cases');
      expect(edgeCasesResult.metadata.scenario).toBe('edge_cases');
      expect(edgeCasesResult.metadata.errorCount).toBe(3);
      
      // Edge cases should produce error responses
      for (const response of edgeCasesResult.responses) {
        expect(response).toHaveProperty('error');
        expect(harness.validateResponse(response)).toBe(true);
      }
    });

    it('should provide comprehensive test summary', async () => {
      // Run multiple scenarios
      await harness.runScenario('basic_operation');
      await harness.runScenario('unicode_handling');
      await harness.runScenario('edge_cases');
      
      const summary = harness.getTestSummary();
      
      expect(summary.totalTests).toBe(3);
      expect(summary.scenarios).toContain('basic_operation');
      expect(summary.scenarios).toContain('unicode_handling');
      expect(summary.scenarios).toContain('edge_cases');
      expect(summary.duration).toBeGreaterThan(0);
      
      // Basic operation and unicode handling should pass
      expect(summary.passedTests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Comprehensive Server Lifecycle Testing', () => {
    it('should test complete server lifecycle with fixtures', async () => {
      const testServers = McpTestData.generateMockServers();
      const server = await service.createServer({
        name: testServers.stdio[0].name,
        description: testServers.stdio[0].description,
        transport: 'stdio',
        config: {
          command: testServers.stdio[0].command,
          args: testServers.stdio[0].args,
        },
        environment: testServers.stdio[0].environment,
        enabled: true,
        autoConnect: false,
      });

      // Test connection
      await service.connectServer(server.id);
      
      // Test health check
      const healthCheck = await service.performHealthCheck(server.id);
      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.serverId).toBe(server.id);
      
      // Test server update
      const updatedServer = await service.updateServer(server.id, {
        description: 'Updated description',
        enabled: false,
      });
      expect(updatedServer.description).toBe('Updated description');
      expect(updatedServer.enabled).toBe(false);
      
      // Test disconnection
      await service.disconnectServer(server.id);
      
      // Test deletion
      const deleted = await service.deleteServer(server.id);
      expect(deleted).toBe(true);
      
      // Verify server is gone
      const retrievedServer = await service.getServer(server.id);
      expect(retrievedServer).toBeNull();
    });

    it('should handle lifecycle tests from harness', async () => {
      const lifecycleResults = await harness.runLifecycleTests();
      
      expect(lifecycleResults.length).toBeGreaterThan(0);
      
      for (const result of lifecycleResults) {
        expect(result.metadata.scenario).toBe('lifecycle_test');
        expect(result.metadata).toHaveProperty('serverName');
        expect(result.metadata).toHaveProperty('totalTime');
        expect(result.requests).toHaveLength(3); // connect, health, disconnect
        expect(result.responses).toHaveLength(3);
      }
    });

    it('should handle error scenarios from harness', async () => {
      const errorResults = await harness.runErrorHandlingTests();
      
      expect(errorResults.length).toBeGreaterThan(0);
      
      for (const result of errorResults) {
        expect(result.metadata.scenario).toBe('error_handling');
        expect(result.metadata).toHaveProperty('errorType');
        expect(result.metadata).toHaveProperty('expectsError');
        
        if (result.metadata.expectsError) {
          expect(result.responses[0]).toHaveProperty('error');
        } else {
          expect(result.responses[0]).toHaveProperty('result');
        }
      }
    });

    it('should handle performance tests from harness', async () => {
      const performanceResults = await harness.runPerformanceTests();
      
      expect(performanceResults.length).toBeGreaterThan(0);
      
      for (const result of performanceResults) {
        expect(result.metadata.scenario).toBe('performance_test');
        expect(result.metadata).toHaveProperty('loadConfig');
        expect(result.metadata).toHaveProperty('throughput');
        expect(result.metadata.throughput).toBeGreaterThan(0);
      }
    });
  });
});