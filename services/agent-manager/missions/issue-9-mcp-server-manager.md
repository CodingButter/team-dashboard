# URGENT MISSION: MCP Server Manager Service - Issue #9

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #9 - Implement MCP server manager service
**Priority**: P0 - CRITICAL PRIORITY
**Agent**: backend-specialist

## START CODING IMMEDIATELY!

### 1. CREATE THIS FILE FIRST:
**File**: `/services/mcp-manager/src/server-manager.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';

interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  transport: 'stdio' | 'http' | 'websocket';
  autoStart?: boolean;
}

interface MCPServerInstance {
  config: MCPServerConfig;
  process?: ChildProcess;
  status: 'stopped' | 'starting' | 'running' | 'error';
  lastError?: string;
  startTime?: Date;
  restartCount: number;
}

export class MCPServerManager extends EventEmitter {
  private servers = new Map<string, MCPServerInstance>();
  private configPath: string;
  
  constructor(configPath: string = './mcp-servers.json') {
    super();
    this.configPath = configPath;
    this.loadConfigurations();
  }
  
  private async loadConfigurations() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const configs: MCPServerConfig[] = JSON.parse(configData);
      
      for (const config of configs) {
        this.servers.set(config.id, {
          config,
          status: 'stopped',
          restartCount: 0
        });
        
        if (config.autoStart) {
          await this.startServer(config.id);
        }
      }
    } catch (error) {
      console.error('Failed to load MCP configurations:', error);
    }
  }
  
  async startServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    
    if (server.status === 'running') {
      console.log(`Server ${serverId} is already running`);
      return;
    }
    
    server.status = 'starting';
    this.emit('server:starting', serverId);
    
    try {
      const process = spawn(server.config.command, server.config.args, {
        env: { ...process.env, ...server.config.env },
        stdio: server.config.transport === 'stdio' ? ['pipe', 'pipe', 'pipe'] : 'inherit'
      });
      
      server.process = process;
      server.status = 'running';
      server.startTime = new Date();
      
      // Handle process events
      process.on('error', (error) => {
        server.status = 'error';
        server.lastError = error.message;
        this.emit('server:error', serverId, error);
        this.handleRestart(serverId);
      });
      
      process.on('exit', (code, signal) => {
        server.status = 'stopped';
        this.emit('server:stopped', serverId, code, signal);
        
        if (code !== 0) {
          this.handleRestart(serverId);
        }
      });
      
      // Handle STDIO if applicable
      if (server.config.transport === 'stdio') {
        this.setupStdioHandlers(serverId, process);
      }
      
      this.emit('server:started', serverId);
    } catch (error) {
      server.status = 'error';
      server.lastError = error.message;
      this.emit('server:error', serverId, error);
      throw error;
    }
  }
  
  private setupStdioHandlers(serverId: string, process: ChildProcess) {
    if (!process.stdout || !process.stdin || !process.stderr) return;
    
    process.stdout.on('data', (data) => {
      this.emit('server:stdout', serverId, data.toString());
    });
    
    process.stderr.on('data', (data) => {
      this.emit('server:stderr', serverId, data.toString());
    });
  }
  
  private async handleRestart(serverId: string) {
    const server = this.servers.get(serverId);
    if (!server) return;
    
    server.restartCount++;
    
    if (server.restartCount > 3) {
      console.error(`Server ${serverId} exceeded restart limit`);
      this.emit('server:restart-failed', serverId);
      return;
    }
    
    console.log(`Restarting server ${serverId} (attempt ${server.restartCount})`);
    
    setTimeout(() => {
      this.startServer(serverId);
    }, 1000 * server.restartCount); // Exponential backoff
  }
  
  async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server || !server.process) {
      throw new Error(`Server ${serverId} is not running`);
    }
    
    server.process.kill('SIGTERM');
    
    // Give it time to gracefully shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (server.process.killed === false) {
      server.process.kill('SIGKILL');
    }
    
    server.status = 'stopped';
    server.process = undefined;
    this.emit('server:stopped', serverId);
  }
  
  async restartServer(serverId: string): Promise<void> {
    await this.stopServer(serverId);
    await this.startServer(serverId);
  }
  
  getServerStatus(serverId: string): MCPServerInstance | undefined {
    return this.servers.get(serverId);
  }
  
  getAllServers(): MCPServerInstance[] {
    return Array.from(this.servers.values());
  }
  
  async sendMessage(serverId: string, message: any): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server || !server.process || server.config.transport !== 'stdio') {
      throw new Error(`Cannot send message to server ${serverId}`);
    }
    
    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n';
      
      server.process!.stdin!.write(messageStr, (error) => {
        if (error) reject(error);
      });
      
      // Listen for response
      const responseHandler = (data: string) => {
        try {
          const response = JSON.parse(data);
          server.process!.stdout!.off('data', responseHandler);
          resolve(response);
        } catch (e) {
          // Not JSON, keep listening
        }
      };
      
      server.process!.stdout!.on('data', responseHandler);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        server.process!.stdout!.off('data', responseHandler);
        reject(new Error('Response timeout'));
      }, 30000);
    });
  }
}
```

