# Technical Scope - Agentic Coding Agent Dashboard

## Technology Stack Decision

### Frontend: Next.js 14 + TypeScript

**Selected Stack**:
- Next.js 14 (App Router)
- TypeScript 5.3+
- Tailwind CSS v4
- shadcn/ui components
- Socket.io-client for real-time updates
- xterm.js for terminal emulation
- Monaco Editor for code editing
- Recharts for metrics visualization
- Zustand for state management
- React Query for data fetching

**Justification**:
- Team expertise from DrawDay project
- Excellent real-time capabilities for agent monitoring
- Strong TypeScript support for OpenAI SDK integration
- Server-side rendering for performance
- Rich component ecosystem for development tools

### Backend: Python-First Architecture

**Primary Backend (Python)**:
- FastAPI framework for high-performance APIs
- OpenAI SDK for GPT-4o integration
- asyncio for concurrent agent operations
- pydantic for type validation
- uvicorn for ASGI server
- MCP client libraries for server integration

**Node.js Services (TypeScript)**:
- Socket.io server for real-time communication
- File system operations and workspace management
- Docker management for agent sandboxing
- Git operations through simple-git

**Justification**:
- Python ecosystem excels for AI/ML integration
- OpenAI SDK has mature Python support
- FastAPI provides excellent async performance
- Python better suited for MCP server protocols
- Node.js retained for real-time WebSocket handling

### Infrastructure

**Container Orchestration**:
- Docker for agent sandboxing and isolation
- Docker Compose for local development
- Kubernetes ready for production scaling

**Security & Sandboxing**:
- Docker containers with resource limits
- Read-only file systems for agent containers
- Network isolation between agents
- Permission system for dangerous operations

**Data Storage**:
- Redis for agent conversation memory and caching
- PostgreSQL for application data and MCP configurations
- InfluxDB for performance metrics and monitoring
- File system for workspace management

**Monitoring Stack**:
- Prometheus for metrics collection
- Grafana for visualization and alerting
- Custom agent performance tracking
- OpenAI API usage monitoring

## Implementation Details

### OpenAI SDK Integration

```python
# Core agent implementation using OpenAI SDK
from openai import AsyncOpenAI
from mcp import ClientSession, StdioServerParameters

class CodingAgent:
    def __init__(self, config: AgentConfig):
        self.client = AsyncOpenAI(api_key=config.openai_api_key)
        self.model = "gpt-4o"
        self.mcp_servers = {}
        self.conversation_memory = []
        
    async def process_request(self, message: str) -> AsyncGenerator[str, None]:
        """Process user request with streaming response"""
        messages = self.build_conversation_context(message)
        
        async for chunk in await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=self.get_available_tools(),
            stream=True,
            temperature=0.1
        ):
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def execute_tool_call(self, tool_call) -> str:
        """Execute tool calls through MCP servers or built-in functions"""
        tool_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        
        if tool_name in self.mcp_tools:
            return await self.call_mcp_tool(tool_name, args)
        else:
            return await self.call_builtin_tool(tool_name, args)
```

### MCP Server Architecture

```python
# MCP server management and integration
class MCPServerManager:
    def __init__(self):
        self.servers = {}
        self.server_configs = {}
    
    async def initialize_server(self, config: MCPServerConfig):
        """Initialize MCP server with STDIO or HTTP transport"""
        if config.transport == "stdio":
            server_params = StdioServerParameters(
                command=config.command,
                args=config.args,
                env=config.env
            )
        else:  # HTTP+SSE
            server_params = config.endpoint
            
        session = await ClientSession.create(server_params)
        await session.initialize()
        
        # Register available tools
        tools = await session.list_tools()
        self.servers[config.name] = {
            'session': session,
            'tools': tools,
            'config': config
        }
    
    async def call_tool(self, server_name: str, tool_name: str, args: dict):
        """Execute tool call on specific MCP server"""
        server = self.servers[server_name]
        result = await server['session'].call_tool(tool_name, args)
        return result.content
```

