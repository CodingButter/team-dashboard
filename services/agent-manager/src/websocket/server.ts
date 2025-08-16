/**
 * Main WebSocket Server
 * Orchestrates connection management, message handling, and agent operations
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionManager } from './connection';
import { MessageHandler } from './message-handler';
import { AgentManager } from './agent-manager';

/**
 * Main WebSocket server class that coordinates all WebSocket operations
 */
export class DashboardWebSocketServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private connectionManager: ConnectionManager;
  private agentManager: AgentManager;
  private messageHandler: MessageHandler;
  
  constructor(private port: number = 3001) {
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
    
    // Initialize managers
    this.connectionManager = new ConnectionManager();
    this.agentManager = new AgentManager(this.connectionManager);
    this.messageHandler = new MessageHandler(this.agentManager);
    
    this.setupServer();
  }
  
  /**
   * Initialize WebSocket server and event handlers
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, _req: any) => {
      const client = this.connectionManager.addClient(ws);
      
      console.log(`[WS] New connection: ${client.id}`);
      
      // Set up event handlers
      ws.on('message', (data: Buffer) => {
        this.messageHandler.handleMessage(client, data);
      });
      
      ws.on('close', () => {
        this.handleDisconnect(client.id);
      });
      
      ws.on('error', (error) => {
        console.error(`[WS] Client error ${client.id}:`, error);
      });
      
      // Start authentication timeout
      client.startAuthTimeout(() => {
        if (!client.isAuthenticated) {
          console.log(`[WS] Authentication timeout for client ${client.id}`);
          ws.close();
        }
      });
      
      // Set up heartbeat
      this.setupHeartbeat(client);
    });
  }
  
  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    console.log(`[WS] Client disconnected: ${clientId}`);
    this.connectionManager.removeClient(clientId);
  }
  
  /**
   * Set up heartbeat mechanism
   */
  private setupHeartbeat(client: any): void {
    const interval = setInterval(() => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.send({
          id: uuidv4(),
          type: 'ping',
          timestamp: Date.now(),
          payload: { timestamp: Date.now() }
        });
      } else {
        clearInterval(interval);
      }
    }, 30000); // 30 seconds
    
    client.heartbeatInterval = interval;
  }
  
  /**
   * Start the WebSocket server
   */
  public start(): void {
    this.httpServer.listen(this.port, () => {
      console.log(`[WS] WebSocket server listening on port ${this.port}`);
    });
  }
  
  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    this.wss.close();
    this.httpServer.close();
    this.connectionManager.cleanup();
    this.agentManager.cleanup();
    console.log('[WS] WebSocket server stopped');
  }
  
  /**
   * Get server statistics
   */
  public getStats(): any {
    return {
      connections: this.connectionManager.getConnectionCount(),
      agents: this.agentManager.getAgentCount()
    };
  }
}