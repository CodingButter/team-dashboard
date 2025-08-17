# URGENT MISSION: Agent Terminal with xterm.js - Issue #12

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #12 - Build agent terminal with xterm.js
**Priority**: P0 - CRITICAL PRIORITY
**Agent**: frontend-expert

## START CODING IMMEDIATELY!

### 1. CREATE THIS FILE FIRST:
**File**: `/apps/dashboard/src/components/agent-terminal.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface AgentTerminalProps {
  agentId: string;
  workspacePath: string;
}

export function AgentTerminal({ agentId, workspacePath }: AgentTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
      },
      scrollback: 10000,
      convertEol: true,
    });
    
    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();
    
    // Handle window resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    
    // Connect to WebSocket
    const ws = io(`ws://localhost:3001/agent/${agentId}`, {
      query: { workspace: workspacePath }
    });
    
    ws.on('connect', () => {
      setIsConnected(true);
      term.writeln('\r\n✅ Connected to agent terminal\r\n');
      term.write('$ ');
    });
    
    ws.on('output', (data: string) => {
      term.write(data);
    });
    
    ws.on('disconnect', () => {
      setIsConnected(false);
      term.writeln('\r\n❌ Disconnected from agent\r\n');
    });
    
    // Handle terminal input
    term.onData((data) => {
      ws.emit('input', data);
    });
    
    setTerminal(term);
    setSocket(ws);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [agentId, workspacePath]);
  
  return (
    <div className="relative h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden">
      <div className="absolute top-2 right-2 z-10">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      <div ref={terminalRef} className="h-full w-full p-2" />
    </div>
  );
}
```

### 2. CREATE THE TERMINAL PAGE:
**File**: `/apps/dashboard/src/app/agents/[id]/terminal/page.tsx`

```tsx
'use client';

import { AgentTerminal } from '@/components/agent-terminal';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Button } from '@/ui/components/ui/button';
import { Copy, Download, RefreshCw, Maximize2 } from 'lucide-react';
import { useState } from 'react';

export default function TerminalPage({ params }: { params: { id: string } }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const handleClearTerminal = () => {
    // Send clear command
    fetch(`/api/agents/${params.id}/terminal/clear`, { method: 'POST' });
  };
  
  const handleDownloadLogs = async () => {
    const response = await fetch(`/api/agents/${params.id}/logs`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${params.id}-logs.txt`;
    a.click();
  };
  
  const handleCopyOutput = async () => {
    const response = await fetch(`/api/agents/${params.id}/terminal/output`);
    const text = await response.text();
    await navigator.clipboard.writeText(text);
  };
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''} flex flex-col h-full`}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Agent Terminal - {params.id}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handleClearTerminal}
              title="Clear terminal"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyOutput}
              title="Copy output"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleDownloadLogs}
              title="Download logs"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Toggle fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <AgentTerminal 
            agentId={params.id} 
            workspacePath={`/home/codingbutter/GitHub/team-dashboard-worktrees/agent-${params.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. CREATE WEBSOCKET HANDLER:
**File**: `/services/agent-manager/src/terminal/terminal-handler.ts`

```typescript
import { Server } from 'socket.io';
import { spawn, IPty } from 'node-pty';
import * as os from 'os';

interface TerminalSession {
  pty: IPty;
  agentId: string;
  workspace: string;
}

export class TerminalHandler {
  private sessions = new Map<string, TerminalSession>();
  
  constructor(private io: Server) {
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.io.of(/^\/agent\/[\w-]+$/).on('connection', (socket) => {
      const agentId = socket.nsp.name.split('/').pop()!;
      const workspace = socket.handshake.query.workspace as string;
      
      console.log(`Terminal connection for agent ${agentId}`);
      
      // Create PTY instance
      const pty = spawn(os.platform() === 'win32' ? 'cmd.exe' : 'bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: workspace || process.cwd(),
        env: process.env as any,
      });
      
      const session: TerminalSession = {
        pty,
        agentId,
        workspace,
      };
      
      this.sessions.set(socket.id, session);
      
      // Handle PTY output
      pty.onData((data) => {
        socket.emit('output', data);
      });
      
      // Handle terminal input
      socket.on('input', (data: string) => {
        pty.write(data);
      });
      
      // Handle resize
      socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
        pty.resize(cols, rows);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        const session = this.sessions.get(socket.id);
        if (session) {
          session.pty.kill();
          this.sessions.delete(socket.id);
        }
      });
      
      // Send initial prompt
      pty.write('echo "Agent terminal ready"\r\n');
      pty.write('pwd\r\n');
    });
  }
  
  getSession(agentId: string): TerminalSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.agentId === agentId) {
        return session;
      }
    }
  }
  
  executeCommand(agentId: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const session = this.getSession(agentId);
      if (!session) {
        reject(new Error(`No terminal session for agent ${agentId}`));
        return;
      }
      
      let output = '';
      const onData = (data: string) => {
        output += data;
      };
      
      session.pty.onData(onData);
      session.pty.write(`${command}\r\n`);
      
      setTimeout(() => {
        session.pty.off('data', onData);
        resolve(output);
      }, 1000);
    });
  }
}
```

### 4. ADD DEPENDENCIES:
```bash
cd apps/dashboard
pnpm add xterm xterm-addon-fit xterm-addon-web-links socket.io-client
cd services/agent-manager
pnpm add node-pty socket.io @types/node-pty
```

## SUCCESS CRITERIA:
- [ ] Terminal displays with proper styling
- [ ] WebSocket connection established
- [ ] Commands execute in agent workspace
- [ ] Output streams in real-time
- [ ] Clear, copy, download functions work
- [ ] Fullscreen mode toggles properly
- [ ] Terminal resizes correctly

## DO THIS NOW!
1. Create ALL files above IMMEDIATELY
2. Install all dependencies
3. Test terminal at /agents/[id]/terminal
4. Verify commands execute in correct workspace
5. Create PR with title: "feat: Agent terminal with xterm.js (Closes #12)"

**START CODING NOW! NO DELAYS!**