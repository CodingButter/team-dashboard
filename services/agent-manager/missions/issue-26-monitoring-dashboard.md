# URGENT MISSION: Real-Time System Monitoring Dashboard - Issue #26

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #26 - Implement real-time system monitoring dashboard
**Priority**: P1 - HIGH PRIORITY
**Agent**: frontend-expert

## START CODING IMMEDIATELY!

### 1. CREATE THIS FILE FIRST:
**File**: `/apps/dashboard/src/app/monitoring/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  network: { in: number; out: number };
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    
    newSocket.on('metrics', (data: SystemMetrics) => {
      setMetrics(prev => [...prev.slice(-59), data].slice(-60));
    });
    
    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Monitoring</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="memory" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 2. THEN CREATE THE WEBSOCKET HANDLER:
**File**: `/services/system-monitor/src/metrics-websocket.ts`

```typescript
import { Server } from 'socket.io';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MetricsWebSocket {
  private io: Server;
  
  constructor(port: number = 3002) {
    this.io = new Server(port, {
      cors: { origin: '*' }
    });
    
    this.startMetricsStream();
  }
  
  private async getSystemMetrics() {
    const cpu = await this.getCpuUsage();
    const memory = await this.getMemoryUsage();
    const disk = await this.getDiskUsage();
    const network = await this.getNetworkUsage();
    
    return {
      timestamp: Date.now(),
      cpu,
      memory,
      disk,
      network
    };
  }
  
  private async getCpuUsage(): Promise<number> {
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
    return parseFloat(stdout.trim());
  }
  
  private async getMemoryUsage(): Promise<number> {
    const { stdout } = await execAsync("free | grep Mem | awk '{print $3/$2 * 100.0}'");
    return parseFloat(stdout.trim());
  }
  
  private async getDiskUsage(): Promise<number> {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'");
    return parseFloat(stdout.replace('%', ''));
  }
  
  private async getNetworkUsage() {
    // Simplified network metrics
    return { in: Math.random() * 100, out: Math.random() * 100 };
  }
  
  private startMetricsStream() {
    setInterval(async () => {
      const metrics = await this.getSystemMetrics();
      this.io.emit('metrics', metrics);
    }, 1000);
  }
}

// Start the server
new MetricsWebSocket();
```

### 3. ADD REQUIRED DEPENDENCIES:
```bash
cd apps/dashboard
pnpm add socket.io-client recharts
cd services/system-monitor
pnpm add socket.io
```

## SUCCESS CRITERIA:
- [ ] Real-time charts updating every second
- [ ] CPU, Memory, Disk, Network metrics displayed
- [ ] WebSocket connection working
- [ ] Responsive grid layout
- [ ] Charts use proper data windowing (60 data points)

## DO THIS NOW!
1. Create the files above IMMEDIATELY
2. Install dependencies
3. Test the dashboard at http://localhost:3000/monitoring
4. Create PR with title: "feat: Real-time system monitoring dashboard (Closes #26)"

**START CODING NOW! NO DELAYS!**