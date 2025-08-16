# Technical Scope - Team Dashboard

## Technology Stack Decision

### Frontend: Next.js 14 + TypeScript

**Selected Stack**:
- Next.js 14 (App Router)
- TypeScript 5.3+
- Tailwind CSS v4
- shadcn/ui components
- Socket.io-client
- xterm.js for terminal emulation
- vis.js for Neo4j visualization
- Recharts for metrics
- Zustand for state management
- React Query for data fetching

**Justification**:
- Team expertise from DrawDay project
- Excellent real-time capabilities
- Strong TypeScript support
- Server-side rendering for performance
- Extensive component ecosystem

### Backend: Hybrid Architecture

**Node.js Services (TypeScript)**:
- Fastify framework
- Socket.io for WebSockets
- node-pty for terminal sessions
- BullMQ for job queues
- tRPC for type-safe APIs

**Python Services**:
- FastAPI framework
- psutil for system monitoring
- py2neo for Neo4j integration
- prometheus_client for metrics
- asyncio for concurrent operations

**Justification**:
- Node.js excels at WebSocket handling
- Python superior for system monitoring
- Microservices allow optimal tool selection
- Both have excellent async support

### Infrastructure

**Container Orchestration**:
- Docker for containerization
- Docker Compose for local development
- Kubernetes ready for production

**Monitoring Stack**:
- Prometheus for metrics collection
- Grafana for visualization
- Loki for log aggregation
- Alertmanager for notifications

**Data Storage**:
- Neo4j 5.x for semantic memory
- Redis for caching and pub/sub
- PostgreSQL for application data
- InfluxDB for time-series metrics

## Implementation Details

### WebSocket Architecture

```typescript
// WebSocket event structure
interface AgentMessage {
  type: 'command' | 'output' | 'error' | 'status';
  agentId: string;
  timestamp: number;
  payload: {
    data: string;
    metadata?: Record<string, any>;
  };
}

// Connection management
interface AgentConnection {
  id: string;
  socket: Socket;
  process: ChildProcess;
  status: 'connecting' | 'connected' | 'disconnected';
  metrics: {
    cpu: number;
    memory: number;
    uptime: number;
  };
}
```

### Agent Spawning Strategy

```python
# Python service for process management
class AgentManager:
    async def spawn_agent(self, config: AgentConfig) -> AgentProcess:
        """Spawn a new Claude Code instance"""
        process = await asyncio.create_subprocess_exec(
            'claude-code',
            '--api-key', config.api_key,
            '--model', config.model,
            '--workspace', config.workspace,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        return AgentProcess(process, config)
```

### System Monitoring Implementation

```python
# Real-time metrics collection
class SystemMonitor:
    def collect_metrics(self) -> SystemMetrics:
        return {
            'cpu': {
                'usage': psutil.cpu_percent(interval=1),
                'cores': psutil.cpu_count(),
                'freq': psutil.cpu_freq().current
            },
            'memory': {
                'total': psutil.virtual_memory().total,
                'used': psutil.virtual_memory().used,
                'percent': psutil.virtual_memory().percent
            },
            'network': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv
            }
        }
```

### Neo4j Integration

```typescript
// Graph query interface
interface GraphQuery {
  searchEntities(query: string): Promise<Entity[]>;
  getRelationships(entityId: string): Promise<Relationship[]>;
  updateGraph(changes: GraphChange[]): Promise<void>;
  subscribeToChanges(callback: (change: GraphChange) => void): void;
}

// Real-time graph updates
class Neo4jBridge {
  private changeStream: EventEmitter;
  
  subscribeToChanges(callback: ChangeCallback) {
    // CDC (Change Data Capture) implementation
    this.changeStream.on('change', callback);
  }
}
```

## API Specifications

### REST Endpoints

```yaml
# Agent Management
POST   /api/agents                 # Create new agent
GET    /api/agents                 # List all agents
GET    /api/agents/{id}           # Get agent details
DELETE /api/agents/{id}           # Terminate agent
POST   /api/agents/{id}/command   # Send command to agent

# System Monitoring
GET    /api/metrics/system        # System-wide metrics
GET    /api/metrics/agents        # Per-agent metrics
GET    /api/metrics/history       # Historical metrics

# Neo4j Operations
GET    /api/graph/search          # Search entities
GET    /api/graph/entity/{id}     # Get entity details
GET    /api/graph/relationships   # Get relationships
POST   /api/graph/query           # Execute Cypher query
```

