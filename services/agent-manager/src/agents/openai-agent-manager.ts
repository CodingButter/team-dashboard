/**
 * OpenAI Agent Manager
 * Integrates OpenAI SDK with existing AgentSpawner for agent process management
 */

import OpenAI from 'openai';
import { EventEmitter } from 'events';
import AgentSpawner from './agent-spawner.js';
import { AgentSpawnConfig, AgentProcess } from '@team-dashboard/types';

export interface OpenAIAgentConfig extends AgentSpawnConfig {
  openaiApiKey: string;
  openaiModel?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  systemPrompt?: string;
}

export interface AgentCommunication {
  agentId: string;
  threadId?: string;
  messages: OpenAI.Chat.ChatCompletionMessage[];
  response?: string;
  timestamp: number;
}

/**
 * Manages agents with OpenAI SDK integration
 */
export class OpenAIAgentManager extends EventEmitter {
  private spawner: AgentSpawner;
  private openaiClients: Map<string, OpenAI> = new Map();
  private agentThreads: Map<string, string> = new Map();
  private communications: Map<string, AgentCommunication[]> = new Map();

  constructor() {
    super();
    this.spawner = new AgentSpawner();
    this.setupSpawnerEvents();
  }

  /**
   * Spawn an agent with OpenAI integration
   */
  async spawnAgent(config: OpenAIAgentConfig): Promise<AgentProcess> {
    console.log(`[OpenAIAgentManager] Spawning OpenAI agent: ${config.name}`);

    // Validate OpenAI configuration
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Create OpenAI client for this agent
    const openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    // Store client
    this.openaiClients.set(config.id, openaiClient);
    this.communications.set(config.id, []);

    // Create system prompt for Claude Code agent
    const systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt(config);

    // Spawn the underlying process
    const agentProcess = await this.spawner.spawn(config);

    // Initialize OpenAI thread if using Assistants API
    try {
      const thread = await openaiClient.beta.threads.create();
      this.agentThreads.set(config.id, thread.id);
      console.log(`[OpenAIAgentManager] Created thread ${thread.id} for agent ${config.id}`);
    } catch (error) {
      console.warn(`[OpenAIAgentManager] Could not create thread for agent ${config.id}:`, error);
    }

    // Send initial system prompt
    await this.sendMessage(config.id, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Agent ${config.name} initialized. Ready for tasks.` }
    ] as any);

    this.emit('agent:spawned', { agentId: config.id, threadId: this.agentThreads.get(config.id) });

    return agentProcess;
  }

  /**
   * Send message to agent via OpenAI
   */
  async sendMessage(
    agentId: string, 
    messages: OpenAI.Chat.ChatCompletionMessage[],
    streamCallback?: (chunk: string) => void
  ): Promise<string | null> {
    const client = this.openaiClients.get(agentId);
    if (!client) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const communication: AgentCommunication = {
      agentId,
      threadId: this.agentThreads.get(agentId),
      messages,
      timestamp: Date.now(),
    };

    try {
      if (streamCallback) {
        // Streaming response
        const stream = await client.chat.completions.create({
          model: 'gpt-4o-mini', // Default model for agent communication
          messages: messages as OpenAI.Chat.ChatCompletionMessage[],
          stream: true,
          max_tokens: 4000,
          temperature: 0.7,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            streamCallback(content);
          }
        }

        communication.response = fullResponse;
        this.storeCommunication(agentId, communication);
        
        return fullResponse;
      } else {
        // Non-streaming response
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as OpenAI.Chat.ChatCompletionMessage[],
          max_tokens: 4000,
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content || '';
        communication.response = content;
        this.storeCommunication(agentId, communication);

        return content;
      }
    } catch (error) {
      console.error(`[OpenAIAgentManager] Error sending message to agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Send command to agent's terminal
   */
  async sendCommand(agentId: string, command: string): Promise<void> {
    const agent = this.spawner.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Send to terminal
    agent.write(command + '\n');

    // Also send via OpenAI for context
    await this.sendMessage(agentId, [
      { role: 'user', content: `Execute command: ${command}` }
    ] as any);
  }

  /**
   * Terminate agent and cleanup resources
   */
  async terminateAgent(agentId: string): Promise<void> {
    console.log(`[OpenAIAgentManager] Terminating agent: ${agentId}`);

    // Terminate underlying process
    await this.spawner.kill(agentId);

    // Cleanup OpenAI resources
    this.openaiClients.delete(agentId);
    this.agentThreads.delete(agentId);
    this.communications.delete(agentId);

    this.emit('agent:terminated', { agentId });
  }

  /**
   * Get agent process
   */
  getAgent(agentId: string): AgentProcess | undefined {
    return this.spawner.getAgent(agentId);
  }

  /**
   * List all agents
   */
  listAgents(): AgentProcess[] {
    return this.spawner.listAgents();
  }

  /**
   * Get agent communication history
   */
  getCommunicationHistory(agentId: string): AgentCommunication[] {
    return this.communications.get(agentId) || [];
  }

  /**
   * Setup event forwarding from spawner
   */
  private setupSpawnerEvents(): void {
    this.spawner.on('agent:ready', (data) => this.emit('agent:ready', data));
    this.spawner.on('agent:output', (data) => this.emit('agent:output', data));
    this.spawner.on('agent:exit', (data) => {
      // Cleanup on agent exit
      this.openaiClients.delete(data.agentId);
      this.agentThreads.delete(data.agentId);
      this.communications.delete(data.agentId);
      this.emit('agent:exit', data);
    });
  }

  /**
   * Store communication in history
   */
  private storeCommunication(agentId: string, communication: AgentCommunication): void {
    const history = this.communications.get(agentId) || [];
    history.push(communication);
    
    // Keep only last 50 communications per agent
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.communications.set(agentId, history);
  }

  /**
   * Generate default system prompt for Claude Code agents
   */
  private getDefaultSystemPrompt(config: OpenAIAgentConfig): string {
    return `You are ${config.name}, a Claude Code agent working in the Team Management Dashboard.

Your role: ${config.model || 'gpt-4o-mini'} model assistant
Workspace: ${config.workspace}
Agent ID: ${config.id}

You can:
- Execute terminal commands
- Access files in your workspace
- Communicate with other agents
- Use MCP tools and services

Follow these guidelines:
- Be concise and focused on tasks
- Always confirm before executing destructive operations
- Report progress and status clearly
- Coordinate with other agents when needed

Ready to assist with development tasks.`;
  }
}

export default OpenAIAgentManager;