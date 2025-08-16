# WebSocket Communication Protocol Specification

## Overview

This document defines the WebSocket communication protocol for bidirectional real-time communication between the Team Dashboard frontend and backend services. This protocol enables agent management, real-time output streaming, and system monitoring.

## Connection Management

### WebSocket Endpoint
```
ws://localhost:3001/ws
wss://dashboard.team.dev/ws (production)
```

### Authentication
```typescript
// Initial handshake with JWT token
interface AuthMessage {
  type: 'auth';
  token: string; // JWT token
  clientId: string; // Unique client identifier
}
```

### Connection Lifecycle
1. **Connection**: Client connects to WebSocket endpoint
2. **Authentication**: Client sends auth message within 5 seconds
3. **Acknowledgment**: Server validates and sends connection status
4. **Heartbeat**: Ping/pong every 30 seconds to maintain connection
5. **Reconnection**: Automatic reconnection with exponential backoff

## Message Format

### Base Message Structure
```typescript
interface WSMessage<T = any> {
  id: string;           // Unique message ID (UUID v4)
  type: MessageType;    // Message type identifier
  timestamp: number;    // Unix timestamp in milliseconds
  payload: T;          // Type-specific payload
  metadata?: {
    correlationId?: string;  // For request/response correlation
    agentId?: string;       // Associated agent ID
    priority?: 'low' | 'normal' | 'high';
  };
}
```

## Message Types

### Client to Server Messages

#### Agent Management
```typescript
// Create new agent instance
interface CreateAgentMessage {
  type: 'agent:create';
  payload: {
    name: string;
    model: 'claude-3-opus' | 'claude-3-sonnet';
    workspace: string;
    environment?: Record<string, string>;
    resourceLimits?: {
      memory: number; // MB
      cpu: number;    // Cores
    };
  };
}

// Send command to agent
interface AgentCommandMessage {
  type: 'agent:command';
  payload: {
    agentId: string;
    command: string;
    interactive?: boolean;
    timeout?: number; // milliseconds
  };
}

// Terminate agent
interface TerminateAgentMessage {
  type: 'agent:terminate';
  payload: {
    agentId: string;
    force?: boolean;
  };
}

// Pause/Resume agent
interface AgentControlMessage {
  type: 'agent:pause' | 'agent:resume';
  payload: {
    agentId: string;
  };
}
```

#### Subscriptions
```typescript
// Subscribe to agent output
interface SubscribeMessage {
  type: 'subscribe:agent' | 'subscribe:metrics' | 'subscribe:logs';
  payload: {
    agentId?: string;    // Optional for agent-specific subscriptions
    filters?: string[];  // Event filters
  };
}

// Unsubscribe
interface UnsubscribeMessage {
  type: 'unsubscribe';
  payload: {
    subscriptionId: string;
  };
}
```

### Server to Client Messages

#### Agent Events
```typescript
// Agent status updates
interface AgentStatusMessage {
  type: 'agent:status';
  payload: {
    agentId: string;
    status: 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'crashed';
    details?: {
      pid?: number;
      uptime?: number;
      lastActivity?: number;
    };
  };
}

// Agent output (stdout/stderr)
interface AgentOutputMessage {
  type: 'agent:output';
  payload: {
    agentId: string;
    stream: 'stdout' | 'stderr';
    data: string;
    timestamp: number;
    sequence: number; // For ordering
  };
}

// Agent created confirmation
interface AgentCreatedMessage {
  type: 'agent:created';
  payload: {
    agentId: string;
    name: string;
    pid: number;
    startTime: number;
  };
}

// Agent error
interface AgentErrorMessage {
  type: 'agent:error';
  payload: {
    agentId: string;
    error: {
      code: string;
      message: string;
      stack?: string;
    };
  };
}
```

#### System Events
```typescript
// System metrics update
interface MetricsUpdateMessage {
  type: 'metrics:update';
  payload: {
    system: {
      cpu: {
        usage: number;      // Percentage
        cores: number;
        temperature?: number;
      };
      memory: {
        total: number;      // Bytes
        used: number;       // Bytes
        available: number;  // Bytes
        percent: number;
      };
      disk: {
        total: number;
        used: number;
        percent: number;
      };
      network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
      };
    };
    agents?: Array<{
      agentId: string;
      cpu: number;
      memory: number;
      threads: number;
    }>;
  };
}

// System alert
interface SystemAlertMessage {
  type: 'system:alert';
  payload: {
    level: 'info' | 'warning' | 'error' | 'critical';
    category: 'resource' | 'performance' | 'security' | 'agent';
    message: string;
    details?: any;
  };
}
```