### Agent Management System

```python
# Multi-agent coordination without Claude Code dependency
class AgentOrchestrator:
    def __init__(self):
        self.agents = {}
        self.docker_client = docker.from_env()
        
    async def create_agent(self, config: AgentConfig) -> CodingAgent:
        """Create new coding agent with Docker sandboxing"""
        # Create isolated workspace
        workspace_path = f"/tmp/agent-{config.agent_id}"
        os.makedirs(workspace_path, exist_ok=True)
        
        # Initialize Docker container for sandboxing
        container = self.docker_client.containers.run(
            image="python:3.11-slim",
            working_dir="/workspace",
            volumes={workspace_path: {'bind': '/workspace', 'mode': 'rw'}},
            mem_limit="2g",
            cpus=1.0,
            detach=True,
            remove=True,
            security_opt=["no-new-privileges:true"],
            read_only=False  # Workspace needs write access
        )
        
        agent = CodingAgent(config)
        agent.container = container
        agent.workspace_path = workspace_path
        
        self.agents[config.agent_id] = agent
        return agent
```

### Built-in Tool Integration

```python
# Core development tools implemented as function decorators
from functools import wraps

def function_tool(name: str, description: str):
    """Decorator to register functions as OpenAI tools"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        
        wrapper._tool_definition = {
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": {
                    "type": "object",
                    "properties": extract_parameters(func),
                    "required": get_required_params(func)
                }
            }
        }
        return wrapper
    return decorator

# Core development tools
@function_tool("read_file", "Read the contents of a file")
async def read_file(path: str) -> str:
    """Read file contents with security validation"""
    if not is_safe_path(path):
        raise SecurityError(f"Access denied to {path}")
    
    async with aiofiles.open(path, 'r') as f:
        return await f.read()

@function_tool("write_file", "Write content to a file")
async def write_file(path: str, content: str) -> str:
    """Write file with backup and validation"""
    if not is_safe_path(path):
        raise SecurityError(f"Write access denied to {path}")
    
    # Create backup if file exists
    if os.path.exists(path):
        backup_path = f"{path}.backup.{int(time.time())}"
        shutil.copy2(path, backup_path)
    
    async with aiofiles.open(path, 'w') as f:
        await f.write(content)
    
    return f"Successfully wrote {len(content)} bytes to {path}"

@function_tool("execute_bash", "Execute bash commands safely")
async def execute_bash(command: str) -> str:
    """Execute bash command with safety restrictions"""
    if not is_safe_command(command):
        raise SecurityError(f"Command rejected: {command}")
    
    process = await asyncio.create_subprocess_shell(
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        timeout=30
    )
    
    stdout, stderr = await process.communicate()
    
    result = {
        'returncode': process.returncode,
        'stdout': stdout.decode(),
        'stderr': stderr.decode()
    }
    
    return json.dumps(result, indent=2)

@function_tool("git_operation", "Perform git operations")
async def git_operation(operation: str, args: list = None) -> str:
    """Safe git operations with validation"""
    allowed_operations = ['status', 'add', 'commit', 'push', 'pull', 'diff', 'log']
    
    if operation not in allowed_operations:
        raise SecurityError(f"Git operation '{operation}' not allowed")
    
    cmd = ['git', operation] + (args or [])
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    stdout, stderr = await process.communicate()
    
    return stdout.decode() + stderr.decode()
```

### System Monitoring Implementation

