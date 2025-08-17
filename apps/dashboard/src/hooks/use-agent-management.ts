'use client'

import { useState, useCallback, useMemo } from 'react'

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

const INITIAL_AGENTS: Agent[] = [
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
]

export function useAgentManagement() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS)

  // Memoized handlers to prevent recreation on each render
  const handleCommand = useCallback((agentId: string, command: string) => {
    console.log(`Sending command to ${agentId}:`, command)
    // WebSocket command sending will be handled by parent component
  }, [])

  const handleTerminate = useCallback((agentId: string) => {
    console.log(`Terminating agent ${agentId}`)
    setAgents(prev => prev.filter(agent => agent.id !== agentId))
  }, [])

  const handlePause = useCallback((agentId: string) => {
    console.log(`Pausing agent ${agentId}`)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, status: 'paused' as const } : agent
    ))
  }, [])

  const handleResume = useCallback((agentId: string) => {
    console.log(`Resuming agent ${agentId}`)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, status: 'running' as const } : agent
    ))
  }, [])

  // Memoized agent statistics for performance
  const agentStats = useMemo(() => ({
    total: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    paused: agents.filter(a => a.status === 'paused').length,
    stopped: agents.filter(a => a.status === 'stopped').length,
  }), [agents])

  return {
    agents,
    agentStats,
    handleCommand,
    handleTerminate,
    handlePause,
    handleResume,
  }
}