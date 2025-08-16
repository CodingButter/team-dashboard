/**
 * OpenAI Agent Manager
 * Integrates OpenAI SDK with existing AgentSpawner for agent process management
 */

import OpenAI from 'openai';
import { EventEmitter } from 'events';
import AgentSpawner from './agent-spawner.js';
import { AgentSpawnConfig, AgentProcess, McpStdioConfig, McpEnvironmentVariable } from '@team-dashboard/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

export interface OpenAIAgentConfig extends AgentSpawnConfig {
  openaiApiKey: string;
  openaiModel?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  systemPrompt?: string;
  enableMemento?: boolean;
  mementoConfig?: {
    dbPath?: string;
    maxEntities?: number;
    maxRelations?: number;
  };
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
  private mcpClients: Map<string, Client> = new Map();
  private mementoProcesses: Map<string, any> = new Map();

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

    // CRITICAL: ALWAYS CREATE FRESH WORKTREE - No reuse allowed
    const timestamp = Date.now();
    const agentName = config.name.toLowerCase().replace(/\s+/g, '-');
    const freshWorkspace = `/home/codingbutter/GitHub/team-dashboard-worktrees/agent-${agentName}-${timestamp}`;
    
    console.log(`[OpenAIAgentManager] CREATING FRESH WORKTREE: ${freshWorkspace}`);
    
    // Always override workspace parameter to ensure fresh worktree
    config.workspace = freshWorkspace;
    
    // Create the fresh worktree from development branch
    const { execSync } = await import('child_process');
    try {
      execSync(`git worktree add ${config.workspace} -b feature/${agentName}-${timestamp} development`, {
        cwd: '/home/codingbutter/GitHub/team-dashboard',
        stdio: 'inherit'
      });
      console.log(`[OpenAIAgentManager] ✅ Created fresh worktree at ${config.workspace}`);
      
      // Install dependencies in fresh worktree
      execSync(`pnpm install`, {
        cwd: config.workspace,
        stdio: 'inherit'
      });
      console.log(`[OpenAIAgentManager] ✅ Installed dependencies in fresh worktree`);
      
    } catch (error) {
      console.error(`[OpenAIAgentManager] ❌ Failed to create fresh worktree: ${error}`);
      throw new Error(`Failed to create fresh worktree for agent ${config.name}: ${error}`);
    }

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

    // Initialize Memento MCP if enabled
    let mementoTools: any[] = [];
    if (config.enableMemento) {
      mementoTools = await this.initializeMementoForAgent(config);
    }

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

    // Prepare initial context with memento tools if available
    const initialMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (mementoTools.length > 0) {
      initialMessages.push({
        role: 'system',
        content: 'You have access to Memento knowledge graph memory tools. Use them to store and retrieve context.'
      });
    }

    initialMessages.push({
      role: 'user',
      content: `Agent ${config.name} initialized with ${mementoTools.length > 0 ? 'Memento memory' : 'no memory'}. Ready for tasks.`
    });

    // Send initial system prompt
    await this.sendMessage(config.id, initialMessages as any);

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
        // Get memento tools if available
        const mementoTools = this.getMementoToolsForAgent(agentId);
        
