/**
 * @service mcp-manager/transport
 * HTTP+SSE transport implementation for MCP servers
 */

import fetch from 'node-fetch';
import { McpHttpConfig } from '@team-dashboard/types';
import { McpMessage } from './stdio-transport';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';

export interface HttpTransportOptions {
  timeout?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onMessage?: (message: McpMessage) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

interface SSEMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export class HttpTransport extends EventEmitter {
  private connected = false;
  private sseResponse: IncomingMessage | null = null;
  private sseAbortController: AbortController | null = null;
  private requestId = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastEventId: string | null = null;
  private messageBuffer: SSEMessage[] = [];
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private config: McpHttpConfig,
    private options: HttpTransportOptions = {}
  ) {
    super();
    this.options = {
      timeout: 30000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Transport already connected');
    }

    try {
      // Test connection with initialize request
      await this.sendInitialize();
      
      // Set up SSE connection for receiving messages
      await this.setupSSE();
      
      // Start heartbeat mechanism
      this.startHeartbeat();
      
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
      this.options.onReconnect?.();
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    this.cleanup();
    this.emit('disconnect');
    this.options.onDisconnect?.();
  }

  private cleanup(): void {
    this.connected = false;
    
    // Close SSE connection
    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }
    
    if (this.sseResponse) {
      this.sseResponse.destroy();
      this.sseResponse = null;
    }
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Reject all pending requests
    for (const [_id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
    
    // Clear message buffer
    this.messageBuffer = [];
  }

  private async setupSSE(): Promise<void> {
    const sseUrl = `${this.config.baseUrl}/sse`;
    const headers = this.getHeaders();
    
    // Add SSE-specific headers
    headers['Accept'] = 'text/event-stream';
    headers['Cache-Control'] = 'no-cache';
    
    if (this.lastEventId) {
      headers['Last-Event-ID'] = this.lastEventId;
    }
    
    return new Promise((resolve, reject) => {
      this.sseAbortController = new AbortController();
      
      fetch(sseUrl, {
        method: 'GET',
        headers,
        signal: this.sseAbortController.signal
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
        }
        
        if (!response.body) {
          throw new Error('SSE response has no body');
        }
        
        this.sseResponse = response.body as any;
        this.setupSSEListeners();
        resolve();
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          return; // Expected during cleanup
        }
        
        this.handleSSEError(error);
        reject(error);
      });
    });
  }
  
  private setupSSEListeners(): void {
    if (!this.sseResponse) return;
    
    let buffer = '';
    
    this.sseResponse.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      
      // Process complete messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      let currentMessage: Partial<SSEMessage> = {};
      
      for (const line of lines) {
        if (line === '') {
          // Empty line indicates end of message
          if (currentMessage.data !== undefined) {
            this.processSSEMessage(currentMessage as SSEMessage);
          }
          currentMessage = {};
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          currentMessage.data = currentMessage.data ? currentMessage.data + '\n' + data : data;
        } else if (line.startsWith('id: ')) {
          currentMessage.id = line.slice(4);
        } else if (line.startsWith('event: ')) {
          currentMessage.event = line.slice(7);
        } else if (line.startsWith('retry: ')) {
          currentMessage.retry = parseInt(line.slice(7), 10);
        }
      }
    });
    
    this.sseResponse.on('end', () => {
      this.handleSSEDisconnect();
    });
    
    this.sseResponse.on('error', (error: Error) => {
      this.handleSSEError(error);
    });
  }
  
  private processSSEMessage(message: SSEMessage): void {
    try {
      // Update last event ID for reconnection
      if (message.id) {
        this.lastEventId = message.id;
      }
      
      // Handle different event types
      switch (message.event) {
        case 'ping':
        case 'heartbeat':
          // Heartbeat message - just update connection status
          break;
          
        case 'message':
        case undefined: // Default event type
          // Parse JSON message
          const mcpMessage = JSON.parse(message.data) as McpMessage;
          this.handleMcpMessage(mcpMessage);
          break;
          
        default:
          // Unknown event type - log and ignore
          console.warn(`Unknown SSE event type: ${message.event}`);
      }
    } catch (error) {
      console.error('Error processing SSE message:', error);
      this.emit('error', new Error(`Failed to process SSE message: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  private handleMcpMessage(message: McpMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      // This is a response to a pending request
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timeout);
      
      if (message.error) {
        pending.reject(new Error(message.error.message || 'Unknown error'));
      } else {
        pending.resolve(message.result);
      }
    } else {
      // This is a notification or unsolicited message
      this.emit('message', message);
      this.options.onMessage?.(message);
    }
  }
  
  private handleSSEError(error: Error): void {
    console.error('SSE error:', error);
    this.emit('error', error);
    this.options.onError?.(error);
    
    if (this.connected) {
      this.scheduleReconnect();
    }
  }
  
  private handleSSEDisconnect(): void {
    console.log('SSE connection ended');
    
    if (this.connected) {
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      console.error('Max reconnection attempts reached, giving up');
      this.cleanup();
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(
      (this.options.reconnectInterval || 5000) * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);
        await this.setupSSE();
        this.reconnectAttempts = 0;
        console.log('SSE reconnection successful');
      } catch (error) {
        console.error('SSE reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }
  
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    const interval = this.options.heartbeatInterval || 30000;
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('Heartbeat health check failed:', error);
        this.handleSSEError(error as Error);
      }
    }, interval);
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
    if (!this.connected) {
      throw new Error('Transport not connected');
    }
    
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

          // For HTTP+SSE, we expect responses to come via SSE, not HTTP response
          // This is just to handle immediate errors or acknowledgments
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json() as McpMessage;
            
            // Remove from pending requests
            this.pendingRequests.delete(id);
            clearTimeout(timeout);

            if (result.error) {
              reject(new Error(result.error.message || 'Unknown error'));
            } else {
              resolve(result.result);
            }
          }
          // If not JSON, the response will come via SSE - request remains pending
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
        const response = await fetch(`${this.config.baseUrl}/health`, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: abortController.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
        }
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
  
  /**
   * Send a notification (one-way message without expecting a response)
   */
  async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }
    
    const message: McpMessage = {
      jsonrpc: '2.0',
      method,
      params
    };

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
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    connected: boolean;
    reconnectAttempts: number;
    pendingRequests: number;
    lastEventId: string | null;
    messageBufferSize: number;
  } {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      pendingRequests: this.pendingRequests.size,
      lastEventId: this.lastEventId,
      messageBufferSize: this.messageBuffer.length
    };
  }
  
  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.cleanup();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}