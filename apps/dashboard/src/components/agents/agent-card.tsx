'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { AgentModel, AgentStatus, AgentConfiguration } from '@team-dashboard/types'

const AgentTerminal = dynamic(() => import('./agent-terminal').then(mod => ({ default: mod.AgentTerminal })), {
  ssr: false,
  loading: () => <div className="min-h-[300px] bg-gray-900 rounded-md flex items-center justify-center text-gray-400">Loading terminal...</div>
})

interface Agent {
  id: string
  name: string
  model: AgentModel
  status: AgentStatus
  workspace: string
  uptime?: number
  lastActivity?: number
  cpu?: number
  memory?: number
  configuration?: AgentConfiguration
  systemPrompt?: string
}

interface AgentCardProps {
  agent: Agent
  onCommand?: (agentId: string, command: string) => void
  onTerminate?: (agentId: string) => void
  onPause?: (agentId: string) => void
  onResume?: (agentId: string) => void
  onEdit?: (agentId: string) => void
  onViewLogs?: (agentId: string) => void
  onStart?: () => void
  onStop?: () => void
  onDelete?: () => void
  onClick?: () => void
}

export function AgentCard({ agent, onCommand, onTerminate, onPause, onResume, onEdit, onViewLogs, onStart, onStop, onDelete, onClick }: AgentCardProps) {
  const [showTerminal, setShowTerminal] = useState(false)
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
    if (model.startsWith('gpt-')) {
      return 'text-green-400 bg-green-400/10 border-green-400/20'
    } else if (model.startsWith('claude-')) {
      return model === 'claude-3-opus' 
        ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
        : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    }
    return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  }

  const getModelDisplayName = (model: Agent['model']) => {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'claude-3-haiku': 'Claude 3 Haiku'
    }
    return modelMap[model] || model
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
    <div 
      className="bg-card border border-border rounded-lg p-6 space-y-4 cursor-pointer hover:border-border/80 transition-colors" 
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-foreground">
              {agent.name}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full border ${getModelBadgeColor(agent.model)}`}>
              {getModelDisplayName(agent.model)}
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

      {/* Terminal Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-2"
        >
          <span>{showTerminal ? '📄' : '💻'}</span>
          <span>{showTerminal ? 'Hide Terminal' : 'Show Terminal'}</span>
        </button>
        
        <div className="flex space-x-2 text-xs">
          {agent.configuration?.mcpServers && (
            <span className="text-muted-foreground">
              {agent.configuration.mcpServers.length} MCP servers
            </span>
          )}
          <span className="text-muted-foreground">
            {agent.model.startsWith('gpt-') ? 'OpenAI' : 'Anthropic'}
          </span>
        </div>
      </div>

      {/* Terminal */}
      {showTerminal && (
        <AgentTerminal
          agentId={agent.id}
          agentName={agent.name}
          model={agent.model}
          systemPrompt={agent.systemPrompt}
          onCommand={(command) => onCommand?.(agent.id, command)}
          className="min-h-[300px]"
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex space-x-2">
          {agent.status === 'stopped' && onStart && (
            <button
              onClick={onStart}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Start
            </button>
          )}
          {agent.status === 'running' && (
            <>
              {onStop && (
                <button
                  onClick={onStop}
                  className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => onPause?.(agent.id)}
                className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
              >
                Pause
              </button>
            </>
          )}
          {agent.status === 'paused' && (
            <button
              onClick={() => onResume?.(agent.id)}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Resume
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(agent.id)}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Configure
            </button>
          )}
          {onViewLogs && (
            <button
              onClick={() => onViewLogs(agent.id)}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Logs
            </button>
          )}
          {onDelete ? (
            <button
              onClick={onDelete}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Delete
            </button>
          ) : (
            <button
              onClick={() => onTerminate?.(agent.id)}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Terminate
            </button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Last activity: {agent.lastActivity ? new Date(agent.lastActivity).toLocaleTimeString() : 'Never'}
        </div>
      </div>
    </div>
  )
}