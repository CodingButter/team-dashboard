/**
 * WebSocket Agent Manager
 * Handles agent lifecycle operations via WebSocket
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CreateAgentMessage,
  AgentCommandMessage,
  TerminateAgentMessage,
  AgentOutputMessage,
  AgentStatusMessage,
  AgentConnection,
  DashboardSession,
  ErrorCode
} from '@team-dashboard/types';
import { ClientConnection, ConnectionManager } from './connection';

/**
 * Manages agent operations for WebSocket connections
 */
export class AgentManager {
  private agents: Map<string, AgentConnection> = new Map();
  private sessions: Map<string, DashboardSession> = new Map();
  
  constructor(
    private connectionManager: ConnectionManager
  ) {}

  /**
   * Handle agent creation
   */
  async handleCreateAgent(client: ClientConnection, message: CreateAgentMessage): Promise<void> {
    try {
      const agentId = uuidv4();
      const agent = new AgentConnection({
        id: agentId,
        name: message.payload.name,
        model: message.payload.model,
        workspace: message.payload.workspace,
        resourceLimits: message.payload.resourceLimits
      });
      
      // Store agent
      this.agents.set(agentId, agent);
      
      // Add to session
      const session = this.getOrCreateSession(client);
      session.addAgent(agent);
      
      // Send creation confirmation
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:created',
        timestamp: Date.now(),
        payload: {
          agentId,
          name: agent.name,
          pid: 12345, // Mock PID
          startTime: Date.now()
        }
      });
      
      // Start mock agent output
      this.startMockAgentOutput(agentId);
      
      console.log(`[WS] Agent created: ${agentId}`);
      
    } catch (error) {
      this.sendError(client, ErrorCode.AGENT_SPAWN_FAILED, 'Failed to create agent');
    }
  }

  /**
   * Handle agent command
   */
  async handleAgentCommand(client: ClientConnection, message: AgentCommandMessage): Promise<void> {
    const agent = this.agents.get(message.payload.agentId);
    
    if (!agent) {
      this.sendError(client, ErrorCode.AGENT_NOT_FOUND, 'Agent not found');
      return;
    }
    
    // Add command to history
    agent.addCommand(message.payload.command);
    
    // Mock command execution
    setTimeout(() => {
      const output = `Mock output for command: ${message.payload.command}\n`;
      
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:output',
        timestamp: Date.now(),
        payload: {
          agentId: message.payload.agentId,
          stream: 'stdout',
          data: output,
          timestamp: Date.now(),
          sequence: 1
        }
      } as AgentOutputMessage);
    }, 100);
  }

  /**
   * Handle agent termination
   */
  async handleTerminateAgent(client: ClientConnection, message: TerminateAgentMessage): Promise<void> {
    const agent = this.agents.get(message.payload.agentId);
    
    if (!agent) {
      this.sendError(client, ErrorCode.AGENT_NOT_FOUND, 'Agent not found');
      return;
    }
    
    // Update agent status
    agent.updateStatus('stopped');
    
    // Remove from agents map
    this.agents.delete(message.payload.agentId);
    
    // Send status update
    this.connectionManager.broadcast({
      id: uuidv4(),
      type: 'agent:status',
      timestamp: Date.now(),
      payload: {
        agentId: message.payload.agentId,
        status: 'stopped'
      }
    } as AgentStatusMessage);
    
    console.log(`[WS] Agent terminated: ${message.payload.agentId}`);
  }

  /**
   * Get or create session for client
   */
  private getOrCreateSession(client: ClientConnection): DashboardSession {
    if (client.sessionId) {
      const existingSession = this.sessions.get(client.sessionId);
      if (existingSession) {
        return existingSession;
      }
    }
    
    // Create new session
    const session = new DashboardSession(client.userId || 'anonymous');
    this.sessions.set(session.id, session);
    client.sessionId = session.id;
    
    return session;
  }

  /**
   * Start mock agent output (for POC)
   */
  private startMockAgentOutput(agentId: string): void {
    const outputs = [
      'Initializing agent workspace...',
      'Loading environment variables...',
      'Connecting to services...',
      'Agent ready for commands.'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < outputs.length) {
        this.connectionManager.broadcast({
          id: uuidv4(),
          type: 'agent:output',
          timestamp: Date.now(),
          payload: {
            agentId,
            stream: 'stdout',
            data: outputs[index] + '\n',
            timestamp: Date.now(),
            sequence: index
          }
        } as AgentOutputMessage);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1000);
  }

  /**
   * Send error message to client
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

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Clean up all agents
   */
  cleanup(): void {
    this.agents.clear();
    this.sessions.clear();
  }
}