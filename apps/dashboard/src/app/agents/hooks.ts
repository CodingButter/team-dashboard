/**
 * Agent management hooks
 * Custom hooks for handling agent state and WebSocket operations
 */

import { useState } from 'react'
import { useWebSocket } from '../../hooks/use-websocket'
import { Agent, mockAgents } from './mock-data'

export function useAgentManagement() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const { state } = useWebSocket()

  // Handle agent operations
  const createAgent = (config: { name: string; model: string; workspace: string }) => {
    console.log('Creating agent:', config)
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: config.name,
      model: config.model as Agent['model'],
      status: 'starting',
      workspace: config.workspace,
      uptime: 0,
      lastActivity: Date.now(),
      cpu: 0,
      memory: 0,
    }
    setAgents(prev => [...prev, newAgent])
  }

  const startAgent = (agentId: string) => {
    console.log('Starting agent:', agentId)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'starting' as const }
        : agent
    ))
  }

  const stopAgent = (agentId: string) => {
    console.log('Stopping agent:', agentId)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'stopping' as const }
        : agent
    ))
  }

  const pauseAgent = (agentId: string) => {
    console.log('Pausing agent:', agentId)
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'paused' as const }
        : agent
    ))
  }

  const deleteAgent = (agentId: string) => {
    console.log('Deleting agent:', agentId)
    setAgents(prev => prev.filter(agent => agent.id !== agentId))
  }

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  return {
    agents,
    selectedAgent,
    isCreating,
    showCreateModal,
    connected: state.connected,
    isConnecting: state.reconnecting,
    setIsCreating,
    setShowCreateModal,
    createAgent,
    startAgent,
    stopAgent,
    pauseAgent,
    deleteAgent,
    selectAgent,
  }
}