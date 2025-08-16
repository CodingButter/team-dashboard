/**
 * WebSocket Integration for Inter-Agent Communication
 * Integrates the communication system with the existing WebSocket server
 */

import { EventEmitter } from 'events';
import { AgentCommunicationManager, DEFAULT_COMMUNICATION_CONFIG } from './index';
import type { 
  WSMessage 
} from '@team-dashboard/types';

export class CommunicationWebSocketIntegration extends EventEmitter {
  private communicationManager: AgentCommunicationManager;
  private wsClients: Map<string, { agentId?: string; connection: any }> = new Map();
  private agentToClientMap: Map<string, string> = new Map();

  constructor(config = DEFAULT_COMMUNICATION_CONFIG) {
    super();
    this.communicationManager = new AgentCommunicationManager(config);
    this.setupCommunicationEvents();
  }

  /**
   * Initialize the communication integration
   */
  async initialize(): Promise<void> {
    await this.communicationManager.initialize();
    console.log('Communication WebSocket integration initialized');
  }

  /**
   * Shutdown the communication integration
   */
  async shutdown(): Promise<void> {
    await this.communicationManager.shutdown();
    this.wsClients.clear();
    this.agentToClientMap.clear();
    console.log('Communication WebSocket integration shut down');
  }

  /**
   * Register a WebSocket client
   */
  registerClient(clientId: string, connection: any): void {
    this.wsClients.set(clientId, { connection });
    console.log(`WebSocket client registered: ${clientId}`);
  }

  /**
   * Unregister a WebSocket client
   */
  unregisterClient(clientId: string): void {
    const client = this.wsClients.get(clientId);
    if (client?.agentId) {
      // Unregister the agent from communication
      this.communicationManager.unregisterAgent(client.agentId);
      this.agentToClientMap.delete(client.agentId);
    }
    this.wsClients.delete(clientId);
    console.log(`WebSocket client unregistered: ${clientId}`);
  }

  /**
   * Associate a WebSocket client with an agent
   */
  async associateClientWithAgent(clientId: string, agentId: string): Promise<void> {
    const client = this.wsClients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Register agent with communication manager
    await this.communicationManager.registerAgent(agentId);
    
    // Update mappings
    client.agentId = agentId;
    this.agentToClientMap.set(agentId, clientId);

    // Set up message handlers for this agent
    this.setupAgentMessageHandlers(agentId);

    console.log(`Agent ${agentId} associated with WebSocket client ${clientId}`);
  }

