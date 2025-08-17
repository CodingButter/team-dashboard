# URGENT MISSION: Tool Approval Workflow UI - Issue #25

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #25 - Create tool approval workflow UI
**Priority**: P1 - HIGH PRIORITY  
**Agent**: frontend-expert

## START CODING IMMEDIATELY!

### 1. CREATE THIS FILE FIRST:
**File**: `/apps/dashboard/src/app/tool-approval/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Button } from '@/ui/components/ui/button';
import { Badge } from '@/ui/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ToolRequest {
  id: string;
  agentId: string;
  agentName: string;
  toolName: string;
  parameters: Record<string, any>;
  reason: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
  risk: 'low' | 'medium' | 'high';
}

export default function ToolApprovalPage() {
  const [requests, setRequests] = useState<ToolRequest[]>([
    {
      id: '1',
      agentId: 'agent-1',
      agentName: 'Frontend Expert',
      toolName: 'Write',
      parameters: { file_path: '/app/src/components/NewComponent.tsx' },
      reason: 'Creating new React component for user dashboard',
      timestamp: new Date(),
      status: 'pending',
      risk: 'low'
    },
    {
      id: '2',
      agentId: 'agent-2',
      agentName: 'Backend Specialist',
      toolName: 'Bash',
      parameters: { command: 'rm -rf node_modules' },
      reason: 'Cleaning dependencies for fresh install',
      timestamp: new Date(),
      status: 'pending',
      risk: 'high'
    }
  ]);

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'approved' } : req
    ));
    
    // Send approval to backend
    fetch(`/api/tool-approval/${id}/approve`, { method: 'POST' });
  };

  const handleReject = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'rejected' } : req
    ));
    
    // Send rejection to backend
    fetch(`/api/tool-approval/${id}/reject`, { method: 'POST' });
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[risk as keyof typeof colors]}>{risk.toUpperCase()}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tool Approval Workflow</h1>
        <p className="text-gray-600">Review and approve agent tool requests</p>
      </div>

      <div className="grid gap-4">
        {requests.map(request => (
          <Card key={request.id} className={request.status === 'pending' ? 'border-yellow-400' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span>{request.toolName}</span>
                    {getRiskBadge(request.risk)}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Requested by {request.agentName} • {request.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(request.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleReject(request.id)}
                      size="sm"
                      variant="destructive"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Reason:</span> {request.reason}
                </div>
                <div>
                  <span className="font-semibold">Parameters:</span>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(request.parameters, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 2. CREATE THE API ROUTE:
**File**: `/apps/dashboard/src/app/api/tool-approval/[id]/[action]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  const { id, action } = params;
  
  // Connect to WebSocket server to notify agent
  const ws = new WebSocket('ws://localhost:3001');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'tool_approval_response',
      requestId: id,
      action: action,
      timestamp: new Date().toISOString()
    }));
    ws.close();
  };

  // Store in database
  await fetch('http://localhost:5432/api/tool-approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action, timestamp: new Date() })
  });

  return NextResponse.json({ success: true, id, action });
}
```

### 3. CREATE THE WEBSOCKET LISTENER:
**File**: `/services/agent-manager/src/tool-approval-handler.ts`

```typescript
import { Server } from 'socket.io';

export class ToolApprovalHandler {
  private pendingRequests = new Map();
  
  constructor(private io: Server) {
    this.setupListeners();
  }
  
  private setupListeners() {
    this.io.on('connection', (socket) => {
      socket.on('tool_request', (data) => {
        const requestId = `req_${Date.now()}`;
        
        this.pendingRequests.set(requestId, {
          socket,
          ...data,
          id: requestId,
          timestamp: new Date()
        });
        
        // Notify UI
        this.io.emit('new_tool_request', {
          id: requestId,
          ...data
        });
      });
      
      socket.on('tool_approval_response', (data) => {
        const request = this.pendingRequests.get(data.requestId);
        if (request) {
          request.socket.emit('tool_response', {
            approved: data.action === 'approve',
            requestId: data.requestId
          });
          this.pendingRequests.delete(data.requestId);
        }
      });
    });
  }
}
```

## SUCCESS CRITERIA:
- [ ] Tool requests displayed in real-time
- [ ] Approve/Reject buttons working
- [ ] Risk levels properly color-coded
- [ ] WebSocket communication established
- [ ] API routes functioning
- [ ] Status updates reflected in UI

## DO THIS NOW!
1. Create ALL files above IMMEDIATELY
2. Test the approval workflow
3. Ensure WebSocket integration works
4. Create PR with title: "feat: Tool approval workflow UI (Closes #25)"

**START CODING NOW! NO DELAYS!**