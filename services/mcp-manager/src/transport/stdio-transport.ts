/**
 * @service mcp-manager/transport
 * STDIO transport implementation for MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import { McpStdioConfig } from '@team-dashboard/types';
import { McpEncryption } from '../security/encryption';

export interface McpMessage {
  jsonrpc: string;
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export interface StdioTransportOptions {
  timeout?: number;
  onMessage?: (message: McpMessage) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

export class StdioTransport {
  private process: ChildProcess | null = null;
  private encryption: McpEncryption;
  private messageBuffer = '';
  private connected = false;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private config: McpStdioConfig,
    private options: StdioTransportOptions = {}
  ) {
    this.encryption = new McpEncryption();
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Transport already connected');
    }

    return new Promise((resolve, reject) => {
      try {
        // Decrypt environment variables
        const env = this.encryption.decryptEnvironmentVariables(this.config.environment);
        
        // Spawn the MCP server process
        this.process = spawn(this.config.command, this.config.args, {
          cwd: this.config.workingDirectory,
          env: { ...process.env, ...env },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.on('error', (error) => {
          this.cleanup();
          reject(new Error(`Failed to start MCP server: ${error.message}`));
        });

        this.process.on('exit', (code, signal) => {
          this.cleanup();
          if (this.options.onDisconnect) {
            this.options.onDisconnect();
          }
        });

        // Handle stdout messages
        this.process.stdout?.on('data', (data) => {
          this.handleStdoutData(data);
        });

        // Handle stderr for errors
        this.process.stderr?.on('data', (data) => {
          const error = new Error(`MCP server error: ${data.toString()}`);
          if (this.options.onError) {
            this.options.onError(error);
          }
        });

        // Send initialize request
        this.sendInitialize()
          .then(() => {
            this.connected = true;
            resolve();
          })
          .catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.process) return;

    return new Promise((resolve) => {
      const cleanup = () => {
        this.cleanup();
        resolve();
      };

      // Try graceful shutdown first
      this.process!.once('exit', cleanup);
      this.process!.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
          cleanup();
        }
      }, 5000);
    });
  }

  private cleanup(): void {
    this.connected = false;
    
    // Reject all pending requests
    for (const [id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
    
    this.process = null;
    this.messageBuffer = '';
  }

  private handleStdoutData(data: Buffer): void {
    this.messageBuffer += data.toString();
    
    // Process complete JSON-RPC messages
    let newlineIndex;
    while ((newlineIndex = this.messageBuffer.indexOf('\n')) !== -1) {
      const line = this.messageBuffer.slice(0, newlineIndex).trim();
      this.messageBuffer = this.messageBuffer.slice(newlineIndex + 1);
      
      if (line) {
        try {
          const message: McpMessage = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          if (this.options.onError) {
            this.options.onError(new Error(`Invalid JSON-RPC message: ${line}`));
          }
        }
      }
    }
  }

  private handleMessage(message: McpMessage): void {
    // Handle responses to our requests
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timeout);
      
      if (message.error) {
        pending.reject(new Error(message.error.message || 'Unknown error'));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Handle notifications and other messages
    if (this.options.onMessage) {
      this.options.onMessage(message);
    }
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
    if (!this.connected || !this.process?.stdin) {
      throw new Error('Transport not connected');
    }

    const id = ++this.requestId;
    const message: McpMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.options.timeout || 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const messageJson = JSON.stringify(message) + '\n';
      this.process!.stdin!.write(messageJson);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}