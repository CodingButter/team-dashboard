/**
 * WebSocket Integration Test
 * Demonstrates basic WebSocket communication and agent lifecycle
 */

import { WebSocket } from 'ws';
import { DashboardWebSocketServer } from '../src/websocket-server';
import { MessageFactory } from '@team-dashboard/types';

describe('WebSocket Integration', () => {
  let server: DashboardWebSocketServer;
  let client: WebSocket;
  const TEST_PORT = 3002;
  const WS_URL = `ws://localhost:${TEST_PORT}`;
  
  beforeAll(() => {
    // Start WebSocket server
    server = new DashboardWebSocketServer(TEST_PORT);
    server.start();
  });
  
  afterAll(() => {
    // Clean up
    if (client) client.close();
    server.stop();
  });
  
  beforeEach((done) => {
    // Create new client for each test
    client = new WebSocket(WS_URL);
    client.on('open', done);
  });
  
  afterEach(() => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  
  describe('Connection Lifecycle', () => {
    test('should establish connection', (done) => {
      expect(client.readyState).toBe(WebSocket.OPEN);
      done();
    });
    
    test('should require authentication within timeout', (done) => {
      // Wait for disconnection due to auth timeout
      client.on('close', () => {
        expect(client.readyState).toBe(WebSocket.CLOSED);
        done();
      });
    }, 6000);
    
    test('should authenticate with valid token', (done) => {
      const authMsg = MessageFactory.createAuth('valid-token', 'test-client');
      
      client.on('message', (data) => {
        const response = JSON.parse(data.toString());
        if (response.type === 'ack' && response.payload.success) {
          done();
        }
      });
      
      client.send(JSON.stringify(authMsg));
    });
    
    test('should reject invalid token', (done) => {
      const authMsg = MessageFactory.createAuth('invalid-token', 'test-client');
      
      client.on('close', () => {
        expect(client.readyState).toBe(WebSocket.CLOSED);
        done();
      });
      
      client.send(JSON.stringify(authMsg));
    });
  });
  
  describe('Heartbeat Mechanism', () => {
    test('should receive ping messages', (done) => {
      // Authenticate first
      const authMsg = MessageFactory.createAuth('valid-token', 'test-client');
      client.send(JSON.stringify(authMsg));
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          expect(message.payload.timestamp).toBeDefined();
          done();
        }
      });
    }, 35000); // Wait for 30s heartbeat interval
    
    test('should respond to ping with pong', (done) => {
      const authMsg = MessageFactory.createAuth('valid-token', 'test-client');
      client.send(JSON.stringify(authMsg));
      
      // Wait for auth, then send ping
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'ack') {
          const pingMsg = MessageFactory.createHeartbeat();
          client.send(JSON.stringify(pingMsg));
        }
        
        if (message.type === 'pong') {
          expect(message.payload.timestamp).toBeDefined();
          done();
        }
      });
    });
  });
  
  describe('Agent Management', () => {
    beforeEach((done) => {
      // Authenticate before each agent test
      const authMsg = MessageFactory.createAuth('valid-token', 'test-client');
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ack' && message.payload.success) {
          done();
        }
      });
      
      client.send(JSON.stringify(authMsg));
    });
    
    test('should create agent', (done) => {
      const createMsg = {
        id: 'msg-1',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'test-agent',
          model: 'claude-3-opus',
          workspace: '/tmp/test-workspace',
          resourceLimits: {
            memory: 512,
            cpu: 50
          }
        }
      };
      
      let receivedCreated = false;
      let receivedAck = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'agent:created') {
          expect(message.payload.agentId).toBeDefined();
          expect(message.payload.name).toBe('test-agent');
          receivedCreated = true;
        }
        
        if (message.type === 'ack' && message.payload.messageId === 'msg-1') {
          expect(message.payload.success).toBe(true);
          receivedAck = true;
        }
        
        if (receivedCreated && receivedAck) {
          done();
        }
      });
      
      client.send(JSON.stringify(createMsg));
    });
    
    test('should send command to agent', (done) => {
      // First create an agent
      const createMsg = {
        id: 'msg-2',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'command-test-agent',
          model: 'claude-3-opus',
          workspace: '/tmp/test-workspace'
        }
      };
      
      let agentId: string;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'agent:created') {
          agentId = message.payload.agentId;
          
          // Send command to agent
          const commandMsg = MessageFactory.createAgentCommand(agentId, 'echo "Hello, Agent!"');
          client.send(JSON.stringify(commandMsg));
        }
        
        if (message.type === 'agent:output' && message.payload.agentId === agentId) {
          expect(message.payload.stream).toBe('stdout');
          expect(message.payload.data).toContain('Hello, Agent!');
          done();
        }
      });
      
      client.send(JSON.stringify(createMsg));
    });
    
    test('should terminate agent', (done) => {
      // Create agent first
      const createMsg = {
        id: 'msg-3',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'terminate-test-agent',
          model: 'claude-3-opus',
          workspace: '/tmp/test-workspace'
        }
      };
      
      let agentId: string;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'agent:created') {
          agentId = message.payload.agentId;
          
          // Terminate agent
          const terminateMsg = {
            id: 'msg-4',
            type: 'agent:terminate',
            timestamp: Date.now(),
            payload: { agentId }
          };
          client.send(JSON.stringify(terminateMsg));
        }
        
        if (message.type === 'agent:status' && 
            message.payload.agentId === agentId && 
            message.payload.status === 'stopped') {
          done();
        }
      });
      
      client.send(JSON.stringify(createMsg));
    });
  });
  
  describe('Subscription Management', () => {
    beforeEach((done) => {
      // Authenticate before each subscription test
      const authMsg = MessageFactory.createAuth('valid-token', 'test-client');
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ack' && message.payload.success) {
          done();
        }
      });
      
      client.send(JSON.stringify(authMsg));
    });
    
    test('should subscribe to metrics', (done) => {
      const subscribeMsg = MessageFactory.createSubscribe('metrics');
      
      let subscribed = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'ack' && !subscribed) {
          subscribed = true;
          // Wait for metrics update
        }
        
        if (message.type === 'metrics:update' && subscribed) {
          expect(message.payload.system).toBeDefined();
          expect(message.payload.system.cpu).toBeDefined();
          expect(message.payload.system.memory).toBeDefined();
          done();
        }
      });
      
      client.send(JSON.stringify(subscribeMsg));
    }, 2000);
    
    test('should subscribe to agent output', (done) => {
      // Create agent first
      const createMsg = {
        id: 'msg-5',
        type: 'agent:create',
        timestamp: Date.now(),
        payload: {
          name: 'subscribe-test-agent',
          model: 'claude-3-opus',
          workspace: '/tmp/test-workspace'
        }
      };
      
      let agentId: string;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'agent:created') {
          agentId = message.payload.agentId;
          
          // Subscribe to agent output
          const subscribeMsg = MessageFactory.createSubscribe('agent', agentId);
          client.send(JSON.stringify(subscribeMsg));
        }
        
        if (message.type === 'agent:output' && message.payload.agentId === agentId) {
          expect(message.payload.stream).toBeDefined();
          expect(message.payload.data).toBeDefined();
          expect(message.payload.sequence).toBeDefined();
          done();
        }
      });
      
      client.send(JSON.stringify(createMsg));
    });
  });
  
  describe('Error Handling', () => {
    beforeEach((done) => {
      const authMsg = MessageFactory.createAuth('valid-token', 'test-client');
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ack' && message.payload.success) {
          done();
        }
      });
      
      client.send(JSON.stringify(authMsg));
    });
    
    test('should handle invalid message format', (done) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'agent:error') {
          expect(message.payload.error.code).toBeDefined();
          expect(message.payload.error.message).toContain('invalid');
          done();
        }
      });
      
      client.send('invalid json');
    });
    
    test('should handle unknown message type', (done) => {
      const unknownMsg = {
        id: 'msg-6',
        type: 'unknown:type',
        timestamp: Date.now(),
        payload: {}
      };
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'agent:error') {
          expect(message.payload.error.message).toContain('Unknown message type');
          done();
        }
      });
      
      client.send(JSON.stringify(unknownMsg));
    });
    
    test('should handle agent not found', (done) => {
      const commandMsg = MessageFactory.createAgentCommand('non-existent-agent', 'test');
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'agent:error') {
          expect(message.payload.error.code).toBe('2001');
          expect(message.payload.error.message).toContain('not found');
          done();
        }
      });
      
      client.send(JSON.stringify(commandMsg));
    });
  });
});

// Export for other test files
export { TEST_PORT, WS_URL };