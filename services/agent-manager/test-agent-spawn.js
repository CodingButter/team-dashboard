#!/usr/bin/env node

/**
 * Quick test script for agent spawning functionality
 * Tests the basic agent spawn/terminate/communicate cycle
 */

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const baseUrl = 'http://localhost:3003';

async function testAgentSpawning() {
  console.log('🧪 Testing Agent Spawning with OpenAI Integration');
  console.log('================================================');

  try {
    // 1. Check server health
    console.log('\n1. Checking server health...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server is healthy:', healthData);

    // 2. Spawn a new agent
    console.log('\n2. Spawning new agent...');
    const spawnResponse = await fetch(`${baseUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TestAgent',
        workspace: '/tmp',
        openaiApiKey: apiKey,
        openaiModel: 'gpt-4o-mini',
        systemPrompt: 'You are a test agent for the Team Dashboard. Respond briefly and helpfully.'
      })
    });

    if (!spawnResponse.ok) {
      throw new Error(`Failed to spawn agent: ${spawnResponse.status}`);
    }

    const spawnData = await spawnResponse.json();
    console.log('✅ Agent spawned:', spawnData);
    const agentId = spawnData.id;

    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. List agents
    console.log('\n3. Listing agents...');
    const listResponse = await fetch(`${baseUrl}/agents`);
    const listData = await listResponse.json();
    console.log('✅ Active agents:', listData);

    // 4. Send a test message
    console.log('\n4. Sending test message...');
    const messageResponse = await fetch(`${baseUrl}/agents/${agentId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello! Can you tell me what your role is?' }
        ]
      })
    });

    const messageData = await messageResponse.json();
    console.log('✅ Agent response:', messageData.response);

    // 5. Send a terminal command
    console.log('\n5. Sending terminal command...');
    const cmdResponse = await fetch(`${baseUrl}/agents/${agentId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'echo "Hello from agent terminal!"'
      })
    });

    const cmdData = await cmdResponse.json();
    console.log('✅ Command sent:', cmdData);

    // 6. Get communication history
    console.log('\n6. Fetching communication history...');
    const historyResponse = await fetch(`${baseUrl}/agents/${agentId}/history`);
    const historyData = await historyResponse.json();
    console.log('✅ Communication history:', historyData.count, 'entries');

    // 7. Terminate agent
    console.log('\n7. Terminating agent...');
    const terminateResponse = await fetch(`${baseUrl}/agents/${agentId}`, {
      method: 'DELETE'
    });

    const terminateData = await terminateResponse.json();
    console.log('✅ Agent terminated:', terminateData);

    console.log('\n🎉 All tests passed! Agent spawning is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAgentSpawning();
}