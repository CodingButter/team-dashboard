# WebSocket Server Refactoring Plan

## Overview

The current `websocket-server.ts` file (552 lines) violates our 200-line limit and needs to be refactored into smaller, focused modules following separation of concerns principles.

## Current Structure Analysis

The existing file contains:
- WebSocket server initialization
- Client connection management
- Message routing and handling
- Agent lifecycle management
- Subscription management
- Authentication logic
- Metrics publishing
- Session management

## Proposed Module Structure

### 1. Core WebSocket Server (`websocket-server.ts`) - 150 lines
**Responsibility**: Main server initialization and coordination
```typescript
export class DashboardWebSocketServer {
  private connectionManager: ClientConnectionManager;
  private messageRouter: MessageRouter;
  private agentManager: AgentProcessManager;
  
  constructor(config: ServerConfig);
  start(): void;
  stop(): void;
}
```

### 2. Client Connection Manager (`client-connection-manager.ts`) - 180 lines
**Responsibility**: Manage client connections, authentication, and sessions
```typescript
export class ClientConnectionManager {
  addConnection(ws: WebSocket): ClientConnection;
  removeConnection(clientId: string): void;
  authenticate(client: ClientConnection, token: string): Promise<boolean>;
  getConnection(clientId: string): ClientConnection | undefined;
  broadcast(message: WSMessage, filter?: (client: ClientConnection) => boolean): void;
  handleHeartbeat(client: ClientConnection): void;
}
```

### 3. Message Router (`message-router.ts`) - 150 lines
**Responsibility**: Route messages to appropriate handlers
```typescript
export class MessageRouter {
  registerHandler(type: MessageType, handler: MessageHandler): void;
  route(client: ClientConnection, message: WSMessage): Promise<void>;
  sendAck(client: ClientConnection, messageId: string, success: boolean): void;
  sendError(client: ClientConnection, code: ErrorCode, message: string): void;
}
```

### 4. Agent Process Manager (`agent-process-manager.ts`) - 200 lines
**Responsibility**: Manage agent lifecycle and process spawning
```typescript
export class AgentProcessManager implements IAgentProcessManager {
  spawn(config: AgentSpawnConfig): Promise<AgentProcess>;
  kill(agentId: string, signal?: string): Promise<void>;
  pause(agentId: string): Promise<void>;
  resume(agentId: string): Promise<void>;
  write(agentId: string, data: string): void;
  getProcess(agentId: string): AgentProcess | undefined;
}
```

### 5. Subscription Manager (`subscription-manager.ts`) - 180 lines
**Responsibility**: Handle client subscriptions to various data streams
```typescript
export class SubscriptionManager {
  subscribe(client: ClientConnection, type: SubscriptionType, params: any): string;
  unsubscribe(subscriptionId: string): void;
  publish(type: SubscriptionType, data: any): void;
  getSubscriptions(clientId: string): Subscription[];
}
```

### 6. Metrics Publisher (`metrics-publisher.ts`) - 150 lines
**Responsibility**: Collect and publish system/agent metrics
```typescript
export class MetricsPublisher {
  startCollection(interval: number): void;
  stopCollection(): void;
  collectSystemMetrics(): SystemMetrics;
  collectAgentMetrics(agentId: string): AgentMetrics;
  publishMetrics(subscriptions: Subscription[]): void;
}
```

### 7. Session Manager (`session-manager.ts`) - 120 lines
**Responsibility**: Manage user sessions and persistence
```typescript
export class SessionManager {
  createSession(userId: string): DashboardSession;
  getSession(sessionId: string): DashboardSession | undefined;
  updateSession(sessionId: string, data: Partial<DashboardSession>): void;
  persistSession(sessionId: string): Promise<void>;
  restoreSession(sessionId: string): Promise<DashboardSession>;
}
```

### 8. Message Handlers (`handlers/`) - Multiple files, each <100 lines
Individual handler files for each message type:
- `auth-handler.ts`
- `agent-create-handler.ts`
- `agent-command-handler.ts`
- `agent-control-handler.ts`
- `subscription-handler.ts`

## Implementation Strategy

### Phase 1: Create Interfaces and Base Classes
1. Define all interfaces in `packages/types`
2. Create abstract base classes
3. Set up dependency injection pattern

### Phase 2: Extract Modules
1. Start with `ClientConnectionManager` (least dependencies)
2. Extract `MessageRouter` 
3. Extract `SubscriptionManager`
4. Extract `MetricsPublisher`
5. Extract `SessionManager`
6. Extract `AgentProcessManager` (most complex)

### Phase 3: Implement Message Handlers
1. Create handler interface
2. Implement individual handlers
3. Register handlers with router

### Phase 4: Integration
1. Update main server class
2. Wire up dependencies
3. Add integration tests

## File Organization

```
services/agent-manager/src/
├── websocket-server.ts           # Main server (150 lines)
├── core/
│   ├── client-connection-manager.ts
│   ├── message-router.ts
│   ├── session-manager.ts
│   └── subscription-manager.ts
├── agents/
│   ├── agent-process-manager.ts
│   ├── agent-process.ts
│   └── resource-monitor.ts
├── metrics/
│   ├── metrics-publisher.ts
│   ├── system-metrics.ts
│   └── agent-metrics.ts
├── handlers/
│   ├── auth-handler.ts
│   ├── agent-create-handler.ts
│   ├── agent-command-handler.ts
│   ├── agent-control-handler.ts
│   └── subscription-handler.ts
└── utils/
    ├── validation.ts
    ├── sanitization.ts
    └── rate-limiter.ts
```

## Testing Strategy

### Unit Tests
- Each module tested independently
- Mock dependencies
- Test error scenarios
- Validate state transitions

### Integration Tests
- Test module interactions
- End-to-end message flow
- Connection lifecycle
- Subscription delivery

### Performance Tests
- Connection throughput
- Message routing performance
- Memory usage under load
- Resource cleanup

## Migration Path

1. **Week 1, Day 1**: 
   - Create new module structure
   - Implement interfaces
   - Begin extraction

2. **Week 1, Day 2**:
   - Complete module extraction
   - Update imports
   - Run existing tests

3. **Week 1, Day 3**:
   - Implement new features
   - Add comprehensive tests
   - Performance optimization

## Success Criteria

- [ ] All files under 200 lines (ideal: 150)
- [ ] Zero regression in functionality
- [ ] Improved test coverage (>80%)
- [ ] Better performance metrics
- [ ] Clear separation of concerns
- [ ] Easier to maintain and extend

## Dependencies

### Required Packages
- `node-pty`: Terminal emulation
- `ws`: WebSocket implementation
- `jsonwebtoken`: JWT handling
- `uuid`: ID generation
- `dockerode`: Docker API client

### Internal Dependencies
- `@team-dashboard/types`: Type definitions
- `@team-dashboard/utils`: Shared utilities
- `@team-dashboard/metrics`: Metrics collection

## Risk Mitigation

1. **Data Loss**: Maintain backward compatibility during migration
2. **Downtime**: Use feature flags for gradual rollout
3. **Performance**: Benchmark before and after refactoring
4. **Bugs**: Comprehensive test suite before deployment

## Team Assignments

This refactoring will be delegated to:
- **code-quality-refactoring-specialist**: Lead the refactoring effort
- **performance-engineering-specialist**: Validate performance metrics
- **frontend-expert**: Update client integration

## Timeline

- **Day 1**: Module extraction and structure setup
- **Day 2**: Implementation and testing
- **Day 3**: Integration and deployment