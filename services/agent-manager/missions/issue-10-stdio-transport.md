# URGENT MISSION: STDIO Transport Layer for MCP - Issue #10

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #10 - Create STDIO transport layer for MCP
**Priority**: P0 - CRITICAL
**Agent**: backend-specialist

## START CODING IMMEDIATELY!

### CREATE THIS FILE NOW:
**File**: `/services/mcp-manager/src/transports/stdio-transport.ts`

```typescript
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';

export class StdioTransport extends EventEmitter {
  private buffer = '';
  
  constructor(
    private stdin: Writable,
    private stdout: Readable,
    private stderr?: Readable
  ) {
    super();
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this.processBuffer();
    });
    
    if (this.stderr) {
      this.stderr.on('data', (chunk) => {
        this.emit('error', chunk.toString());
      });
    }
  }
  
  private processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.emit('message', message);
        } catch (e) {
          this.emit('raw', line);
        }
      }
    }
  }
  
  send(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(message) + '\n';
      this.stdin.write(data, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  close() {
    this.stdin.end();
    this.stdout.destroy();
    if (this.stderr) this.stderr.destroy();
  }
}
```

## START NOW! Create the file and implement STDIO transport!