#### Control Messages
```typescript
// Acknowledgment
interface AckMessage {
  type: 'ack';
  payload: {
    messageId: string;
    success: boolean;
    error?: string;
  };
}

// Heartbeat
interface HeartbeatMessage {
  type: 'ping' | 'pong';
  payload: {
    timestamp: number;
  };
}
```

## Error Codes

```typescript
enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_FAILED = 1001,
  TOKEN_EXPIRED = 1002,
  INSUFFICIENT_PERMISSIONS = 1003,
  
  // Agent errors (2xxx)
  AGENT_NOT_FOUND = 2001,
  AGENT_SPAWN_FAILED = 2002,
  AGENT_LIMIT_EXCEEDED = 2003,
  AGENT_COMMAND_TIMEOUT = 2004,
  
  // System errors (3xxx)
  RESOURCE_EXHAUSTED = 3001,
  SERVICE_UNAVAILABLE = 3002,
  INTERNAL_ERROR = 3003,
  
  // Protocol errors (4xxx)
  INVALID_MESSAGE = 4001,
  UNSUPPORTED_TYPE = 4002,
  RATE_LIMIT_EXCEEDED = 4003,
}
```

## Session Management

### Session State
```typescript
interface SessionState {
  sessionId: string;
  userId: string;
  connectedAt: number;
  lastActivity: number;
  subscriptions: Set<string>;
  agents: Map<string, AgentInfo>;
}
```

### Reconnection Protocol
1. Client stores session ID locally
2. On disconnect, client attempts reconnection with session ID
3. Server restores subscriptions and agent associations
4. Missed messages are queued and delivered (up to 1000 messages)

## Rate Limiting

- **Commands**: 10 per second per agent
- **Subscriptions**: 100 active subscriptions per connection
- **Messages**: 100 per second per connection
- **Reconnections**: Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s)

## Security Considerations

1. **Authentication**: JWT tokens with 1-hour expiry
2. **Authorization**: Role-based access control for agent operations
3. **Input Validation**: All commands sanitized before execution
4. **Rate Limiting**: Per-user and per-IP limits
5. **Encryption**: TLS 1.3 for production WebSocket connections

## Implementation Example

### Client Connection
```typescript
class DashboardWebSocket {
  private ws: WebSocket;
  private messageQueue: WSMessage[] = [];
  private subscriptions = new Map<string, (data: any) => void>();
  
  connect(token: string) {
    this.ws = new WebSocket('ws://localhost:3001/ws');
    
    this.ws.onopen = () => {
      // Authenticate
      this.send({
        type: 'auth',
        payload: { token, clientId: generateId() }
      });
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as WSMessage;
      this.handleMessage(message);
    };
    
    // Implement reconnection logic
    this.ws.onclose = () => this.reconnect();
  }
  
  sendCommand(agentId: string, command: string) {
    return this.send({
      type: 'agent:command',
      payload: { agentId, command }
    });
  }
}
```

### Server Handler
```typescript
class WebSocketHandler {
  handleConnection(ws: WebSocket, req: Request) {
    const session = new SessionState();
    
    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString()) as WSMessage;
      
      switch (message.type) {
        case 'auth':
          await this.handleAuth(ws, session, message);
          break;
        case 'agent:command':
          await this.handleAgentCommand(ws, session, message);
          break;
        // ... other handlers
      }
    });
    
    // Set up heartbeat
    const heartbeat = setInterval(() => {
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    }, 30000);
    
    ws.on('close', () => {
      clearInterval(heartbeat);
      this.cleanupSession(session);
    });
  }
}
```

## Performance Targets

- **Connection Time**: < 100ms
- **Message Latency**: < 50ms (p99)
- **Throughput**: 10,000 messages/second per server
- **Concurrent Connections**: 1,000 per server
- **Message Size Limit**: 1MB per message

## Monitoring & Debugging

### Metrics to Track
- Connection count
- Message rate (in/out)
- Error rate by type
- Latency percentiles
- Reconnection frequency
- Queue depths

### Debug Mode
Enable verbose logging with `DEBUG=ws:*` environment variable

## Version History

- v1.0.0 (2025-01-16): Initial protocol specification