```python
# Enhanced monitoring for OpenAI agents and MCP servers
class AgentMonitor:
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.openai_tracker = OpenAIUsageTracker()
        
    async def collect_agent_metrics(self, agent_id: str) -> AgentMetrics:
        """Collect comprehensive agent performance metrics"""
        agent = self.get_agent(agent_id)
        
        return {
            'agent_id': agent_id,
            'status': agent.status,
            'uptime': time.time() - agent.created_at,
            'container_stats': await self.get_container_stats(agent.container),
            'openai_usage': await self.openai_tracker.get_usage(agent_id),
            'mcp_server_health': await self.check_mcp_servers(agent),
            'conversation_length': len(agent.conversation_memory),
            'tools_used': agent.get_tool_usage_stats(),
            'performance': {
                'avg_response_time': agent.get_avg_response_time(),
                'tokens_per_second': agent.get_tokens_per_second(),
                'error_rate': agent.get_error_rate()
            }
        }
    
    async def get_container_stats(self, container) -> dict:
        """Get Docker container resource usage"""
        stats = container.stats(stream=False)
        
        # Calculate CPU percentage
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                   stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                      stats['precpu_stats']['system_cpu_usage']
        cpu_percent = (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
        
        return {
            'cpu_percent': cpu_percent,
            'memory_usage': stats['memory_stats']['usage'],
            'memory_limit': stats['memory_stats']['limit'],
            'memory_percent': (stats['memory_stats']['usage'] / stats['memory_stats']['limit']) * 100,
            'network_rx': stats['networks']['eth0']['rx_bytes'],
            'network_tx': stats['networks']['eth0']['tx_bytes']
        }
```

### MCP Configuration Management

```python
# MCP server configuration and discovery
class MCPConfigManager:
    def __init__(self):
        self.config_path = "mcpServers.json"
        self.server_registry = {}
    
    def load_server_configs(self) -> Dict[str, MCPServerConfig]:
        """Load MCP server configurations from standard format"""
        with open(self.config_path, 'r') as f:
            config_data = json.load(f)
        
        servers = {}
        for name, config in config_data.get('mcpServers', {}).items():
            servers[name] = MCPServerConfig(
                name=name,
                command=config.get('command'),
                args=config.get('args', []),
                env=config.get('env', {}),
                transport=config.get('transport', 'stdio'),
                endpoint=config.get('endpoint'),
                description=config.get('description', ''),
                tools=config.get('tools', [])
            )
        
        return servers
    
    async def discover_available_servers(self) -> List[MCPServerInfo]:
        """Discover available MCP servers from registry"""
        # Popular MCP servers with their configurations
        known_servers = [
            {
                'name': 'github',
                'description': 'GitHub repository management',
                'command': 'uvx',
                'args': ['mcp-server-github'],
                'env': {'GITHUB_PERSONAL_ACCESS_TOKEN': '${GITHUB_TOKEN}'},
                'tools': ['create_repository', 'search_repositories', 'create_issue']
            },
            {
                'name': 'slack',
                'description': 'Slack workspace integration',
                'command': 'npx',
                'args': ['-y', '@modelcontextprotocol/server-slack'],
                'env': {'SLACK_BOT_TOKEN': '${SLACK_BOT_TOKEN}'},
                'tools': ['send_message', 'list_channels', 'get_channel_history']
            },
            {
                'name': 'postgresql',
                'description': 'PostgreSQL database operations',
                'command': 'uvx',
                'args': ['mcp-server-postgres'],
                'env': {'DATABASE_URL': '${DATABASE_URL}'},
                'tools': ['query', 'schema', 'list_tables']
            },
            {
                'name': 'puppeteer',
                'description': 'Web automation and scraping',
                'command': 'npx',
                'args': ['-y', '@modelcontextprotocol/server-puppeteer'],
                'tools': ['navigate', 'screenshot', 'get_content', 'click_element']
            }
        ]
        
        return [MCPServerInfo(**server) for server in known_servers]
```

### Frontend Integration Points

