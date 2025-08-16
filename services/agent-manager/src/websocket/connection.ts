/**
 * WebSocket Client Connection Management
 * Handles individual client connections and their lifecycle
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WSMessage } from '@team-dashboard/types';

/**
 * Represents a connected client
 */
export class ClientConnection {
  public isAuthenticated: boolean = false;
  public userId?: string;
  public sessionId?: string;
  public agentId?: string;
  public subscriptions: Set<string> = new Set();
  public heartbeatInterval?: NodeJS.Timeout;
  private authTimeout?: NodeJS.Timeout;
  
  constructor(
    public readonly id: string,
    public readonly ws: WebSocket
  ) {}
  
  /**
   * Send message to client
   */
  send(message: WSMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Start authentication timeout
   */
  startAuthTimeout(callback: () => void, timeout: number = 5000): void {
    this.authTimeout = setTimeout(callback, timeout);
  }
  
  /**
   * Clear authentication timeout
   */
  clearAuthTimeout(): void {
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = undefined;
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearAuthTimeout();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.subscriptions.clear();
  }
}

/**
 * Connection manager for WebSocket clients
 */
export class ConnectionManager {
  private clients: Map<string, ClientConnection> = new Map();
  
  /**
   * Add new client connection
   */
  addClient(ws: WebSocket): ClientConnection {
    const clientId = uuidv4();
    const client = new ClientConnection(clientId, ws);
    this.clients.set(clientId, client);
    return client;
  }
  
  /**
   * Remove client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.cleanup();
      this.clients.delete(clientId);
    }
  }
  
  /**
   * Get client by ID
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }
  
  /**
   * Get all authenticated clients
   */
  getAuthenticatedClients(): ClientConnection[] {
    return Array.from(this.clients.values()).filter(client => client.isAuthenticated);
  }
  
  /**
   * Broadcast message to all authenticated clients
   */
  broadcast(message: WSMessage): void {
    this.getAuthenticatedClients().forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  /**
   * Get client by agent ID
   */
  getClientByAgentId(agentId: string): ClientConnection | undefined {
    return Array.from(this.clients.values()).find(client => client.agentId === agentId);
  }
  
  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.clients.size;
  }
  
  /**
   * Clean up all connections
   */
  cleanup(): void {
    this.clients.forEach(client => client.cleanup());
    this.clients.clear();
  }
}