/**
 * @service mcp-manager/service
 * Core MCP server management service
 */

import { McpServer, McpStdioConfig, McpHttpConfig, McpServerStatus, McpHealthCheck } from '@team-dashboard/types';
import { McpRedisStorage } from '../storage/redis-storage';
import { McpEncryption } from '../security/encryption';
import { StdioTransport } from '../transport/stdio-transport';
import { HttpTransport } from '../transport/http-transport';
import { config } from '../config';

export class McpService {
  private storage: McpRedisStorage;
  private encryption: McpEncryption;
  private transports = new Map<string, StdioTransport | HttpTransport>();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.storage = new McpRedisStorage();
    this.encryption = new McpEncryption();
  }

  async initialize(): Promise<void> {
    await this.storage.connect();
    this.startHealthCheckRoutine();
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Disconnect all transports
    for (const [serverId, transport] of this.transports) {
      await transport.disconnect();
    }
    this.transports.clear();
    
    await this.storage.disconnect();
  }

  // Server configuration management
  async createServer(serverData: Partial<McpServer>): Promise<McpServer> {
    const server: McpServer = {
      id: serverData.id || this.generateId(),
      name: serverData.name!,
      description: serverData.description,
      transport: serverData.transport!,
      enabled: serverData.enabled ?? true,
      autoConnect: serverData.autoConnect ?? false,
      timeout: serverData.timeout ?? config.mcp.defaultTimeout,
      retryAttempts: serverData.retryAttempts ?? config.mcp.maxRetries,
      retryDelay: serverData.retryDelay ?? config.mcp.retryDelay,
      environment: this.encryption.encryptEnvironmentVariables(serverData.environment || []),
      tags: serverData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...serverData
    } as McpServer;

    await this.storage.saveServer(server);
    
    if (server.autoConnect) {
      await this.connectServer(server.id);
    }
    
    return server;
  }

  async updateServer(id: string, updates: Partial<McpServer>): Promise<McpServer> {
    const existingServer = await this.storage.getServer(id);
    if (!existingServer) {
      throw new Error(`Server not found: ${id}`);
    }

    const updatedServer: McpServer = {
      ...existingServer,
      ...updates,
      id: existingServer.id, // Prevent ID changes
      updatedAt: new Date(),
      environment: updates.environment 
        ? this.encryption.encryptEnvironmentVariables(updates.environment)
        : existingServer.environment
    };

    await this.storage.saveServer(updatedServer);
    
    // Reconnect if transport changed
    if (this.transports.has(id) && (updates.transport || updates.environment)) {
      await this.reconnectServer(id);
    }
    
    return updatedServer;
  }

  async deleteServer(id: string): Promise<boolean> {
    await this.disconnectServer(id);
    return await this.storage.deleteServer(id);
  }

  async getServer(id: string): Promise<McpServer | null> {
    return await this.storage.getServer(id);
  }

  async getAllServers(): Promise<McpServer[]> {
    return await this.storage.getAllServers();
  }

  // Connection management
  async connectServer(id: string, force = false): Promise<void> {
    const server = await this.storage.getServer(id);
    if (!server) {
      throw new Error(`Server not found: ${id}`);
    }

    if (!server.enabled) {
      throw new Error(`Server is disabled: ${id}`);
    }

    if (this.transports.has(id) && !force) {
      throw new Error(`Server already connected: ${id}`);
    }

    // Disconnect existing transport if force reconnect
    if (force && this.transports.has(id)) {
      await this.disconnectServer(id);
    }

    try {
      const transport = this.createTransport(server);
      await transport.connect();
      
      this.transports.set(id, transport);
      
      await this.updateServerStatus(id, {
        serverId: id,
        status: 'connected',
        lastConnected: new Date(),
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      });
      
    } catch (error) {
      await this.updateServerStatus(id, {
        serverId: id,
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Connection failed'
      });
      throw error;
    }
  }

  async disconnectServer(id: string): Promise<void> {
    const transport = this.transports.get(id);
    if (transport) {
      await transport.disconnect();
      this.transports.delete(id);
      
      await this.updateServerStatus(id, {
        serverId: id,
        status: 'disconnected'
      });
    }
  }

  async reconnectServer(id: string): Promise<void> {
    await this.connectServer(id, true);
  }

  // Health monitoring
  async performHealthCheck(id: string): Promise<McpHealthCheck> {
    const startTime = Date.now();
    let healthy = false;
    let error: string | undefined;
    let latency: number | undefined;

    try {
      const transport = this.transports.get(id);
      if (!transport) {
        throw new Error('Server not connected');
      }

      if (transport instanceof HttpTransport) {
        const result = await transport.healthCheck();
        healthy = result.healthy;
        latency = result.latency;
        error = result.error;
      } else {
        // For STDIO, check if process is alive
        healthy = transport.isConnected();
        latency = Date.now() - startTime;
      }
      
    } catch (err) {
      healthy = false;
      error = err instanceof Error ? err.message : 'Health check failed';
    }

    const healthCheck: McpHealthCheck = {
      serverId: id,
      healthy,
      latency,
      error,
      timestamp: new Date()
    };

    await this.storage.saveHealthCheck(id, healthCheck);
    return healthCheck;
  }

  private createTransport(server: McpServer): StdioTransport | HttpTransport {
    const baseOptions = {
      timeout: server.timeout,
      onError: (error: Error) => this.handleTransportError(server.id, error),
      onDisconnect: () => this.handleTransportDisconnect(server.id)
    };

    if (server.transport === 'stdio') {
      return new StdioTransport(server as McpStdioConfig, baseOptions);
    } else {
      return new HttpTransport(server as McpHttpConfig, baseOptions);
    }
  }

  private async handleTransportError(serverId: string, error: Error): Promise<void> {
    await this.updateServerStatus(serverId, {
      serverId,
      status: 'error',
      lastError: error.message
    });
  }

  private async handleTransportDisconnect(serverId: string): Promise<void> {
    this.transports.delete(serverId);
    await this.updateServerStatus(serverId, {
      serverId,
      status: 'disconnected'
    });
  }

  private async updateServerStatus(serverId: string, statusUpdate: Partial<McpServerStatus>): Promise<void> {
    const existingStatus = await this.storage.getServerStatus(serverId);
    const status: McpServerStatus = {
      serverId,
      status: 'disconnected',
      ...existingStatus,
      ...statusUpdate
    };
    
    await this.storage.saveServerStatus(status);
  }

  private startHealthCheckRoutine(): void {
    this.healthCheckInterval = setInterval(async () => {
      const connectedServers = Array.from(this.transports.keys());
      
      for (const serverId of connectedServers) {
        try {
          await this.performHealthCheck(serverId);
        } catch (error) {
          console.error(`Health check failed for server ${serverId}:`, error);
        }
      }
    }, config.mcp.healthCheckInterval);
  }

  private generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}