### WebSocket Events

```typescript
// Client -> Server
'agent:create'      // Request new agent
'agent:command'     // Send command to agent
'agent:terminate'   // Stop agent
'metrics:subscribe' // Subscribe to metrics

// Server -> Client
'agent:output'      // Agent stdout/stderr
'agent:status'      // Agent status change
'metrics:update'    // Real-time metrics
'graph:change'      // Neo4j graph update
```

## Security Implementation

### Authentication Flow

```typescript
// JWT-based authentication
interface AuthToken {
  sub: string;        // User ID
  role: string;       // User role
  exp: number;        // Expiration
  iat: number;        // Issued at
  agents: string[];   // Authorized agents
}

// Middleware
async function authenticate(req: Request): Promise<User> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new UnauthorizedError();
  
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return getUserById(payload.sub);
}
```

### Agent Isolation

```yaml
# Docker container configuration
services:
  agent:
    image: claude-code:latest
    mem_limit: 2g
    cpus: '1.0'
    networks:
      - agent-network
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

## Performance Targets

### Response Times
- WebSocket message delivery: < 50ms
- API response time: < 200ms
- Graph query response: < 500ms
- Metric collection interval: 1 second

### Resource Limits
- Per-agent memory: 2GB max
- Per-agent CPU: 1 core max
- Total system memory: 80% threshold
- Concurrent agents: 10-20 depending on resources

### Scalability
- Horizontal scaling via load balancing
- Agent pool management
- Connection pooling for databases
- Caching layer for frequent queries

## Development Workflow

### Local Development Setup

```bash
# 1. Start infrastructure
docker-compose up -d neo4j redis postgres

# 2. Install dependencies
pnpm install
pip install -r services/requirements.txt

# 3. Start services
pnpm dev:dashboard
pnpm dev:agent-manager
python services/system-monitor/main.py

# 4. Access dashboard
open http://localhost:3000
```

### Testing Strategy

```typescript
// Unit tests for components
describe('AgentFrame', () => {
  it('should render terminal interface', () => {
    const { getByTestId } = render(<AgentFrame agentId="test" />);
    expect(getByTestId('terminal')).toBeInTheDocument();
  });
});

// Integration tests for WebSocket
describe('WebSocket Communication', () => {
  it('should handle bidirectional messages', async () => {
    const client = io('ws://localhost:3001');
    const response = await emitAndWait(client, 'agent:command', { 
      command: 'echo test' 
    });
    expect(response.output).toBe('test');
  });
});
```

## Deployment Architecture

### Production Infrastructure

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard
  template:
    spec:
      containers:
      - name: dashboard
        image: team-dashboard:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t team-dashboard .
      - run: docker push registry/team-dashboard
      - run: kubectl apply -f k8s/
```

## Migration Path

### From Current Setup to Dashboard

1. **Phase 1**: Basic dashboard without disrupting current workflow
2. **Phase 2**: Gradual migration of agents to dashboard control
3. **Phase 3**: Full integration with existing tools
4. **Phase 4**: Deprecate old management methods
5. **Phase 5**: Optimize and enhance based on usage

## Success Criteria

### Technical Metrics
- [ ] Sub-50ms WebSocket latency achieved
- [ ] 60fps UI rendering maintained
- [ ] 99.9% uptime for critical services
- [ ] < 2 second page load times
- [ ] < 5 second agent spawn time

### User Experience Metrics
- [ ] All agents manageable from single interface
- [ ] Real-time visibility into all operations
- [ ] Intuitive navigation and controls
- [ ] Responsive on all screen sizes
- [ ] Keyboard shortcuts for power users

### Business Value Metrics
- [ ] 50% reduction in management overhead
- [ ] 75% faster issue identification
- [ ] 90% reduction in context switching
- [ ] 100% audit trail of all operations

---

*Technical Scope Version: 1.0*
*Last Updated: 2025-01-16*