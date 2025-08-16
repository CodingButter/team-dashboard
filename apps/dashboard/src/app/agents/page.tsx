'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { AgentCard } from '../../components/agents/agent-card'
import { AgentCreationWizard } from '../../components/agents/agent-creation-wizard'
import { useWebSocket } from '../../hooks/use-websocket'
import { Agent, mockAgents, mockSystemPrompts, mockMCPServers } from './mock-data'
import { AgentConfiguration } from '@team-dashboard/types'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)

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

  const handleCreateAgent = async (config: AgentConfiguration) => {
    setIsCreatingAgent(true)
    
    try {
      // Convert wizard config to our Agent interface
      const agent: Agent = {
        id: config.id,
        name: config.name,
        model: config.model.includes('opus') ? 'claude-3-opus' : 'claude-3-sonnet',
        status: 'starting',
        workspace: config.workingDirectory || '/home/agent',
        uptime: 0,
        lastActivity: Date.now(),
        cpu: 0,
        memory: 0,
      }

      // Add to local state first for immediate UI feedback
      setAgents(prev => [...prev, agent])
      
      // Create agent via websocket (this would be the real API call)
      websocket.createAgent(config.name, config.model, config.workingDirectory || '/home/agent')
      
      // Close wizard
      setShowCreateWizard(false)
      
      console.log('Agent created with configuration:', config)
    } catch (error) {
      console.error('Failed to create agent:', error)
      // Remove from local state if creation failed
      setAgents(prev => prev.filter(a => a.id !== config.id))
    } finally {
      setIsCreatingAgent(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Management</h1>
            <p className="text-muted-foreground">
              Manage and monitor your Claude Code agents
            </p>
          </div>
          <button
            onClick={() => setShowCreateWizard(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            + Create Agent
          </button>
        </div>

        {/* Agent Creation Wizard */}
        {showCreateWizard && (
          <AgentCreationWizard
            onCreateAgent={handleCreateAgent}
            onCancel={() => setShowCreateWizard(false)}
            systemPrompts={mockSystemPrompts}
            mcpServers={mockMCPServers}
            isCreating={isCreatingAgent}
          />
        )}

        {/* Agent List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Active Agents ({agents.length})
          </h2>
          
          {agents.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="text-muted-foreground">
                No agents yet. Create your first agent to get started.
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