/**
 * @service mcp-manager/transport
 * HTTP+SSE transport implementation for MCP servers
 */

import fetch from 'node-fetch';
import { McpHttpConfig } from '@team-dashboard/types';
import { McpMessage } from './stdio-transport';

export interface HttpTransportOptions {
  timeout?: number;
  onMessage?: (message: McpMessage) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

export class HttpTransport {
  private connected = false;
  private eventSource: any = null; // SSE connection
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private config: McpHttpConfig,
    private options: HttpTransportOptions = {}
  ) {}

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Transport already connected');
    }

    try {
      // Test connection with initialize request
      await this.sendInitialize();
      
      // Set up SSE connection for receiving messages
      await this.setupSSE();
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    this.cleanup();
  }

  private cleanup(): void {
    this.connected = false;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Reject all pending requests
    for (const [_id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  private async setupSSE(): Promise<void> {
    // Note: This is a simplified implementation
    // Real HTTP+SSE transport would need proper SSE handling
    // const _sseUrl = `${this.config.baseUrl}/sse`; // Placeholder for SSE implementation
    
    return new Promise((resolve, reject) => {
      try {
        // In a real implementation, you'd use EventSource or similar
        // For now, this is a placeholder structure
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    // Add authentication headers
    if (this.config.authentication) {
      switch (this.config.authentication.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${this.config.authentication.credentials.token}`;
          break;
        case 'basic':
          const creds = Buffer.from(
            `${this.config.authentication.credentials.username}:${this.config.authentication.credentials.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${creds}`;
          break;
        case 'api-key':
          headers['X-API-Key'] = this.config.authentication.credentials.apiKey;
          break;
      }
    }

    return headers;
  }

  private async sendInitialize(): Promise<any> {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'team-dashboard-mcp-manager',
        version: '1.0.0'
      }
    });
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    const id = ++this.requestId;
    const message: McpMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.options.timeout || 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), this.options.timeout || 30000);
        
        try {
          const response = await fetch(`${this.config.baseUrl}/mcp`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(message),
            signal: abortController.signal
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json() as McpMessage;
          
          // Remove from pending requests
          this.pendingRequests.delete(id);
          clearTimeout(timeout);

          if (result.error) {
            reject(new Error(result.error.message || 'Unknown error'));
          } else {
            resolve(result.result);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000);
      
      try {
        await fetch(`${this.config.baseUrl}/health`, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: abortController.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}