```typescript
// OpenAI SDK integration in Next.js frontend
interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  openaiApiKey: string;
  model: 'gpt-4o' | 'gpt-4o-mini';
  mcpServers: string[];
  maxTokens: number;
  temperature: number;
  workspace: string;
}

// Agent management interface
class AgentManager {
  private agents: Map<string, AgentConnection> = new Map();
  private socket: Socket;

  async createAgent(config: AgentConfig): Promise<string> {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const { agentId } = await response.json();
    
    // Establish WebSocket connection for real-time communication
    this.socket.emit('agent:connect', { agentId });
    
    return agentId;
  }

  async sendMessage(agentId: string, message: string): Promise<void> {
    this.socket.emit('agent:message', { agentId, message });
  }

  subscribeToAgent(agentId: string, callbacks: AgentCallbacks): void {
    this.socket.on(`agent:${agentId}:response`, callbacks.onResponse);
    this.socket.on(`agent:${agentId}:tool_call`, callbacks.onToolCall);
    this.socket.on(`agent:${agentId}:error`, callbacks.onError);
    this.socket.on(`agent:${agentId}:status`, callbacks.onStatusChange);
  }
}

// Tool approval workflow
interface ToolApprovalRequest {
  agentId: string;
  toolName: string;
  arguments: Record<string, any>;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

class ToolApprovalManager {
  async requestApproval(request: ToolApprovalRequest): Promise<boolean> {
    if (!request.requiresApproval) return true;
    
    // Show approval dialog to user
    return new Promise((resolve) => {
      showToolApprovalDialog(request, resolve);
    });
  }
}
```

## API Specifications

### REST Endpoints

```yaml
# Agent Management
POST   /api/agents                    # Create new OpenAI agent
GET    /api/agents                    # List all agents
GET    /api/agents/{id}              # Get agent details
DELETE /api/agents/{id}              # Terminate agent
POST   /api/agents/{id}/message      # Send message to agent
POST   /api/agents/{id}/approve-tool # Approve tool execution

# MCP Server Management
GET    /api/mcp/servers              # List available MCP servers
POST   /api/mcp/servers              # Register new MCP server
GET    /api/mcp/servers/{name}       # Get server details
POST   /api/mcp/servers/{name}/test  # Test server connection
DELETE /api/mcp/servers/{name}       # Remove server

# Configuration Management
GET    /api/config/agent-templates   # Get agent templates
POST   /api/config/agent-templates   # Create agent template
GET    /api/config/system-prompts    # List system prompts
POST   /api/config/system-prompts    # Create system prompt

# Monitoring & Analytics
GET    /api/metrics/agents           # Per-agent performance
GET    /api/metrics/openai-usage     # OpenAI API usage stats
GET    /api/metrics/mcp-health       # MCP server health
GET    /api/metrics/cost-analysis    # Cost breakdown and projections

# Workspace Management
GET    /api/workspaces               # List agent workspaces
POST   /api/workspaces               # Create workspace
GET    /api/workspaces/{id}/files    # List workspace files
POST   /api/workspaces/{id}/backup   # Backup workspace
```

### WebSocket Events

```typescript
// Client -> Server Events
interface ClientEvents {
  'agent:connect': { agentId: string };
  'agent:message': { agentId: string; message: string };
  'agent:interrupt': { agentId: string };
  'tool:approve': { agentId: string; toolCallId: string; approved: boolean };
  'metrics:subscribe': { agentIds?: string[]; interval?: number };
}

// Server -> Client Events
interface ServerEvents {
  'agent:response': { 
    agentId: string; 
    content: string; 
    isPartial: boolean;
    metadata?: any;
  };
  'agent:tool_call': {
    agentId: string;
    toolCallId: string;
    toolName: string;
    arguments: Record<string, any>;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
  'agent:tool_result': {
    agentId: string;
    toolCallId: string;
    result: string;
    success: boolean;
    executionTime: number;
  };
  'agent:status': {
    agentId: string;
    status: 'idle' | 'thinking' | 'executing_tool' | 'waiting_approval' | 'error';
    details?: string;
  };
  'agent:error': {
    agentId: string;
    error: string;
    recoverable: boolean;
  };
  'metrics:update': {
    timestamp: number;
    agents: Record<string, AgentMetrics>;
    system: SystemMetrics;
    openaiUsage: OpenAIUsageMetrics;
  };
}

// Real-time streaming interface
interface StreamingResponse {
  type: 'content' | 'tool_call' | 'error' | 'done';
  data: any;
  agentId: string;
  timestamp: number;
}
```

