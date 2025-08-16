# MCP Server Test Fixtures

Comprehensive test fixtures for testing MCP server functionality without requiring actual server instances.

## Overview

This package provides a complete testing framework for MCP servers, including:

- **Mock Servers**: Simulate real MCP server behavior with configurable responses and errors
- **Test Data**: Pre-generated test data for various scenarios and edge cases
- **Error Scenarios**: Comprehensive error simulation for robust testing
- **Performance Fixtures**: Load testing configurations and metrics generation
- **Integration Harness**: Complete test environment for end-to-end testing
- **Protocol Fixtures**: JSON-RPC protocol validation and testing

## Quick Start

```typescript
import { 
  createMockServer, 
  createIntegrationHarness,
  McpTestData,
  McpErrorScenarios 
} from './fixtures';

// Create a mock STDIO server
const server = createMockServer({
  transport: 'stdio',
  name: 'test-server',
  capabilities: ['tools', 'resources'],
});

await server.connect();
const tools = await server.getTools();
await server.disconnect();

// Run integration tests
const harness = createIntegrationHarness();
await harness.setup();
const result = await harness.runScenario('basic_operation');
await harness.cleanup();
```

## Components

### MockMcpServer

Simulates a real MCP server with configurable behavior:

```typescript
const server = createMockServer({
  transport: 'stdio',
  name: 'test-server',
  capabilities: ['tools', 'resources'],
  latency: 50, // ms
  reliability: 0.95, // 95% success rate
});

// Simulate network latency
server.simulateLatency(200);

// Simulate specific errors
server.simulateError('connection_failed');
server.simulateError('timeout');
server.simulateError('protocol_error');
```

### Test Data Generation

Generate realistic test data for various scenarios:

```typescript
// Generate server configurations
const servers = McpTestData.generateMockServers();
console.log(servers.stdio); // Array of STDIO server configs
console.log(servers.http);  // Array of HTTP server configs

// Generate test scenarios
const basicTest = McpTestData.generateTestData('basic_operation');
const largePayload = McpTestData.generateTestData('large_payload');
const unicodeTest = McpTestData.generateTestData('unicode_handling');
const concurrentTest = McpTestData.generateTestData('concurrent_requests');
```

### Error Scenarios

Comprehensive error simulation for testing error handling:

```typescript
// Get all available error scenarios
const scenarios = McpErrorScenarios.getAllScenarios();

// Simulate specific errors
const connectionError = McpErrorScenarios.simulateError('connection_failed');
const timeoutError = McpErrorScenarios.simulateError('timeout');

// Generate transport-specific errors
const networkErrors = McpErrorScenarios.generateNetworkErrors();
const stdioErrors = McpErrorScenarios.generateStdioErrors();
const httpErrors = McpErrorScenarios.generateHttpErrors();

// Create error chains for testing cascading failures
const errorChain = McpErrorScenarios.createErrorChain([
  'connection_failed',
  'timeout',
  'server_crash'
]);
```

### Performance Testing

Load testing configurations and metrics generation:

```typescript
// Generate load test configurations
const loadConfigs = McpPerformanceFixtures.generateLoadTestConfigs();

// Generate performance targets
const targets = McpPerformanceFixtures.generatePerformanceTargets();

// Generate mock performance metrics
const metrics = McpPerformanceFixtures.generateMockMetrics('high_load');

// Generate test payloads of different sizes
const payloads = McpPerformanceFixtures.generateTestPayloads();
console.log(payloads.small.size);   // ~100 bytes
console.log(payloads.medium.size);  // ~1KB
console.log(payloads.large.size);   // ~10KB
console.log(payloads.xlarge.size);  // ~100KB
```

### Protocol Fixtures

JSON-RPC protocol testing and validation:

```typescript
// Generate valid protocol messages
const requests = McpProtocolFixtures.generateValidRequests();
const responses = McpProtocolFixtures.generateValidResponses();

// Generate invalid messages for error testing
const invalidRequests = McpProtocolFixtures.generateInvalidRequests();

// Validate protocol messages
const validation = McpProtocolFixtures.validateRequest(request);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}

// Generate batch requests and large payloads
const batchRequests = McpProtocolFixtures.generateBatchRequests();
const largeRequest = McpProtocolFixtures.generateLargeRequest();
```

### Integration Harness

Complete test environment for end-to-end testing:

```typescript
const harness = createIntegrationHarness();

// Setup test environment
await harness.setup();

// Run different test scenarios
const basicResult = await harness.runScenario('basic_operation');
const loadResult = await harness.runScenario('large_payload');
const concurrentResult = await harness.runScenario('concurrent_requests');

// Run specialized tests
const lifecycleResults = await harness.runLifecycleTests();
const errorResults = await harness.runErrorHandlingTests();
const performanceResults = await harness.runPerformanceTests();

// Get test summary
const summary = harness.getTestSummary();
console.log(`Total tests: ${summary.totalTests}`);
console.log(`Passed: ${summary.passedTests}`);
console.log(`Failed: ${summary.failedTests}`);

// Cleanup
await harness.cleanup();
```

