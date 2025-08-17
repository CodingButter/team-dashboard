'use client'

import React, { memo, useMemo } from 'react'
import { AgentCard } from './agent-card'

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

interface AgentListProps {
  agents: Agent[]
  onCommand: (agentId: string, command: string) => void
  onTerminate: (agentId: string) => void
  onPause: (agentId: string) => void
  onResume: (agentId: string) => void
}

// Memoized AgentCard to prevent unnecessary re-renders
const MemoizedAgentCard = memo(AgentCard)

export const AgentList = memo<AgentListProps>(({ 
  agents, 
  onCommand, 
  onTerminate, 
  onPause, 
  onResume 
}) => {
  // Memoize the empty state to prevent re-renders
  const emptyState = useMemo(() => (
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <div className="text-muted-foreground">
        No active agents. Click "New Agent" to get started.
      </div>
    </div>
  ), [])

  // Memoize agent cards array to prevent recreation on parent re-render
  const agentCards = useMemo(() => 
    agents.map(agent => (
      <MemoizedAgentCard
        key={agent.id}
        agent={agent}
        onCommand={onCommand}
        onTerminate={onTerminate}
        onPause={onPause}
        onResume={onResume}
      />
    )), 
    [agents, onCommand, onTerminate, onPause, onResume]
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">
        Active Agents ({agents.length})
      </h2>
      
      {agents.length === 0 ? emptyState : (
        <div className="grid gap-6">
          {agentCards}
        </div>
      )}
    </div>
  )
})

AgentList.displayName = 'AgentList'