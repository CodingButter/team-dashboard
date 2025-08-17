/**
 * @service mcp-manager/transport
 * HTTP+SSE transport tests
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { HttpTransport, HttpTransportOptions } from './http-transport';
import { McpHttpConfig } from '@team-dashboard/types';
import fetch from 'node-fetch';

// Mock node-fetch
vi.mock('node-fetch');
const mockFetch = fetch as MockedFunction<typeof fetch>;

describe('HttpTransport', () => {
  let transport: HttpTransport;
  let config: McpHttpConfig;
  let options: HttpTransportOptions;
  let mockResponse: any;
  let mockSSEResponse: any;

  beforeEach(() => {
    config = {
      id: 'test-server',
      name: 'Test Server',
      transport: 'http+sse',
      baseUrl: 'https://api.example.com',
      enabled: true,
      autoConnect: false,
      environment: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      authentication: {
        type: 'bearer',
        credentials: {
          token: 'test-token'
        }
      }
    };

    options = {
      timeout: 5000,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      heartbeatInterval: 10000,
      onMessage: vi.fn(),
      onError: vi.fn(),
      onDisconnect: vi.fn(),
      onReconnect: vi.fn()
    };

    transport = new HttpTransport(config, options);

    // Mock HTTP response
    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: vi.fn().mockResolvedValue({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          serverInfo: { name: 'test-server', version: '1.0.0' }
        }
      })
    };

    // Mock SSE response
    mockSSEResponse = {
      ok: true,
      status: 200,
      body: {
        on: vi.fn()
      }
    };

    mockFetch.mockImplementation((url: URL | RequestInfo) => {
      if (url.toString().includes('/sse')) {
        return Promise.resolve(mockSSEResponse as any);
      }
      return Promise.resolve(mockResponse as any);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (transport) {
      transport.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      await transport.connect();
      
      expect(transport.isConnected()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initialize + SSE
    });

    it('should handle connection failure', async () => {
      mockResponse.ok = false;
      mockResponse.status = 500;
      mockResponse.statusText = 'Internal Server Error';
      
      await expect(transport.connect()).rejects.toThrow('Failed to connect to MCP server');
    });

    it('should disconnect cleanly', async () => {
      await transport.connect();
      await transport.disconnect();
      
      expect(transport.isConnected()).toBe(false);
    });

    it('should prevent double connection', async () => {
      await transport.connect();
      
      await expect(transport.connect()).rejects.toThrow('Transport already connected');
    });
  });

  describe('Authentication', () => {
    it('should include bearer token in headers', async () => {
      await transport.connect();
      
      const calls = mockFetch.mock.calls;
      const headers = calls[0][1]?.headers as Record<string, string>;
      
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should include basic auth in headers', async () => {
      config.authentication = {
        type: 'basic',
        credentials: {
          username: 'user',
          password: 'pass'
        }
      };
      
      transport = new HttpTransport(config, options);
      await transport.connect();
      
      const calls = mockFetch.mock.calls;
      const headers = calls[0][1]?.headers as Record<string, string>;
      
      expect(headers['Authorization']).toBe('Basic ' + Buffer.from('user:pass').toString('base64'));
    });

    it('should include API key in headers', async () => {
      config.authentication = {
        type: 'api-key',
        credentials: {
          apiKey: 'test-api-key'
        }
      };
      
      transport = new HttpTransport(config, options);
      await transport.connect();
      
      const calls = mockFetch.mock.calls;
      const headers = calls[0][1]?.headers as Record<string, string>;
      
      expect(headers['X-API-Key']).toBe('test-api-key');
    });
  });

  describe('Request Handling', () => {
    beforeEach(async () => {
      await transport.connect();
    });

    it('should send requests successfully', async () => {
      const result = await transport.sendRequest('test-method', { param: 'value' });
      
      expect(result).toEqual({
        protocolVersion: '2024-11-05',
        capabilities: {},
        serverInfo: { name: 'test-server', version: '1.0.0' }
      });
    });

    it('should handle request errors', async () => {
      mockResponse.json.mockResolvedValue({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -1, message: 'Test error' }
      });
      
      await expect(transport.sendRequest('test-method')).rejects.toThrow('Test error');
    });

    it('should timeout requests', async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise<Response>(resolve => {
        setTimeout(() => resolve(mockResponse as any), 10000);
      }));
      
      await expect(transport.sendRequest('test-method')).rejects.toThrow('Request timeout');
    }, 10000);

    it('should send notifications without expecting response', async () => {
      await transport.sendNotification('test-notification', { param: 'value' });
      
      // Should not throw and should make HTTP call
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('SSE Message Processing', () => {
    let onDataCallback: (chunk: Buffer) => void;

    beforeEach(async () => {
      // Capture the SSE data callback
      mockSSEResponse.body.on.mockImplementation((event: string, callback: any) => {
        if (event === 'data') {
          onDataCallback = callback;
        }
      });
      
      await transport.connect();
    });

    it('should process SSE messages correctly', () => {
      const sseMessage = 'data: {"jsonrpc":"2.0","method":"notification","params":{"test":"value"}}\n\n';
      
      onDataCallback(Buffer.from(sseMessage));
      
      expect(options.onMessage).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'notification',
        params: { test: 'value' }
      });
    });

    it('should handle multiline SSE messages', () => {
      const sseMessage = 'event: message\nid: 123\ndata: {"jsonrpc":"2.0"}\ndata: {"method":"test"}\n\n';
      
      onDataCallback(Buffer.from(sseMessage));
      
      // Should process the combined data
      expect(options.onMessage).toHaveBeenCalled();
    });

    it('should handle heartbeat messages', () => {
      const heartbeat = 'event: heartbeat\ndata: ping\n\n';
      
      onDataCallback(Buffer.from(heartbeat));
      
      // Should not call onMessage for heartbeats
      expect(options.onMessage).not.toHaveBeenCalled();
    });

    it('should update lastEventId from SSE messages', () => {
      const sseMessage = 'id: event-123\ndata: {"jsonrpc":"2.0","method":"test"}\n\n';
      
      onDataCallback(Buffer.from(sseMessage));
      
      const stats = transport.getConnectionStats();
      expect(stats.lastEventId).toBe('event-123');
    });
  });

  describe('Error Recovery', () => {
    let onErrorCallback: (error: Error) => void;

    beforeEach(async () => {
      mockSSEResponse.body.on.mockImplementation((event: string, callback: any) => {
        if (event === 'error') {
          onErrorCallback = callback;
        }
      });
      
      await transport.connect();
    });

    it('should handle SSE errors gracefully', () => {
      const error = new Error('SSE connection error');
      
      onErrorCallback(error);
      
      expect(options.onError).toHaveBeenCalledWith(error);
    });

    it('should attempt reconnection on disconnect', async () => {
      // Simulate SSE disconnect
      const onEndCallback = vi.fn();
      mockSSEResponse.body.on.mockImplementation((event: string, callback: any) => {
        if (event === 'end') {
          onEndCallback.mockImplementation(callback);
        }
      });
      
      onEndCallback();
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should attempt to reconnect
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sse'),
        expect.any(Object)
      );
    });
  });

  describe('Health Checks', () => {
    it('should perform health checks successfully', async () => {
      const healthResponse = { ...mockResponse };
      mockFetch.mockResolvedValue(healthResponse as any);
      
      const result = await transport.healthCheck();
      
      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should handle health check failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const result = await transport.healthCheck();
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Connection Statistics', () => {
    it('should provide accurate connection stats', async () => {
      await transport.connect();
      
      const stats = transport.getConnectionStats();
      
      expect(stats.connected).toBe(true);
      expect(stats.reconnectAttempts).toBe(0);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.messageBufferSize).toBe(0);
    });
  });

  describe('Force Reconnection', () => {
    it('should force reconnection when requested', async () => {
      await transport.connect();
      // const initialStats = transport.getConnectionStats();
      
      await transport.forceReconnect();
      
      const newStats = transport.getConnectionStats();
      expect(newStats.connected).toBe(true);
      expect(newStats.reconnectAttempts).toBe(0);
    });
  });
});