  /**
   * Handle incoming WebSocket messages related to inter-agent communication
   */
  async handleMessage(clientId: string, message: WSMessage): Promise<void> {
    const client = this.wsClients.get(clientId);
    if (!client?.agentId) {
      console.warn(`Message from unassociated client: ${clientId}`);
      return;
    }

    try {
      switch (message.type) {
        case 'agent:message':
          await this.handleDirectMessage(client.agentId, message.payload);
          break;
        
        case 'agent:broadcast':
          await this.handleBroadcast(client.agentId, message.payload);
          break;
        
        case 'agent:handoff':
          await this.handleTaskHandoff(client.agentId, message.payload);
          break;
        
        case 'agent:handoff:accept':
        case 'agent:handoff:reject':
          await this.handleHandoffResponse(client.agentId, message.payload);
          break;
        
        case 'agent:task:request':
          await this.handleTaskRequest(client.agentId, message.payload);
          break;
        
        case 'agent:event':
          await this.handleAgentEvent(client.agentId, message.payload);
          break;
        
        default:
          console.warn(`Unknown communication message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling communication message:`, error);
      this.sendErrorToClient(clientId, message.id, error);
    }
  }

  /**
   * Send a message to a WebSocket client
   */
  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.wsClients.get(clientId);
    if (client?.connection) {
      try {
        client.connection.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Send error response to client
   */
  private sendErrorToClient(clientId: string, messageId: string, error: any): void {
    const errorMessage: WSMessage = {
      id: messageId,
      type: 'agent:error',
      timestamp: Date.now(),
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    this.sendToClient(clientId, errorMessage);
  }

  /**
   * Set up message handlers for an agent
   */
  private setupAgentMessageHandlers(agentId: string): void {
    // Handle incoming direct messages
    this.communicationManager.subscribeToMessages(agentId, (message) => {
      this.forwardMessageToClient(agentId, 'agent:message', message);
    });

    // Subscribe to common broadcast channels
    this.communicationManager.subscribeToChannel(agentId, 'system', (message) => {
      this.forwardMessageToClient(agentId, 'agent:broadcast', message);
    });

    this.communicationManager.subscribeToChannel(agentId, 'agent-status', (message) => {
      this.forwardMessageToClient(agentId, 'agent:broadcast', message);
    });
  }

  /**
   * Forward a message from communication system to WebSocket client
   */
  private forwardMessageToClient(agentId: string, messageType: string, payload: any): void {
    const clientId = this.agentToClientMap.get(agentId);
    if (clientId) {
      const wsMessage: WSMessage = {
        id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: messageType as any,
        timestamp: Date.now(),
        payload,
        metadata: {
          agentId
        }
      };
      this.sendToClient(clientId, wsMessage);
    }
  }

  /**
   * Handle direct messages between agents
   */
  private async handleDirectMessage(fromAgentId: string, payload: any): Promise<void> {
    const { to, content, type = 'direct', correlationId } = payload;
    
    await this.communicationManager.sendMessage(
      fromAgentId,
      to,
      content,
      type,
      correlationId
    );
  }

  /**
   * Handle broadcast messages
   */
  private async handleBroadcast(fromAgentId: string, payload: any): Promise<void> {
    const { channel, content, type = 'announcement' } = payload;
    
    await this.communicationManager.broadcast(
      fromAgentId,
      channel,
      content,
      type
    );
  }

  /**
   * Handle task handoff requests
   */
  private async handleTaskHandoff(fromAgentId: string, payload: any): Promise<void> {
    const { to, task, context, reason } = payload;
    
    const handoffId = await this.communicationManager.handoffTask(
      fromAgentId,
      to,
      task,
      context,
      reason
    );

    // Send back the handoff ID
    const clientId = this.agentToClientMap.get(fromAgentId);
    if (clientId) {
      this.sendToClient(clientId, {
        id: `handoff-${handoffId}`,
        type: 'agent:handoff:initiated',
        timestamp: Date.now(),
        payload: { handoffId, to, taskId: task.id }
      });
    }
  }

  /**
   * Handle handoff responses
   */
  private async handleHandoffResponse(agentId: string, payload: any): Promise<void> {
    const { handoffId, accepted, reason } = payload;
    
    await this.communicationManager.respondToHandoff(
      handoffId,
      agentId,
      accepted,
      reason
    );
  }

  /**
   * Handle task requests
   */
  private async handleTaskRequest(fromAgentId: string, payload: any): Promise<void> {
    const { to, request, correlationId } = payload;
    
    await this.communicationManager.sendMessage(
      fromAgentId,
      to,
      JSON.stringify({ type: 'task_request', data: request }),
      'request',
      correlationId
    );
  }

  /**
   * Handle agent events
   */
  private async handleAgentEvent(agentId: string, payload: any): Promise<void> {
    const { type, data } = payload;
    
    await this.communicationManager.publishEvent(agentId, type, data);
  }

  /**
   * Set up communication event handlers
   */
  private setupCommunicationEvents(): void {
    // Handle handoff events
    this.communicationManager.on('handoffReceived', ({ agentId, handoff }) => {
      this.forwardMessageToClient(agentId, 'agent:handoff', handoff);
    });

    this.communicationManager.on('handoffResponse', ({ agentId, handoffId, accepted, reason }) => {
      this.forwardMessageToClient(agentId, 'agent:handoff:response', {
        handoffId,
        accepted,
        reason
      });
    });

    // Handle system events
    this.communicationManager.on('systemBroadcast', (message) => {
      // Forward to all connected agents
      for (const [agentId] of this.agentToClientMap) {
        this.forwardMessageToClient(agentId, 'agent:broadcast', message);
      }
    });

    // Handle agent status events
    this.communicationManager.on('agentStatusBroadcast', (message) => {
      // Forward to relevant agents
      for (const [agentId] of this.agentToClientMap) {
        this.forwardMessageToClient(agentId, 'agent:broadcast', message);
      }
    });
  }

  /**
   * Get communication statistics
   */
  async getStatistics(): Promise<any> {
    const commStats = await this.communicationManager.getStatistics();
    
    return {
      ...commStats,
      websocketClients: this.wsClients.size,
      associatedAgents: this.agentToClientMap.size
    };
  }

  /**
   * Get communication manager instance
   */
  getCommunicationManager(): AgentCommunicationManager {
    return this.communicationManager;
  }
}