## Test Scenarios

### Basic Operation
- Server initialization and capabilities discovery
- Tool listing and resource enumeration
- Basic protocol communication

### Large Payload
- Handling of large data transfers (10KB+)
- Memory usage validation
- Timeout handling for long operations

### Unicode Handling
- UTF-8 text processing
- Emoji and special character support
- Encoding validation

### Binary Data
- Base64 encoded binary content
- MIME type handling
- File operations

### Concurrent Requests
- Multiple simultaneous requests
- Connection pooling
- Resource contention

### Edge Cases
- Invalid requests and error responses
- Protocol violations
- Malformed data

## Error Types

The fixtures support comprehensive error simulation:

- **connection_failed**: Network connection issues
- **timeout**: Request timeout scenarios
- **protocol_error**: Invalid JSON-RPC responses
- **auth_failed**: Authentication failures
- **resource_exhausted**: Resource limit scenarios
- **invalid_request**: Parameter validation errors
- **server_crash**: Unexpected server termination

## Performance Testing

### Load Configurations

- **baseline_load**: 1 concurrent user, 10 RPS, 60 seconds
- **moderate_load**: 10 concurrent users, 50 RPS, 120 seconds
- **high_load**: 50 concurrent users, 100 RPS, 180 seconds
- **stress_test**: 100 concurrent users, 200 RPS, 300 seconds
- **spike_test**: 200 concurrent users, 500 RPS, 30 seconds

### Performance Targets

Different server types have different performance expectations:

- **STDIO Server**: <100ms response, >50 RPS, <1% errors
- **HTTP Server**: <200ms response, >100 RPS, <0.5% errors
- **Production Server**: <50ms response, >200 RPS, <0.1% errors

## Integration with Vitest

The fixtures are designed to work seamlessly with Vitest:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockServer, createIntegrationHarness } from './fixtures';

describe('MCP Server Tests', () => {
  let server;
  let harness;

  beforeEach(async () => {
    server = createMockServer({ transport: 'stdio', name: 'test' });
    harness = createIntegrationHarness();
    await harness.setup();
  });

  afterEach(async () => {
    if (server.isConnected()) {
      await server.disconnect();
    }
    await harness.cleanup();
  });

  it('should handle basic operations', async () => {
    await server.connect();
    const tools = await server.getTools();
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
  });
});
```

## Design Principles

### Deterministic Behavior
- Consistent results across test runs
- Predictable timing and responses
- Reproducible error conditions

### Fast Execution
- <5ms response times for mock operations
- Minimal setup and teardown overhead
- Efficient resource usage

### Comprehensive Coverage
- 100% protocol coverage
- All error conditions
- Edge cases and stress scenarios

### Easy Fixture Creation
- Simple factory functions
- Sensible defaults
- Customizable behavior

### Type Safety
- Full TypeScript support
- Compile-time validation
- IntelliSense support

## Extending the Fixtures

### Custom Mock Servers

```typescript
class CustomMockServer extends MockMcpServer {
  async customMethod(): Promise<any> {
    await this.simulateDelay();
    return { custom: true };
  }
}

const customServer = new CustomMockServer({
  transport: 'stdio',
  name: 'custom-server',
});
```

### Custom Test Data

```typescript
class CustomTestData extends McpTestData {
  static generateCustomScenario(): TestData {
    return {
      requests: [/* custom requests */],
      responses: [/* custom responses */],
      metadata: { scenario: 'custom', /* custom metadata */ },
    };
  }
}
```

### Custom Error Scenarios

```typescript
const customErrorScenarios = new Map([
  ['custom_error', {
    type: 'custom_error',
    description: 'Custom error for testing',
    triggerCondition: 'When custom condition is met',
    expectedBehavior: 'Should handle gracefully',
    simulation: () => new Error('Custom error occurred'),
  }],
]);
```

## Best Practices

1. **Use appropriate scenarios**: Choose the right test scenario for your specific use case
2. **Mock realistic behavior**: Configure latency and error rates to match real-world conditions
3. **Test error paths**: Use error scenarios to verify robust error handling
4. **Validate responses**: Always validate response structure and content
5. **Clean up resources**: Ensure proper cleanup in test teardown
6. **Isolate tests**: Each test should be independent and not affect others
7. **Use performance fixtures**: Validate performance under different load conditions

## Examples

See the test files for comprehensive examples:
- `mcp-fixtures.test.ts`: Basic fixture usage
- `mcp-service-integration.test.ts`: Integration testing with real service