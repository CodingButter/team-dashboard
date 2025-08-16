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
import { OpenAIAgentManager, OpenAIAgentConfig } from '../agents/openai-agent-manager';

/**
 * Manages agent operations for WebSocket connections
 */
export class AgentManager {
  private agents: Map<string, AgentConnection> = new Map();
  private sessions: Map<string, DashboardSession> = new Map();
  private openaiManager: OpenAIAgentManager;
  
  constructor(
    private connectionManager: ConnectionManager
  ) {
    this.openaiManager = new OpenAIAgentManager();
    this.setupOpenAIEvents();
  }

  /**
   * Handle agent creation
   */
  async handleCreateAgent(client: ClientConnection, message: CreateAgentMessage): Promise<void> {
    try {
      const agentId = uuidv4();
      
      // CRITICAL: Enforce worktree workspace
      let workspace = message.payload.workspace;
      if (!workspace || !workspace.includes('team-dashboard-worktrees')) {
        const timestamp = Date.now();
        const agentName = message.payload.name.toLowerCase().replace(/\s+/g, '-');
        workspace = `/home/codingbutter/GitHub/team-dashboard-worktrees/agent-${agentName}-${timestamp}`;
        console.warn(`[WS AgentManager] ENFORCING WORKTREE: Overriding workspace to ${workspace}`);
      }
      
      // Create OpenAI agent configuration
      const openaiConfig: OpenAIAgentConfig = {
        id: agentId,
        name: message.payload.name,
        model: message.payload.model || 'gpt-4o-mini',
        workspace: workspace,  // Use enforced worktree path
        resourceLimits: message.payload.resourceLimits,
        openaiApiKey: process.env.OPENAI_API_KEY || 'sk-test',
        systemPrompt: message.payload.systemPrompt,
        enableMemento: message.payload.enableMemento ?? true, // Enable by default
        mementoConfig: message.payload.mementoConfig
      };
      
      // Spawn real agent via OpenAI manager
      const agentProcess = await this.openaiManager.spawnAgent(openaiConfig);
      
      // Create agent connection wrapper
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
      
      // Send creation confirmation with real process data
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:created',
        timestamp: Date.now(),
        payload: {
          agentId,
          name: agent.name,
          pid: agentProcess.pid,
          startTime: Date.now(),
          model: message.payload.model,
          workspace: message.payload.workspace
        }
      });
      
      console.log(`[WS] Real agent created: ${agentId} with PID: ${agentProcess.pid}`);
      
    } catch (error) {
      console.error('[WS] Agent creation failed:', error);
      this.sendError(client, ErrorCode.AGENT_SPAWN_FAILED, 'Failed to create agent: ' + (error instanceof Error ? error.message : String(error)));
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
    
    try {
      // Add command to history
      agent.addCommand(message.payload.command);
      
      // Send command to real agent with streaming output
      if (message.payload.command.startsWith('/')) {
        // Terminal command
        await this.openaiManager.sendCommand(message.payload.agentId, message.payload.command.substring(1));
      } else {
        // AI interaction with streaming
        await this.openaiManager.sendMessage(
          message.payload.agentId,
          [{ role: 'user', content: message.payload.command }] as any,
          (chunk: string) => {
            // Stream AI response in real-time
            this.connectionManager.broadcast({
              id: uuidv4(),
              type: 'agent:output',
              timestamp: Date.now(),
              payload: {
                agentId: message.payload.agentId,
                stream: 'ai_response',
                data: chunk,
                timestamp: Date.now(),
                sequence: Date.now()
              }
            } as AgentOutputMessage);
          }
        );
      }
    } catch (error) {
      console.error('[WS] Command execution failed:', error);
      this.sendError(client, ErrorCode.AGENT_EXECUTION_FAILED, 'Command execution failed: ' + (error instanceof Error ? error.message : String(error)));
    }
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
    
    try {
      // Terminate real agent process
      await this.openaiManager.terminateAgent(message.payload.agentId);
      
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
      
      console.log(`[WS] Real agent terminated: ${message.payload.agentId}`);
      
    } catch (error) {
      console.error('[WS] Agent termination failed:', error);
      this.sendError(client, ErrorCode.AGENT_TERMINATION_FAILED, 'Failed to terminate agent: ' + (error instanceof Error ? error.message : String(error)));
    }
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
   * Setup event forwarding from OpenAI manager to WebSocket clients
   */
  private setupOpenAIEvents(): void {
    this.openaiManager.on('agent:ready', (data) => {
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:status',
        timestamp: Date.now(),
        payload: {
          agentId: data.agentId,
          status: 'ready'
        }
      } as AgentStatusMessage);
    });
    
    this.openaiManager.on('agent:output', (data) => {
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:output',
        timestamp: Date.now(),
        payload: {
          agentId: data.agentId,
          stream: data.stream || 'stdout',
          data: data.data,
          timestamp: Date.now(),
          sequence: data.sequence || 1
        }
      } as AgentOutputMessage);
    });
    
    this.openaiManager.on('agent:exit', (data) => {
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:status',
        timestamp: Date.now(),
        payload: {
          agentId: data.agentId,
          status: 'exited',
          exitCode: data.exitCode
        }
      } as AgentStatusMessage);
      
      // Clean up local agent reference
      this.agents.delete(data.agentId);
    });
    
    this.openaiManager.on('agent:spawned', (data) => {
      this.connectionManager.broadcast({
        id: uuidv4(),
        type: 'agent:status',
        timestamp: Date.now(),
        payload: {
          agentId: data.agentId,
          status: 'spawned',
          threadId: data.threadId
        }
      } as AgentStatusMessage);
    });
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
   * Get real agent process for direct access
   */
  getAgentProcess(agentId: string) {
    return this.openaiManager.getAgent(agentId);
  }
  
  /**
   * Get agent communication history
   */
  getAgentCommunications(agentId: string) {
    return this.openaiManager.getCommunicationHistory(agentId);
  }
  
  /**
   * List all active agents
   */
  listActiveAgents() {
    return this.openaiManager.listAgents();
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
    // Terminate all OpenAI managed agents
    this.agents.forEach(async (_agent, agentId) => {
      try {
        await this.openaiManager.terminateAgent(agentId);
      } catch (error) {
        console.error(`Failed to cleanup agent ${agentId}:`, error);
      }
    });
    
    this.agents.clear();
    this.sessions.clear();
  }
}