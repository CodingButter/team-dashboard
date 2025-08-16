/**
 * HTTP Server for Agent Management API
 * Provides REST endpoints for spawning and managing agents
 */

import Fastify from 'fastify';
import OpenAIAgentManager, { OpenAIAgentConfig } from './agents/openai-agent-manager.js';
import { v4 as uuidv4 } from 'uuid';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Initialize agent manager
const agentManager = new OpenAIAgentManager();

// CORS support
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Routes
fastify.register(async function (fastify) {
  
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // List all agents
  fastify.get('/agents', async () => {
    const agents = agentManager.listAgents();
    return {
      agents: agents.map(agent => ({
        id: agent.id,
        pid: agent.pid,
        status: agent.status,
        startTime: agent.startTime,
        resourceUsage: agent.resourceUsage,
      })),
      count: agents.length
    };
  });

  // Get specific agent
  fastify.get<{ Params: { agentId: string } }>('/agents/:agentId', async (request, reply) => {
    const { agentId } = request.params;
    const agent = agentManager.getAgent(agentId);
    
    if (!agent) {
      return reply.code(404).send({ error: 'Agent not found' });
    }

    return {
      id: agent.id,
      pid: agent.pid,
      status: agent.status,
      startTime: agent.startTime,
      resourceUsage: agent.resourceUsage,
    };
  });

  // Spawn new agent
  fastify.post<{ Body: Partial<OpenAIAgentConfig> }>('/agents', async (request, reply) => {
    try {
      const config = request.body;
      
      // Validate required fields
      if (!config.openaiApiKey) {
        return reply.code(400).send({ error: 'openaiApiKey is required' });
      }

      // Generate defaults
      const agentConfig: OpenAIAgentConfig = {
        id: config.id || uuidv4(),
        name: config.name || `Agent-${Date.now()}`,
        workspace: config.workspace || process.cwd(),
        openaiApiKey: config.openaiApiKey,
        openaiModel: config.openaiModel || 'gpt-4o-mini',
        model: (config.model as any) || 'claude-3-opus',
        environment: config.environment || {},
        resourceLimits: config.resourceLimits,
        ptyOptions: config.ptyOptions,
        systemPrompt: config.systemPrompt,
      };

      const agent = await agentManager.spawnAgent(agentConfig);

      return reply.code(201).send({
        id: agent.id,
        pid: agent.pid,
        status: agent.status,
        startTime: agent.startTime,
        message: 'Agent spawned successfully'
      });
    } catch (error: any) {
      fastify.log.error('Error spawning agent:', error);
      return reply.code(500).send({ 
        error: 'Failed to spawn agent', 
        details: error?.message || 'Unknown error'
      });
    }
  });

  // Send message to agent
  fastify.post<{ 
    Params: { agentId: string },
    Body: { messages: any[], stream?: boolean }
  }>('/agents/:agentId/message', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { messages, stream = false } = request.body;

      if (!messages || !Array.isArray(messages)) {
        return reply.code(400).send({ error: 'messages array is required' });
      }

      if (stream) {
        // Set up streaming response
        reply.type('text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

        let responseComplete = false;
        const streamCallback = (chunk: string) => {
          if (!responseComplete) {
            reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        };

        try {
          const response = await agentManager.sendMessage(agentId, messages, streamCallback);
          reply.raw.write(`data: ${JSON.stringify({ complete: true, fullResponse: response })}\n\n`);
          responseComplete = true;
          reply.raw.end();
          return;
        } catch (error: any) {
          reply.raw.write(`data: ${JSON.stringify({ error: error?.message || 'Unknown error' })}\n\n`);
          responseComplete = true;
          reply.raw.end();
          return;
        }
      } else {
        // Regular response
        const response = await agentManager.sendMessage(agentId, messages);
        return { response, timestamp: Date.now() };
      }
    } catch (error: any) {
      fastify.log.error('Error sending message:', error);
      return reply.code(500).send({ 
        error: 'Failed to send message', 
        details: error?.message || 'Unknown error'
      });
    }
  });

  // Send command to agent terminal
  fastify.post<{ 
    Params: { agentId: string },
    Body: { command: string }
  }>('/agents/:agentId/command', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { command } = request.body;

      if (!command) {
        return reply.code(400).send({ error: 'command is required' });
      }

      await agentManager.sendCommand(agentId, command);
      return { message: 'Command sent successfully', timestamp: Date.now() };
    } catch (error: any) {
      fastify.log.error('Error sending command:', error);
      return reply.code(500).send({ 
        error: 'Failed to send command', 
        details: error?.message || 'Unknown error'
      });
    }
  });

  // Get agent communication history
  fastify.get<{ Params: { agentId: string } }>('/agents/:agentId/history', async (request, reply) => {
    try {
      const { agentId } = request.params;
      const history = agentManager.getCommunicationHistory(agentId);
      return { history, count: history.length };
    } catch (error: any) {
      fastify.log.error('Error fetching history:', error);
      return reply.code(500).send({ 
        error: 'Failed to fetch history', 
        details: error?.message || 'Unknown error'
      });
    }
  });

  // Terminate agent
  fastify.delete<{ Params: { agentId: string } }>('/agents/:agentId', async (request, reply) => {
    try {
      const { agentId } = request.params;
      await agentManager.terminateAgent(agentId);
      return { message: 'Agent terminated successfully', timestamp: Date.now() };
    } catch (error: any) {
      fastify.log.error('Error terminating agent:', error);
      return reply.code(500).send({ 
        error: 'Failed to terminate agent', 
        details: error?.message || 'Unknown error'
      });
    }
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3003');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Agent Manager HTTP Server running on http://${host}:${port}`);
    console.log('Available endpoints:');
    console.log('  GET    /health');
    console.log('  GET    /agents');
    console.log('  POST   /agents');
    console.log('  GET    /agents/:id');
    console.log('  POST   /agents/:id/message');
    console.log('  POST   /agents/:id/command');
    console.log('  GET    /agents/:id/history');
    console.log('  DELETE /agents/:id');
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down agent manager...');
  await fastify.close();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export default fastify;