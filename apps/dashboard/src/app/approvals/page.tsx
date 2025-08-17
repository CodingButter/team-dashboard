'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { ToolApprovalQueue } from '../../components/tools/tool-approval'
import { useWebSocket } from '../../hooks/use-websocket'
import { ToolApprovalRequest } from '@team-dashboard/types'

// Mock data for demonstration - in real app this would come from WebSocket/API
const mockRequests: ToolApprovalRequest[] = [
  {
    id: 'req-001',
    toolName: 'bash',
    serverId: 'mcp-server-001',
    agentId: 'agent-frontend-001',
    agentName: 'Frontend Developer',
    input: {
      command: 'rm -rf node_modules && npm install',
      workingDirectory: '/home/user/project'
    },
    riskLevel: 'medium',
    riskFactors: ['Package installation', 'Directory deletion'],
    requestedAt: Date.now() - 120000,
    context: 'Installing fresh dependencies after package.json changes',
    workingDirectory: '/home/user/project'
  },
  {
    id: 'req-002',
    toolName: 'file_write',
    serverId: 'mcp-server-001',
    agentId: 'agent-backend-001',
    agentName: 'Backend Engineer',
    input: {
      path: '/etc/nginx/nginx.conf',
      content: 'server { listen 80; server_name example.com; }'
    },
    riskLevel: 'high',
    riskFactors: ['System directory access', 'Configuration file modification'],
    requestedAt: Date.now() - 60000,
    context: 'Updating nginx configuration for new deployment',
    workingDirectory: '/home/user/infra'
  },
  {
    id: 'req-003',
    toolName: 'git',
    serverId: 'mcp-server-001',
    agentId: 'agent-devops-001',
    agentName: 'DevOps Specialist',
    input: {
      command: 'push origin main --force',
      repository: 'https://github.com/company/production-app'
    },
    riskLevel: 'critical',
    riskFactors: ['Force push to main branch', 'Production repository'],
    requestedAt: Date.now() - 30000,
    context: 'Emergency hotfix deployment to production',
    workingDirectory: '/home/user/production-app'
  }
]

interface ApprovalStats {
  total: number
  pending: number
  approved: number
  denied: number
  averageResponseTime: number
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ToolApprovalRequest[]>(mockRequests)
  const [processingRequestIds, setProcessingRequestIds] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [stats, setStats] = useState<ApprovalStats>({
    total: 3,
    pending: 3,
    approved: 12,
    denied: 2,
    averageResponseTime: 45
  })

  const websocket = useWebSocket()

  const filteredRequests = requests.filter(request => 
    filter === 'all' || request.riskLevel === filter
  )

  const handleApprove = useCallback(async (requestId: string, reasoning?: string) => {
    setProcessingRequestIds(prev => [...prev, requestId])
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Send approval via WebSocket
      websocket.sendMessage({
        id: `approve-${Date.now()}`,
        type: 'tool:approve',
        timestamp: Date.now(),
        payload: {
          requestId,
          reasoning,
          approvedBy: 'current-user'
        }
      })
      
      // Remove from pending requests
      setRequests(prev => prev.filter(req => req.id !== requestId))
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        approved: prev.approved + 1
      }))
      
    } catch (error) {
      console.error('Failed to approve request:', error)
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId))
    }
  }, [websocket])

  const handleDeny = useCallback(async (requestId: string, reasoning?: string) => {
    setProcessingRequestIds(prev => [...prev, requestId])
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Send denial via WebSocket
      websocket.sendMessage({
        id: `deny-${Date.now()}`,
        type: 'tool:deny',
        timestamp: Date.now(),
        payload: {
          requestId,
          reasoning,
          deniedBy: 'current-user'
        }
      })
      
      // Remove from pending requests
      setRequests(prev => prev.filter(req => req.id !== requestId))
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        denied: prev.denied + 1
      }))
      
    } catch (error) {
      console.error('Failed to deny request:', error)
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId))
    }
  }, [websocket])

  const handleBatchApprove = useCallback(async (requestIds: string[], reasoning?: string) => {
    setProcessingRequestIds(prev => [...prev, ...requestIds])
    
    try {
      // Simulate batch API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Send batch approval via WebSocket
      websocket.sendMessage({
        id: `batch-approve-${Date.now()}`,
        type: 'tool:batch_approve',
        timestamp: Date.now(),
        payload: {
          requestIds,
          reasoning,
          approvedBy: 'current-user'
        }
      })
      
      // Remove from pending requests
      setRequests(prev => prev.filter(req => !requestIds.includes(req.id)))
      setStats(prev => ({
        ...prev,
        pending: prev.pending - requestIds.length,
        approved: prev.approved + requestIds.length
      }))
      
    } catch (error) {
      console.error('Failed to batch approve requests:', error)
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => !requestIds.includes(id)))
    }
  }, [websocket])

  const handleBatchDeny = useCallback(async (requestIds: string[], reasoning?: string) => {
    setProcessingRequestIds(prev => [...prev, ...requestIds])
    
    try {
      // Simulate batch API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Send batch denial via WebSocket
      websocket.sendMessage({
        id: `batch-deny-${Date.now()}`,
        type: 'tool:batch_deny',
        timestamp: Date.now(),
        payload: {
          requestIds,
          reasoning,
          deniedBy: 'current-user'
        }
      })
      
      // Remove from pending requests
      setRequests(prev => prev.filter(req => !requestIds.includes(req.id)))
      setStats(prev => ({
        ...prev,
        pending: prev.pending - requestIds.length,
        denied: prev.denied + requestIds.length
      }))
      
    } catch (error) {
      console.error('Failed to batch deny requests:', error)
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => !requestIds.includes(id)))
    }
  }, [websocket])

  const handleIgnore = useCallback((requestId: string) => {
    setRequests(prev => prev.filter(req => req.id !== requestId))
    setStats(prev => ({
      ...prev,
      pending: prev.pending - 1
    }))
  }, [])

  // Set up WebSocket message handlers for new tool approval requests
  useEffect(() => {
    // TODO: Implement real WebSocket handling for new tool approval requests
    // const handleNewRequest = (message: any) => {
    //   if (message.type === 'tool:approval_required') {
    //     setRequests(prev => [message.payload, ...prev])
    //     setStats(prev => ({
    //       ...prev,
    //       pending: prev.pending + 1,
    //       total: prev.total + 1
    //     }))
    //   }
    // }

    // In a real implementation, you'd register this handler with the WebSocket
    // websocket.addMessageHandler('tool:approval_required', handleNewRequest)
    
    return () => {
      // Clean up handler
      // websocket.removeMessageHandler('tool:approval_required', handleNewRequest)
    }
  }, [websocket])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Tool Approvals</h1>
          
          <div className="flex items-center space-x-4">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            {/* Auto-refresh indicator */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${
                websocket.state.connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>Live updates</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{stats.denied}</div>
            <div className="text-sm text-muted-foreground">Denied</div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.averageResponseTime}s</div>
            <div className="text-sm text-muted-foreground">Avg Response</div>
          </div>
        </div>

        {/* Real-time Status */}
        {websocket.state.connected && requests.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Monitoring {requests.length} pending request{requests.length !== 1 ? 's' : ''} in real-time
              </span>
            </div>
          </div>
        )}

        {/* Tool Approval Queue */}
        <ToolApprovalQueue
          requests={filteredRequests}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onIgnore={handleIgnore}
          onBatchApprove={handleBatchApprove}
          onBatchDeny={handleBatchDeny}
          processingRequestIds={processingRequestIds}
        />
      </div>
    </DashboardLayout>
  )
}