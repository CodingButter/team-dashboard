'use client'

import React from 'react'
import { AgentTerminal } from '../terminal/AgentTerminal'

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

interface AgentCardProps {
  agent: Agent
  onCommand?: (agentId: string, command: string) => void
  onTerminate?: (agentId: string) => void
  onPause?: (agentId: string) => void
  onResume?: (agentId: string) => void
}

export function AgentCard({ agent, onCommand, onTerminate, onPause, onResume }: AgentCardProps) {
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-400/10'
      case 'paused': return 'text-yellow-400 bg-yellow-400/10'
      case 'starting': return 'text-blue-400 bg-blue-400/10'
      case 'stopping': return 'text-orange-400 bg-orange-400/10'
      case 'stopped': return 'text-gray-400 bg-gray-400/10'
      case 'crashed': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getModelBadgeColor = (model: Agent['model']) => {
    return model === 'claude-3-opus' 
      ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
      : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  }

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A'
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemory = (memory?: number) => {
    if (!memory) return 'N/A'
    return `${(memory / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-foreground">
              {agent.name}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full border ${getModelBadgeColor(agent.model)}`}>
              {agent.model}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.workspace}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(agent.status)}`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Uptime</div>
          <div className="text-foreground font-medium">{formatUptime(agent.uptime)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">CPU</div>
          <div className="text-foreground font-medium">{agent.cpu ? `${agent.cpu}%` : 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Memory</div>
          <div className="text-foreground font-medium">{formatMemory(agent.memory)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">ID</div>
          <div className="text-foreground font-medium font-mono text-xs">{agent.id.slice(-8)}</div>
        </div>
      </div>

      {/* Terminal */}
      <AgentTerminal
        agentId={agent.id}
        onCommand={(command) => onCommand?.(agent.id, command)}
        height={300}
        theme="dark"
        className="min-h-[300px]"
      />

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex space-x-2">
          {agent.status === 'running' && (
            <button
              onClick={() => onPause?.(agent.id)}
              className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
            >
              Pause
            </button>
          )}
          {agent.status === 'paused' && (
            <button
              onClick={() => onResume?.(agent.id)}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Resume
            </button>
          )}
          <button
            onClick={() => onTerminate?.(agent.id)}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Terminate
          </button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Last activity: {agent.lastActivity ? new Date(agent.lastActivity).toLocaleTimeString() : 'Never'}
        </div>
      </div>
    </div>
  )
}