/**
 * @test memento-integration
 * Integration tests for Memento MCP with OpenAI agents
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenAIAgentManager } from '../src/agents/openai-agent-manager';
import { AgentSpawnConfig } from '@team-dashboard/types';

describe('Memento MCP Integration', () => {
  let agentManager: OpenAIAgentManager;
  const testAgentId = 'test-memento-agent';
  
  beforeAll(() => {
    agentManager = new OpenAIAgentManager();
  });
  
  afterAll(async () => {
    // Cleanup all agents
    const agents = agentManager.listAgents();
    for (const agent of agents) {
      await agentManager.terminateAgent(agent.id);
    }
  });
  
  it('should spawn agent with memento enabled', async () => {
    const config = {
      id: testAgentId,
      name: 'Test Memento Agent',
      model: 'claude-code',
      workspace: '/tmp/test-workspace',
      openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
      openaiModel: 'gpt-4o-mini' as const,
      enableMemento: true,
      mementoConfig: {
        maxEntities: 100,
        maxRelations: 500
      }
    };
    
    const agent = await agentManager.spawnAgent(config);
    
    expect(agent).toBeDefined();
    expect(agent.id).toBe(testAgentId);
    expect(agent.status).toBe('running');
  });
  
  it('should send message with memento tools', async () => {
    const response = await agentManager.sendMessage(testAgentId, [
      { 
        role: 'user', 
        content: 'Create an entity in your memory for "TestProject" with type "project"' 
      }
    ] as any);
    
    expect(response).toBeDefined();
    // Response should acknowledge memento capability
    expect(response).toContain('memory');
  });
  
  it('should retrieve agent communication history', () => {
    const history = agentManager.getCommunicationHistory(testAgentId);
    
    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
  });
  
  it('should terminate agent and cleanup memento', async () => {
    await agentManager.terminateAgent(testAgentId);
    
    const agent = agentManager.getAgent(testAgentId);
    expect(agent).toBeUndefined();
  });
  
  it('should spawn agent without memento when not enabled', async () => {
    const config = {
      id: 'no-memento-agent',
      name: 'No Memento Agent',
      model: 'claude-code',
      workspace: '/tmp/test-workspace',
      openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
      openaiModel: 'gpt-4o-mini' as const,
      enableMemento: false
    };
    
    const agent = await agentManager.spawnAgent(config);
    
    expect(agent).toBeDefined();
    
    const response = await agentManager.sendMessage('no-memento-agent', [
      { role: 'user', content: 'What tools do you have?' }
    ] as any);
    
    expect(response).toBeDefined();
    
    await agentManager.terminateAgent('no-memento-agent');
  });
});