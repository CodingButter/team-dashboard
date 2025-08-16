'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '../components/layout/dashboard-layout'
import { AgentCard } from '../components/agents/agent-card'
import { SystemMetrics } from '../components/metrics/system-metrics'
import { useWebSocket } from '../hooks/use-websocket'

interface Agent {
  id: string
  name: string
  model: 'claude-3-opus' | 'claude-3-sonnet'
  status: 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'crashed'
  workspace: string
  uptime?: number
  lastActivity?: number
  cpu?: number
  memory?: number
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'agent-demo-001',
      name: 'Frontend Developer',
      model: 'claude-3-sonnet',
      status: 'running',
      workspace: '/home/user/projects/frontend',
      uptime: 3600,
      lastActivity: Date.now() - 30000,
      cpu: 12.5,
      memory: 256 * 1024 * 1024,
    },
    {
      id: 'agent-demo-002',
      name: 'Backend Engineer',
      model: 'claude-3-opus',
      status: 'paused',
      workspace: '/home/user/projects/backend',
      uptime: 7200,
      lastActivity: Date.now() - 300000,
      cpu: 8.2,
      memory: 512 * 1024 * 1024,
    },
    {
      id: 'agent-demo-003',
      name: 'DevOps Specialist',
      model: 'claude-3-sonnet',
      status: 'running',
      workspace: '/home/user/projects/infra',
      uptime: 1800,
      lastActivity: Date.now() - 5000,
      cpu: 25.8,
      memory: 128 * 1024 * 1024,
    },
  ])

  const [systemMetrics] = useState({
    cpu: {
      usage: 45.2,
      cores: 8,
      temperature: 62,
    },
    memory: {
      total: 16 * 1024 * 1024 * 1024,
      used: 8.5 * 1024 * 1024 * 1024,
      available: 7.5 * 1024 * 1024 * 1024,
      percent: 53.1,
    },
    disk: {
      total: 1 * 1024 * 1024 * 1024 * 1024,
      used: 650 * 1024 * 1024 * 1024,
      percent: 65.0,
    },
    network: {
      bytesIn: 1250000000,
      bytesOut: 890000000,
      packetsIn: 125000,
      packetsOut: 89000,
    },
  })

  const websocket = useWebSocket()

  const handleCommand = (agentId: string, command: string) => {
    console.log(`Sending command to ${agentId}:`, command)
    websocket.sendCommand(agentId, command)
  }

  const handleTerminate = (agentId: string) => {
    console.log(`Terminating agent ${agentId}`)
    setAgents(prev => prev.filter(agent => agent.id !== agentId))
  }

  const handlePause = (agentId: string) => {
    console.log(`Pausing agent ${agentId}`)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, status: 'paused' as const } : agent
    ))
  }

  const handleResume = (agentId: string) => {
    console.log(`Resuming agent ${agentId}`)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, status: 'running' as const } : agent
    ))
  }

  useEffect(() => {
    // Subscribe to metrics updates
    websocket.subscribeToMetrics()
    
    // Subscribe to all agents
    agents.forEach(agent => {
      websocket.subscribeToAgent(agent.id)
    })
  }, [websocket, agents])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              WebSocket Connection
            </h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                websocket.state.connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-muted-foreground">
                {websocket.state.connected ? 'Connected' : 
                 websocket.state.reconnecting ? 'Reconnecting...' : 'Disconnected'}
              </span>
              {websocket.state.error && (
                <span className="text-xs text-red-400">
                  Error: {websocket.state.error}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={systemMetrics} />

        {/* Active Agents */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Active Agents ({agents.length})
          </h2>
          
          {agents.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="text-muted-foreground">
                No active agents. Click "New Agent" to get started.
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onCommand={handleCommand}
                  onTerminate={handleTerminate}
                  onPause={handlePause}
                  onResume={handleResume}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}