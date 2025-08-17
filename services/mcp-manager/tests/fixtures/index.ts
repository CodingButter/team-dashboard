/**
 * @package mcp-manager/tests/fixtures
 * Comprehensive MCP server test fixtures for testing without real server instances
 */

export { MockMcpServer, createMockServer, mockServers } from './mock-server';
export { McpTestData } from './test-data';
export { McpErrorScenarios } from './error-scenarios';
export { McpPerformanceFixtures } from './performance-fixtures';
export { McpIntegrationHarness, createIntegrationHarness } from './integration-harness';
export { McpProtocolFixtures } from './protocol-fixtures';

// Main test fixtures interface
export interface MCPTestFixtures {
  createMockServer(config: ServerConfig): MockMCPServer;
  simulateServerError(type: ErrorType): void;
  generateTestData(scenario: TestScenario): TestData;
  createIntegrationHarness(): TestHarness;
}

// Configuration types for fixture creation
export interface ServerConfig {
  transport: 'stdio' | 'http+sse';
  name: string;
  capabilities?: string[];
  tools?: string[];
  resources?: string[];
  prompts?: string[];
  latency?: number;
  reliability?: number;
}

export type ErrorType = 
  | 'connection_failed'
  | 'timeout'
  | 'protocol_error'
  | 'auth_failed'
  | 'resource_exhausted'
  | 'invalid_request'
  | 'server_crash';

export type TestScenario = 
  | 'basic_operation'
  | 'large_payload'
  | 'unicode_handling'
  | 'binary_data'
  | 'concurrent_requests'
  | 'edge_cases';

export interface TestData {
  requests: any[];
  responses: any[];
  metadata: Record<string, any>;
}

export interface TestHarness {
  setup(): Promise<void>;
  cleanup(): Promise<void>;
  runScenario(scenario: TestScenario): Promise<TestData>;
  validateResponse(response: any): boolean;
}

export interface MockMCPServer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  simulateLatency(ms: number): void;
  simulateError(error: ErrorType): void;
  getMetrics(): ServerMetrics;
}

export interface ServerMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  uptime: number;
}