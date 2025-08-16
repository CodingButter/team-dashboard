'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { AgentCard } from '../../components/agents/agent-card'
import { useWebSocket } from '../../hooks/use-websocket'
import { Agent, mockAgents } from './mock-data'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: '',
    model: 'claude-3-sonnet' as const,
    workspace: '/home/user/projects/'
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

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAgent.name.trim()) return

    const agent: Agent = {
      id: `agent-${Date.now()}`,
      name: newAgent.name,
      model: newAgent.model,
      status: 'starting',
      workspace: newAgent.workspace,
      uptime: 0,
      lastActivity: Date.now(),
      cpu: 0,
      memory: 0,
    }

    setAgents(prev => [...prev, agent])
    websocket.createAgent(newAgent.name, newAgent.model, newAgent.workspace)
    
    setNewAgent({ name: '', model: 'claude-3-sonnet', workspace: '/home/user/projects/' })
    setShowCreateForm(false)
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
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            + Create Agent
          </button>
        </div>

        {/* Create Agent Form */}
        {showCreateForm && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Create New Agent</h3>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    placeholder="e.g. Frontend Developer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Model
                  </label>
                  <select
                    value={newAgent.model}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, model: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Workspace Path
                </label>
                <input
                  type="text"
                  value={newAgent.workspace}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, workspace: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="/home/user/projects/"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
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