## Security Implementation

### Permission System

```python
# Comprehensive permission system for dangerous operations
class SecurityManager:
    def __init__(self):
        self.permission_rules = self.load_permission_rules()
        self.risk_assessor = RiskAssessor()
    
    async def evaluate_tool_call(self, tool_name: str, args: dict, context: AgentContext) -> SecurityDecision:
        """Evaluate if tool call should be allowed, blocked, or requires approval"""
        risk_level = await self.risk_assessor.assess_risk(tool_name, args, context)
        
        # Built-in security rules
        if tool_name == 'execute_bash':
            command = args.get('command', '')
            if any(dangerous in command for dangerous in ['rm -rf', 'sudo', 'curl | bash']):
                return SecurityDecision(action='block', reason='Dangerous command detected')
            elif any(risky in command for risky in ['git push', 'npm publish', 'docker run']):
                return SecurityDecision(action='approve', reason='Requires manual approval')
        
        elif tool_name == 'write_file':
            file_path = args.get('path', '')
            if file_path.startswith('/etc/') or file_path.startswith('/usr/'):
                return SecurityDecision(action='block', reason='System file modification not allowed')
            elif file_path.endswith('.env') or 'secret' in file_path:
                return SecurityDecision(action='approve', reason='Sensitive file modification')
        
        elif tool_name in ['git_operation']:
            operation = args.get('operation', '')
            if operation in ['push', 'pull'] and context.repo_permissions != 'write':
                return SecurityDecision(action='block', reason='Insufficient repository permissions')
        
        return SecurityDecision(action='allow', reason='Safe operation')

# Risk assessment for tool calls
class RiskAssessor:
    def __init__(self):
        self.risk_patterns = {
            'high': [
                r'rm\s+-rf\s*/',
                r'curl.*\|\s*bash',
                r'sudo\s+',
                r'chmod\s+777',
                r'>/dev/null\s+2>&1'
            ],
            'medium': [
                r'git\s+push',
                r'npm\s+publish',
                r'docker\s+run',
                r'pip\s+install',
                r'wget\s+.*\|\s*sh'
            ]
        }
    
    async def assess_risk(self, tool_name: str, args: dict, context: AgentContext) -> str:
        """Assess risk level based on tool and arguments"""
        if tool_name == 'execute_bash':
            command = args.get('command', '')
            for level, patterns in self.risk_patterns.items():
                if any(re.search(pattern, command, re.IGNORECASE) for pattern in patterns):
                    return level
        
        # Assess based on file paths, network calls, etc.
        return 'low'
```

### Docker Sandboxing

