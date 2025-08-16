#!/usr/bin/env node

/**
 * Manual test script for Memento MCP integration
 */

import { OpenAIAgentManager } from './dist/agents/openai-agent-manager.js';

async function testMementoIntegration() {
  console.log('Testing Memento MCP Integration...\n');
  
  const manager = new OpenAIAgentManager();
  
  try {
    // Spawn agent with Memento enabled
    console.log('1. Spawning agent with Memento enabled...');
    const config = {
      id: 'memento-test-agent',
      name: 'Memento Test Agent',
      model: 'claude-code',
      workspace: '/tmp/memento-test',
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: 'gpt-4o-mini',
      enableMemento: true,
      mementoConfig: {
        maxEntities: 1000,
        maxRelations: 5000
      }
    };
    
    const agent = await manager.spawnAgent(config);
    console.log('✓ Agent spawned:', agent.id);
    
    // Test memory creation
    console.log('\n2. Testing memory creation...');
    const createResponse = await manager.sendMessage('memento-test-agent', [
      {
        role: 'user',
        content: 'Store in your memory: Project "TeamDashboard" is a monorepo with services for agent management'
      }
    ]);
    console.log('✓ Memory creation response:', createResponse?.substring(0, 100) + '...');
    
    // Test memory retrieval
    console.log('\n3. Testing memory retrieval...');
    const searchResponse = await manager.sendMessage('memento-test-agent', [
      {
        role: 'user',
        content: 'Search your memory for information about TeamDashboard'
      }
    ]);
    console.log('✓ Memory search response:', searchResponse?.substring(0, 100) + '...');
    
    // Test semantic search
    console.log('\n4. Testing semantic search...');
    const semanticResponse = await manager.sendMessage('memento-test-agent', [
      {
        role: 'user',
        content: 'What do you know about monorepo projects?'
      }
    ]);
    console.log('✓ Semantic search response:', semanticResponse?.substring(0, 100) + '...');
    
    // Get communication history
    console.log('\n5. Getting communication history...');
    const history = manager.getCommunicationHistory('memento-test-agent');
    console.log('✓ Communication history entries:', history.length);
    
    // Terminate agent
    console.log('\n6. Terminating agent...');
    await manager.terminateAgent('memento-test-agent');
    console.log('✓ Agent terminated successfully');
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testMementoIntegration().catch(console.error);