        const stream = await client.chat.completions.create({
          model: 'gpt-4o-mini', // Default model for agent communication
          messages: messages as OpenAI.Chat.ChatCompletionMessage[],
          stream: true,
          max_tokens: 4000,
          temperature: 0.7,
          ...(mementoTools.length > 0 && { tools: mementoTools, tool_choice: 'auto' })
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
        // Get memento tools if available
        const mementoTools = this.getMementoToolsForAgent(agentId);
        
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as OpenAI.Chat.ChatCompletionMessage[],
          max_tokens: 4000,
          temperature: 0.7,
          ...(mementoTools.length > 0 && { tools: mementoTools, tool_choice: 'auto' })
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

    // Cleanup Memento MCP if running
    await this.cleanupMementoForAgent(agentId);

    // Cleanup OpenAI resources
    this.openaiClients.delete(agentId);
    this.agentThreads.delete(agentId);
    this.communications.delete(agentId);
    this.mcpClients.delete(agentId);
    this.mementoProcesses.delete(agentId);

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

  /**
   * Initialize Memento MCP for an agent
   */
  private async initializeMementoForAgent(config: OpenAIAgentConfig): Promise<any[]> {
    try {
      console.log(`[OpenAIAgentManager] Initializing Memento for agent: ${config.id}`);
      
      // Create Memento server configuration
      const mementoServerConfig = await this.createMementoServerConfig(config);
      
      // Start Memento MCP server process
      const mementoProcess = spawn(
        mementoServerConfig.command,
        mementoServerConfig.args,
        {
          cwd: mementoServerConfig.workingDirectory,
          env: this.buildEnvironment(mementoServerConfig.environment || []) as NodeJS.ProcessEnv
        }
      );
      
      // Create MCP client
      const transport = new StdioClientTransport({
        command: mementoServerConfig.command,
        args: mementoServerConfig.args,
        env: this.buildEnvironment(mementoServerConfig.environment || [])
      });
      
      const mcpClient = new Client({
        name: `agent-${config.id}`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });
      
      await mcpClient.connect(transport);
      
      // Store references
      this.mcpClients.set(config.id, mcpClient);
      this.mementoProcesses.set(config.id, mementoProcess);
      
      // Return Memento tools for OpenAI
      return this.getMementoTools();
      
    } catch (error) {
      console.error(`[OpenAIAgentManager] Failed to initialize Memento for agent ${config.id}:`, error);
      return [];
    }
  }

  /**
   * Clean up Memento resources for an agent
   */
  private async cleanupMementoForAgent(agentId: string): Promise<void> {
    try {
      // Close MCP client
      const mcpClient = this.mcpClients.get(agentId);
      if (mcpClient) {
        await mcpClient.close();
      }
      
      // Terminate Memento process
      const mementoProcess = this.mementoProcesses.get(agentId);
      if (mementoProcess) {
        mementoProcess.kill();
      }
      
      console.log(`[OpenAIAgentManager] Cleaned up Memento for agent: ${agentId}`);
    } catch (error) {
      console.warn(`[OpenAIAgentManager] Error cleaning up Memento for agent ${agentId}:`, error);
    }
  }

  /**
   * Create Memento server configuration
   */
  private async createMementoServerConfig(config: OpenAIAgentConfig): Promise<McpStdioConfig> {
    const dbPath = config.mementoConfig?.dbPath || `/tmp/memento/${config.id}`;
    
    return {
      id: `memento_${config.id}`,
      name: `Memento Memory for ${config.name}`,
      description: 'Knowledge graph memory system',
      transport: 'stdio',
      command: 'npx',
      args: [
        '@gannonh/memento-mcp',
        '--db-path', dbPath,
        '--max-entities', String(config.mementoConfig?.maxEntities || 10000),
        '--max-relations', String(config.mementoConfig?.maxRelations || 50000)
      ],
      workingDirectory: process.cwd(),
      enabled: true,
      autoConnect: true,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 5000,
      environment: [
        {
          key: 'OPENAI_API_KEY',
          value: config.openaiApiKey,
          encrypted: true,
          required: true
        }
      ],
      tags: ['memory', 'memento', config.id],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Build environment variables from configuration
   */
  private buildEnvironment(envVars: McpEnvironmentVariable[]): Record<string, string> {
    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    for (const envVar of envVars) {
      env[envVar.key] = envVar.value;
    }
    return env;
  }

  /**
   * Get Memento tools for OpenAI function calling
   */
  private getMementoTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'memento_create_entities',
          description: 'Create entities in the knowledge graph memory',
          parameters: {
            type: 'object',
            properties: {
              entities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    entityType: { type: 'string' },
                    observations: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['name', 'entityType', 'observations']
                }
              }
            },
            required: ['entities']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'memento_search_nodes',
          description: 'Search for nodes in the knowledge graph',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'memento_semantic_search',
          description: 'Perform semantic search in the knowledge graph',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['query']
          }
        }
      }
    ];
  }

  /**
   * Get Memento tools for a specific agent
   */
  private getMementoToolsForAgent(agentId: string): any[] {
    if (this.mcpClients.has(agentId)) {
      return this.getMementoTools();
    }
    return [];
  }
}

export default OpenAIAgentManager;