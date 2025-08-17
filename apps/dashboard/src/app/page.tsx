'use client'

import React, { useEffect, useMemo } from 'react'
import { DashboardLayout } from '../components/layout/dashboard-layout'
import { AgentList } from '../components/agents/agent-list'
import { SystemMetrics } from '../components/metrics/system-metrics'
import { useWebSocket } from '../hooks/use-websocket'
import { useAgentManagement } from '../hooks/use-agent-management'
import { useSystemMetrics } from '../hooks/use-system-metrics'

export default function HomePage() {
  const websocket = useWebSocket()
  const { systemMetrics } = useSystemMetrics()
  const { 
    agents, 
    handleCommand, 
    handleTerminate, 
    handlePause, 
    handleResume 
  } = useAgentManagement()

  // Memoized WebSocket command handler to prevent effect re-runs
  const memoizedCommandHandler = useMemo(() => 
    (agentId: string, command: string) => {
      handleCommand(agentId, command)
      websocket.sendCommand(agentId, command)
    }, 
    [handleCommand, websocket.sendCommand]
  )

  // Memoized connection status component
  const connectionStatus = useMemo(() => (
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
  ), [websocket.state])

  useEffect(() => {
    // Subscribe to metrics updates once
    websocket.subscribeToMetrics()
    
    // Subscribe to all agents - optimized to avoid subscription storms
    const agentIds = agents.map(agent => agent.id)
    agentIds.forEach(agentId => {
      websocket.subscribeToAgent(agentId)
    })
  }, [websocket.subscribeToMetrics, websocket.subscribeToAgent, agents])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Connection Status */}
        {connectionStatus}

        {/* System Metrics */}
        <SystemMetrics metrics={systemMetrics} />

        {/* Active Agents */}
        <AgentList
          agents={agents}
          onCommand={memoizedCommandHandler}
          onTerminate={handleTerminate}
          onPause={handlePause}
          onResume={handleResume}
        />
      </div>
    </DashboardLayout>
  )
}