```yaml
# Enhanced Docker security for agent isolation
services:
  coding-agent:
    image: coding-agent:latest
    security_opt:
      - no-new-privileges:true
      - seccomp:unconfined  # Required for some development tools
    cap_drop:
      - ALL
    cap_add:
      - DAC_OVERRIDE  # File operations
      - SETUID        # User switching
    read_only: false  # Agents need write access to workspace
    tmpfs:
      - /tmp:size=1g,mode=1777
    mem_limit: 2g
    cpus: '1.0'
    pids_limit: 512
    ulimits:
      nproc: 1024
      nofile: 2048
    networks:
      - agent-isolated
    environment:
      - PYTHONPATH=/workspace
      - NODE_ENV=development
    volumes:
      - agent-workspace:/workspace:rw
      - /var/run/docker.sock:/var/run/docker.sock:ro  # For Docker-in-Docker if needed
    user: "1000:1000"  # Non-root user
    
networks:
  agent-isolated:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### API Key Management

```python
# Secure API key handling for OpenAI and MCP servers
class APIKeyManager:
    def __init__(self):
        self.vault = VaultClient()
        self.encryption_key = self.get_encryption_key()
    
    async def store_api_key(self, user_id: str, service: str, api_key: str):
        """Securely store encrypted API keys"""
        encrypted_key = self.encrypt_key(api_key)
        key_metadata = {
            'service': service,
            'created_at': datetime.utcnow(),
            'last_used': None,
            'usage_count': 0
        }
        
        await self.vault.store(f"user:{user_id}:keys:{service}", {
            'encrypted_key': encrypted_key,
            'metadata': key_metadata
        })
    
    async def get_api_key(self, user_id: str, service: str) -> str:
        """Retrieve and decrypt API key"""
        stored_data = await self.vault.retrieve(f"user:{user_id}:keys:{service}")
        if not stored_data:
            raise APIKeyNotFoundError(f"No API key found for {service}")
        
        # Update usage tracking
        await self.update_key_usage(user_id, service)
        
        return self.decrypt_key(stored_data['encrypted_key'])
    
    def encrypt_key(self, api_key: str) -> str:
        """Encrypt API key using Fernet symmetric encryption"""
        f = Fernet(self.encryption_key)
        return f.encrypt(api_key.encode()).decode()
    
    def decrypt_key(self, encrypted_key: str) -> str:
        """Decrypt API key"""
        f = Fernet(self.encryption_key)
        return f.decrypt(encrypted_key.encode()).decode()
```

## Performance Targets

### SWE-bench Performance Goals
- **Primary Target**: 70%+ success rate on SWE-bench Lite
- **Secondary Target**: 60%+ success rate on full SWE-bench
- **Cost Efficiency**: 30-40% cost reduction vs Claude Code equivalent
- **Response Quality**: Maintain Claude-3.5-Sonnet level reasoning

### Response Times
- OpenAI API first token: < 1 second
- Streaming response latency: < 100ms per token
- Tool execution time: < 30 seconds (with timeout)
- WebSocket message delivery: < 50ms
- MCP server response: < 2 seconds

### Resource Optimization
- **Per-agent limits**: 2GB memory, 1 CPU core
- **Container startup**: < 5 seconds
- **Concurrent agents**: 15-25 (optimized for OpenAI rate limits)
- **Memory efficiency**: 60% reduction via conversation pruning
- **API rate limiting**: Intelligent backoff for OpenAI limits

### Cost Management
- **Token optimization**: Context window management and pruning
- **Model selection**: Automatic GPT-4o vs GPT-4o-mini routing
- **Caching**: Response caching for repeated operations
- **Batch operations**: Group similar tool calls when possible

### Scalability Targets
- **Multi-tenant**: Support 100+ users with agent pools
- **Geographic distribution**: Multi-region OpenAI API routing
- **Auto-scaling**: Dynamic container allocation based on demand
- **Fault tolerance**: Automatic failover and recovery

## Development Workflow

### Local Development Setup

```bash
# 1. Start infrastructure services
docker-compose up -d redis postgres influxdb

# 2. Install dependencies
pnpm install
pip install -r services/requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Add OpenAI API key and other secrets

# 4. Initialize MCP servers
python scripts/setup-mcp-servers.py

# 5. Start development services
pnpm dev:dashboard          # Frontend (port 3000)
python services/agent-api/main.py  # Python API (port 8000)
pnpm dev:websocket-server   # WebSocket server (port 3001)

