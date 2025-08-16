/**
 * Test WebSocket Client
 * Simple client to test WebSocket server functionality
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const WS_URL = 'ws://localhost:3003';

console.log(`[Test Client] Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

// Connection opened
ws.on('open', () => {
  console.log('[Test Client] Connected to WebSocket server');
  
  // Send authentication message
  const authMessage = {
    id: uuidv4(),
    type: 'auth',
    payload: {
      token: 'test-token-123',
      clientType: 'dashboard'
    }
  };
  
  console.log('[Test Client] Sending auth message:', authMessage);
  ws.send(JSON.stringify(authMessage));
  
  // Test agent spawn after auth
  setTimeout(() => {
    const spawnMessage = {
      id: uuidv4(),
      type: 'agent:spawn',
      payload: {
        name: 'TestAgent',
        model: 'claude-3-opus',
        workspace: '/tmp/test-workspace',
        environment: {
          TEST_ENV: 'true'
        }
      }
    };
    
    console.log('[Test Client] Sending spawn message:', spawnMessage);
    ws.send(JSON.stringify(spawnMessage));
  }, 1000);
});

// Handle messages
ws.on('message', (data: Buffer) => {
  const message = JSON.parse(data.toString());
  console.log('[Test Client] Received message:', message);
  
  // Respond to ping with pong
  if (message.type === 'ping') {
    const pongMessage = {
      id: uuidv4(),
      type: 'pong',
      payload: { timestamp: Date.now() }
    };
    ws.send(JSON.stringify(pongMessage));
  }
});

// Handle errors
ws.on('error', (error) => {
  console.error('[Test Client] Error:', error);
});

// Handle close
ws.on('close', (code, reason) => {
  console.log(`[Test Client] Connection closed. Code: ${code}, Reason: ${reason}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Test Client] Shutting down...');
  ws.close();
  process.exit(0);
});