/**
 * WebSocket Message Handler
 * Routes and processes incoming WebSocket messages
 */

import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import {
  WSMessage,
  AuthMessage,
  CreateAgentMessage,
  AgentCommandMessage,
  TerminateAgentMessage,
  SubscribeMessage,
  HeartbeatMessage,
  AckMessage,
  isAuthMessage,
  ErrorCode
} from '@team-dashboard/types';
import { ClientConnection } from './connection';
import { AgentManager } from './agent-manager';
import WorkflowWebSocketHandler from './workflow-handler';

/**
 * Handles WebSocket message routing and processing
 */
export class MessageHandler {
  private workflowHandler: WorkflowWebSocketHandler;
  
  constructor(
    private agentManager: AgentManager
  ) {
    this.workflowHandler = new WorkflowWebSocketHandler(agentManager.getConnectionManager());
    this.initialize();
  }
  
  /**
   * Initialize async components
   */
  private async initialize(): Promise<void> {
    await this.workflowHandler.initialize();
  }

  /**
   * Handle incoming WebSocket message
   */
  async handleMessage(client: ClientConnection, data: Buffer): Promise<void> {
    try {
      const message = JSON.parse(data.toString()) as WSMessage;
      
      console.log(`[WS] Message from ${client.id}: ${message.type}`);
      
      // Handle authentication first
      if (isAuthMessage(message)) {
        await this.handleAuth(client, message);
        return;
      }
      
      // Require authentication for all other messages
      if (!client.isAuthenticated) {
        this.sendError(client, ErrorCode.AUTH_FAILED, 'Not authenticated');
        return;
      }
      
      // Route message to appropriate handler
      await this.routeMessage(client, message);
      
      // Send acknowledgment
      this.sendAck(client, message.id, true);
      
    } catch (error) {
      console.error('[WS] Message handling error:', error);
      this.sendError(client, ErrorCode.INVALID_MESSAGE, 'Failed to process message');
    }
  }

  /**
   * Route message to appropriate handler
   */
  private async routeMessage(client: ClientConnection, message: WSMessage): Promise<void> {
    switch (message.type) {
      case 'agent:create':
        await this.agentManager.handleCreateAgent(client, message as CreateAgentMessage);
        break;
      
      case 'agent:command':
        await this.agentManager.handleAgentCommand(client, message as AgentCommandMessage);
        break;
      
      case 'agent:terminate':
        await this.agentManager.handleTerminateAgent(client, message as TerminateAgentMessage);
        break;
      
      case 'subscribe:agent':
      case 'subscribe:metrics':
      case 'subscribe:logs':
        await this.handleSubscribe(client, message as SubscribeMessage);
        break;
      
      case 'ping':
        this.handlePing(client, message as HeartbeatMessage);
        break;
      
      // Workflow messages
      case 'workflow:create':
      case 'workflow:assign':
      case 'workflow:start':
      case 'workflow:complete':
      case 'workflow:status':
      case 'workflow:list':
      case 'workflow:agent:tasks':
        await this.workflowHandler.handleMessage(client, message);
        break;
      
      default:
        this.sendError(client, ErrorCode.UNSUPPORTED_TYPE, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuth(client: ClientConnection, message: AuthMessage): Promise<void> {
    try {
      // TODO: Validate JWT token
      const isValid = await this.validateToken(message.payload.token);
      
      if (isValid) {
        client.isAuthenticated = true;
        client.userId = 'user-123'; // Extract from token
        client.clearAuthTimeout();
        
        this.sendAck(client, message.id, true);
        console.log(`[WS] Client ${client.id} authenticated`);
      } else {
        this.sendError(client, ErrorCode.AUTH_FAILED, 'Invalid token');
        client.ws.close();
      }
    } catch (error) {
      this.sendError(client, ErrorCode.AUTH_FAILED, 'Authentication failed');
      client.ws.close();
    }
  }

  /**
   * Handle subscriptions
   */
  private async handleSubscribe(client: ClientConnection, message: SubscribeMessage): Promise<void> {
    const subscriptionId = uuidv4();
    client.subscriptions.add(subscriptionId);
    
    console.log(`[WS] Client ${client.id} subscribed: ${message.type}`);
    
    // Start sending updates based on subscription type
    if (message.type === 'subscribe:metrics') {
      this.startMetricsUpdates(client);
    }
  }

  /**
   * Handle ping/pong heartbeat
   */
  private handlePing(client: ClientConnection, _message: HeartbeatMessage): void {
    client.send({
      id: uuidv4(),
      type: 'pong',
      timestamp: Date.now(),
      payload: { timestamp: Date.now() }
    });
  }

  /**
   * Start sending metrics updates
   */
  private startMetricsUpdates(client: ClientConnection): void {
    const interval = setInterval(() => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.send({
          id: uuidv4(),
          type: 'metrics:update',
          timestamp: Date.now(),
          payload: {
            system: {
              cpu: {
                usage: Math.random() * 100,
                cores: 8,
                temperature: 45 + Math.random() * 20
              },
              memory: {
                total: 16000000000,
                used: 8000000000 + Math.random() * 4000000000,
                available: 8000000000,
                percent: 50 + Math.random() * 30
              },
              disk: {
                total: 500000000000,
                used: 250000000000,
                percent: 50
              },
              network: {
                bytesIn: Math.random() * 1000000,
                bytesOut: Math.random() * 1000000,
                packetsIn: Math.random() * 1000,
                packetsOut: Math.random() * 1000
              }
            }
          }
        });
      } else {
        clearInterval(interval);
      }
    }, 1000); // Every second
  }

  /**
   * Validate JWT token with performance optimization
   */
  private async validateToken(token: string): Promise<boolean> {
    try {
      const start = performance.now();
      
      // Basic format validation
      if (!token || typeof token !== 'string') {
        return false;
      }
      
      // Check for JWT format (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // For development - accept test tokens
      if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
        return true;
      }
      
      // In production, implement proper JWT verification
      // This would typically use jsonwebtoken library:
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return !!decoded;
      
      const validationTime = performance.now() - start;
      if (validationTime > 5) { // Log slow auth
        console.warn(`[WS] Slow auth validation: ${validationTime.toFixed(2)}ms`);
      }
      
      // For now, allow specific test tokens
      const validTokens = ['valid-token', 'test-token', 'dashboard-token'];
      return validTokens.includes(token);
      
    } catch (error) {
      console.error('[WS] Token validation error:', error);
      return false;
    }
  }

  /**
   * Send acknowledgment message
   */
  private sendAck(client: ClientConnection, messageId: string, success: boolean): void {
    client.send({
      id: uuidv4(),
      type: 'ack',
      timestamp: Date.now(),
      payload: { messageId, success }
    } as AckMessage);
  }

  /**
   * Send error message
   */
  private sendError(client: ClientConnection, code: ErrorCode, message: string): void {
    client.send({
      id: uuidv4(),
      type: 'agent:error',
      timestamp: Date.now(),
      payload: {
        agentId: '',
        error: { code: code.toString(), message }
      }
    });
  }
}