# 6. Run tests
pnpm test                   # Frontend tests
pytest services/tests/      # Python tests
```

### MCP Server Configuration

```json
// mcpServers.json - Standard configuration format
{
  "mcpServers": {
    "github": {
      "command": "uvx",
      "args": ["mcp-server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "description": "GitHub repository management"
    },
    "postgresql": {
      "command": "uvx", 
      "args": ["mcp-server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      },
      "description": "PostgreSQL database operations"
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "description": "Web automation and scraping"
    }
  }
}
```

### Testing Strategy

```typescript
// Frontend component tests
describe('AgentInterface', () => {
  it('should handle OpenAI streaming responses', async () => {
    const mockAgent = createMockAgent();
    const { getByTestId } = render(<AgentInterface agent={mockAgent} />);
    
    // Simulate streaming response
    await act(async () => {
      mockAgent.sendMessage('Hello');
    });
    
    expect(getByTestId('response-stream')).toHaveTextContent('Hello');
  });

  it('should display tool approval dialogs', async () => {
    const { getByTestId } = render(<ToolApprovalDialog />);
    
    fireEvent.click(getByTestId('approve-button'));
    expect(mockOnApprove).toHaveBeenCalledWith(true);
  });
});

// Python backend tests
describe('OpenAI Integration', () => {
  async def test_agent_creates_valid_tool_calls():
    agent = CodingAgent(test_config)
    response = await agent.process_request("Create a new file called test.py")
    
    assert any(call.function.name == 'write_file' for call in response.tool_calls)
    
  async def test_mcp_server_integration():
    mcp_manager = MCPServerManager()
    await mcp_manager.initialize_server(github_config)
    
    result = await mcp_manager.call_tool('github', 'create_repository', {
      'name': 'test-repo',
      'private': True
    })
    
    assert result.success == True
});

// Security testing
describe('Security Manager', () => {
  async def test_dangerous_commands_blocked():
    security = SecurityManager()
    decision = await security.evaluate_tool_call('execute_bash', {
      'command': 'rm -rf /'
    }, test_context)
    
    assert decision.action == 'block'
    assert 'Dangerous command' in decision.reason
});
```

## Deployment Architecture

### Production Infrastructure

```yaml
# Kubernetes deployment for agent dashboard
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-dashboard
  template:
    spec:
      containers:
      # Frontend Next.js application
      - name: dashboard-frontend
        image: agent-dashboard-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.agent-dashboard.com"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      
      # Python API backend
      - name: agent-api
        image: agent-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: openai-api-key
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: postgres-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: mcp-config
          mountPath: /app/mcpServers.json
          subPath: mcpServers.json
      
      volumes:
      - name: mcp-config
        configMap:
          name: mcp-server-config

---
# Agent worker pool for sandboxed execution
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-workers
spec:
  replicas: 5
  selector:
    matchLabels:
      app: agent-worker
  template:
    spec:
      containers:
      - name: agent-worker
        image: coding-agent:latest
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: false
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        env:
        - name: WORKER_MODE
          value: "true"
      volumes:
      - name: workspace
        emptyDir:
          sizeLimit: 5Gi
```

### CI/CD Pipeline

```yaml
# GitHub Actions workflow for OpenAI agent dashboard
name: Deploy Agent Dashboard
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      # Frontend tests
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
      
      # Backend tests
      - run: pip install -r services/requirements.txt
      - run: pytest services/tests/ -v
      
      # Security tests
      - run: pnpm audit
      - run: safety check

  swe-bench-evaluation:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Run SWE-bench Lite evaluation
        run: |
          python scripts/swe-bench-eval.py --subset lite --max-instances 10
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

  deploy:
    needs: [test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      # Build and push images
      - run: docker build -t agent-dashboard-frontend:${{ github.sha }} ./apps/dashboard
      - run: docker build -t agent-api:${{ github.sha }} ./services/agent-api
      - run: docker build -t coding-agent:${{ github.sha }} ./docker/agent
      
      - run: docker push registry/agent-dashboard-frontend:${{ github.sha }}
      - run: docker push registry/agent-api:${{ github.sha }}
      - run: docker push registry/coding-agent:${{ github.sha }}
      
      # Deploy to Kubernetes
      - run: kubectl set image deployment/agent-dashboard dashboard-frontend=registry/agent-dashboard-frontend:${{ github.sha }}
      - run: kubectl set image deployment/agent-dashboard agent-api=registry/agent-api:${{ github.sha }}
      - run: kubectl set image deployment/agent-workers agent-worker=registry/coding-agent:${{ github.sha }}
```

## Implementation Timeline

### 4-Phase Rollout Plan

#### **Phase 1: Foundation (Weeks 1-4)**
- **OpenAI SDK Integration**: Core agent implementation with GPT-4o
- **Basic Tool System**: read_file, write_file, execute_bash, git_operation
- **Docker Sandboxing**: Secure container-based agent isolation
- **Simple UI**: Agent creation, message interface, basic monitoring
- **Security Framework**: Permission system and risk assessment

#### **Phase 2: MCP Integration (Weeks 5-8)**
- **MCP Server Support**: STDIO and HTTP+SSE transport protocols
- **Popular Servers**: GitHub, PostgreSQL, Puppeteer, Slack integration
- **Configuration UI**: MCP server discovery and management interface
- **Tool Approval Workflow**: User approval for dangerous operations
- **Enhanced Monitoring**: OpenAI usage tracking and cost analysis

#### **Phase 3: Advanced Features (Weeks 9-12)**
- **Multi-Agent Coordination**: Sequential workflow management
- **Performance Optimization**: Context pruning, response caching
- **Advanced Security**: Fine-grained permissions, audit logging  
- **SWE-bench Evaluation**: Automated performance benchmarking
- **Workspace Management**: File versioning, backup systems

#### **Phase 4: Production Scaling (Weeks 13-16)**
- **Horizontal Scaling**: Load balancing, auto-scaling
- **Cost Optimization**: Model routing, batch operations
- **Enterprise Features**: Multi-tenant support, SSO integration
- **Documentation**: Complete API docs, deployment guides
- **Performance Tuning**: 70%+ SWE-bench target achievement

## Success Criteria

### Performance Benchmarks
- [ ] **SWE-bench Lite**: 70%+ success rate achieved
- [ ] **SWE-bench Full**: 60%+ success rate achieved
- [ ] **Cost Efficiency**: 30-40% cost reduction vs Claude Code
- [ ] **Response Speed**: < 1 second first token from OpenAI API
- [ ] **Tool Execution**: < 30 seconds average tool execution time

### Technical Reliability
- [ ] **Uptime**: 99.9% availability for core services
- [ ] **Container Startup**: < 5 seconds agent container initialization
- [ ] **WebSocket Latency**: < 50ms message delivery
- [ ] **MCP Server Health**: 98%+ successful MCP server interactions
- [ ] **Security**: Zero successful sandbox escapes

### User Experience Excellence
- [ ] **Agent Management**: Single interface for all agent operations
- [ ] **Real-time Monitoring**: Live agent status and performance metrics
- [ ] **Tool Approval**: Intuitive workflow for dangerous operation approval
- [ ] **Mobile Responsive**: Full functionality on tablet/mobile devices
- [ ] **Accessibility**: WCAG 2.1 AA compliance achieved

### Business Impact Metrics
- [ ] **Productivity**: 60% reduction in development setup time
- [ ] **Cost Control**: Transparent OpenAI API usage tracking and optimization
- [ ] **Adoption**: 80%+ developer satisfaction rating
- [ ] **Scalability**: Support 100+ concurrent users without degradation
- [ ] **Documentation**: Complete technical and user documentation

### Integration Points Validated
- [ ] **MCP Servers**: GitHub, PostgreSQL, Puppeteer, Slack fully functional
- [ ] **OpenAI Models**: GPT-4o and GPT-4o-mini automatic routing working
- [ ] **Docker Security**: All container isolation and permission systems operational
- [ ] **Monitoring Stack**: Prometheus/Grafana providing actionable insights
- [ ] **CI/CD Pipeline**: Automated SWE-bench evaluation in pull requests

---

*Technical Scope Version: 2.0 - OpenAI/MCP Architecture*
*Last Updated: 2025-08-16*
*Major Pivot: Claude Code → OpenAI SDK + MCP Servers*