### 2. CREATE THE MCP CONFIGURATION:
**File**: `/services/mcp-manager/mcp-servers.json`

```json
{
  "servers": [
    {
      "id": "memento",
      "name": "Memento Memory Server",
      "command": "npx",
      "args": ["@gannonh/memento-mcp"],
      "transport": "stdio",
      "autoStart": true,
      "env": {
        "MEMENTO_DB_PATH": "./memento.db"
      }
    },
    {
      "id": "playwright",
      "name": "Playwright Browser Automation",
      "command": "npx",
      "args": ["@executeautomation/playwright-mcp-server"],
      "transport": "stdio",
      "autoStart": false
    },
    {
      "id": "code-health",
      "name": "Code Health Analysis",
      "command": "npx",
      "args": ["@code-health/mcp-server"],
      "transport": "stdio",
      "autoStart": false
    },
    {
      "id": "filesystem",
      "name": "Filesystem Operations",
      "command": "node",
      "args": ["./mcp-servers/filesystem-server.js"],
      "transport": "stdio",
      "autoStart": true
    }
  ]
}
```

### 3. CREATE THE API ROUTES:
**File**: `/services/mcp-manager/src/api.ts`

```typescript
import express from 'express';
import { MCPServerManager } from './server-manager';

const app = express();
app.use(express.json());

const manager = new MCPServerManager();

// Get all servers
app.get('/api/mcp/servers', (req, res) => {
  const servers = manager.getAllServers();
  res.json(servers);
});

// Get server status
app.get('/api/mcp/servers/:id', (req, res) => {
  const server = manager.getServerStatus(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  res.json(server);
});

// Start server
app.post('/api/mcp/servers/:id/start', async (req, res) => {
  try {
    await manager.startServer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop server
app.post('/api/mcp/servers/:id/stop', async (req, res) => {
  try {
    await manager.stopServer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
app.post('/api/mcp/servers/:id/restart', async (req, res) => {
  try {
    await manager.restartServer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to server
app.post('/api/mcp/servers/:id/message', async (req, res) => {
  try {
    const response = await manager.sendMessage(req.params.id, req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time events
import { createServer } from 'http';
import { Server } from 'socket.io';

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Forward manager events to WebSocket
manager.on('server:starting', (serverId) => {
  io.emit('server:starting', { serverId });
});

manager.on('server:started', (serverId) => {
  io.emit('server:started', { serverId });
});

manager.on('server:stopped', (serverId, code, signal) => {
  io.emit('server:stopped', { serverId, code, signal });
});

manager.on('server:error', (serverId, error) => {
  io.emit('server:error', { serverId, error: error.message });
});

manager.on('server:stdout', (serverId, data) => {
  io.emit('server:stdout', { serverId, data });
});

manager.on('server:stderr', (serverId, data) => {
  io.emit('server:stderr', { serverId, data });
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`MCP Server Manager running on port ${PORT}`);
});

export { app, server, manager };
```

### 4. CREATE PACKAGE.JSON:
**File**: `/services/mcp-manager/package.json`

```json
{
  "name": "@team-dashboard/mcp-manager",
  "version": "0.1.0",
  "scripts": {
    "dev": "nodemon src/api.ts",
    "build": "tsc",
    "start": "node dist/api.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "nodemon": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

## SUCCESS CRITERIA:
- [ ] MCP servers start/stop/restart correctly
- [ ] STDIO transport working for communication
- [ ] Auto-restart with exponential backoff
- [ ] WebSocket events broadcast server status
- [ ] API endpoints functional
- [ ] Configuration loaded from JSON file

## DO THIS NOW!
1. Create ALL files above IMMEDIATELY
2. Install dependencies
3. Test server management at http://localhost:3004
4. Verify STDIO communication works
5. Create PR with title: "feat: MCP server manager service (Closes #9)"

**START CODING NOW! NO DELAYS!**