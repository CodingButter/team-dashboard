/**
 * @package mcp-manager/tests/fixtures
 * Mock MCP server implementation for testing
 */

import { McpServer, McpServerStatus, McpHealthCheck } from '@team-dashboard/types';
import { EventEmitter } from 'events';
import { ServerConfig, ErrorType, MockMCPServer, ServerMetrics } from './index';

export class MockMcpServer extends EventEmitter implements MockMCPServer {
  private config: ServerConfig;
  private connected = false;
  private metrics: ServerMetrics;
  private artificialLatency = 0;
  private errorToSimulate?: ErrorType;
  private startTime: number;

  constructor(config: ServerConfig) {
    super();
    this.config = config;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      uptime: 0,
    };
    this.startTime = Date.now();
  }

  async connect(): Promise<void> {
    if (this.errorToSimulate === 'connection_failed') {
      throw new Error('Mock connection failed');
    }

    await this.simulateDelay();
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    await this.simulateDelay();
    this.connected = false;
    this.emit('disconnected');
  }

  simulateLatency(ms: number): void {
    this.artificialLatency = ms;
  }

  simulateError(error: ErrorType): void {
    this.errorToSimulate = error;
  }

  getMetrics(): ServerMetrics {
    this.metrics.uptime = Date.now() - this.startTime;
    return { ...this.metrics };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Mock MCP protocol methods
  async healthCheck(): Promise<McpHealthCheck> {
    const startTime = Date.now();
    
    if (this.errorToSimulate === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    if (this.errorToSimulate === 'server_crash') {
      this.connected = false;
      throw new Error('Server crashed during health check');
    }

    await this.simulateDelay();
    const latency = Date.now() - startTime;

    this.metrics.requestCount++;

    return {
      serverId: this.config.name,
      healthy: true,
      latency,
      timestamp: new Date(),
    };
  }

  async getCapabilities(): Promise<string[]> {
    if (this.errorToSimulate === 'protocol_error') {
      throw new Error('Invalid protocol response');
    }

    await this.simulateDelay();
    this.metrics.requestCount++;

    return this.config.capabilities || ['tools', 'resources', 'prompts'];
  }

  async getTools(): Promise<any[]> {
    await this.simulateDelay();
    this.metrics.requestCount++;

    return this.generateMockTools();
  }

  async getResources(): Promise<any[]> {
    await this.simulateDelay();
    this.metrics.requestCount++;

    return this.generateMockResources();
  }

  async getPrompts(): Promise<any[]> {
    await this.simulateDelay();
    this.metrics.requestCount++;

    return this.generateMockPrompts();
  }

  async executeTool(name: string, parameters: any): Promise<any> {
    if (this.errorToSimulate === 'invalid_request') {
      throw new Error(`Invalid tool: ${name}`);
    }

    if (this.errorToSimulate === 'resource_exhausted') {
      throw new Error('Resource limit exceeded');
    }

    await this.simulateDelay();
    this.metrics.requestCount++;

    return {
      result: `Mock execution of ${name}`,
      parameters,
      timestamp: new Date(),
    };
  }

  private async simulateDelay(): Promise<void> {
    if (this.artificialLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.artificialLatency));
    }
  }

  private generateMockTools(): any[] {
    return [
      {
        name: 'mock_tool_1',
        description: 'A mock tool for testing',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
            param2: { type: 'number' },
          },
        },
      },
      {
        name: 'mock_tool_2',
        description: 'Another mock tool',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array' },
          },
        },
      },
    ];
  }

  private generateMockResources(): any[] {
    return [
      {
        uri: 'mock://resource1',
        name: 'Mock Resource 1',
        mimeType: 'application/json',
      },
      {
        uri: 'mock://resource2',
        name: 'Mock Resource 2',
        mimeType: 'text/plain',
      },
    ];
  }

  private generateMockPrompts(): any[] {
    return [
      {
        name: 'mock_prompt_1',
        description: 'A mock prompt for testing',
        arguments: [
          {
            name: 'context',
            description: 'Context for the prompt',
            required: true,
          },
        ],
      },
    ];
  }
}

// Factory function for creating mock servers
export function createMockServer(config: ServerConfig): MockMcpServer {
  return new MockMcpServer(config);
}

// Pre-configured mock servers for common test scenarios
export const mockServers = {
  stdio: () => createMockServer({
    transport: 'stdio',
    name: 'mock-stdio-server',
    capabilities: ['tools', 'resources'],
    tools: ['file_operations', 'system_info'],
    resources: ['config', 'logs'],
  }),

  http: () => createMockServer({
    transport: 'http+sse',
    name: 'mock-http-server',
    capabilities: ['tools', 'prompts'],
    tools: ['api_call', 'data_processing'],
    prompts: ['analysis', 'summary'],
  }),

  unreliable: () => {
    const server = createMockServer({
      transport: 'stdio',
      name: 'unreliable-server',
      reliability: 0.7,
    });
    server.simulateLatency(2000);
    return server;
  },

  fastResponse: () => {
    const server = createMockServer({
      transport: 'http+sse',
      name: 'fast-server',
    });
    server.simulateLatency(10);
    return server;
  },
};