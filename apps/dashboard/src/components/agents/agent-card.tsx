'use client'

import React, { useState, memo, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { AgentModel, AgentStatus, AgentConfiguration } from '@team-dashboard/types'
import { 
  getStatusColor, 
  getModelBadgeColor, 
  getModelDisplayName, 
  formatUptime, 
  formatMemory, 
  formatLastActivity 
} from './agent-utils'
import { AgentActions } from './agent-actions'

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

export const AgentCard = memo<AgentCardProps>(({ 
  agent, 
  onCommand, 
  onTerminate, 
  onPause, 
  onResume, 
  onEdit, 
  onViewLogs, 
  onStart, 
  onStop, 
  onDelete, 
  onClick 
}) => {
  const [showTerminal, setShowTerminal] = useState(false)

  // Memoized computed values to prevent recalculation
  const statusColor = useMemo(() => getStatusColor(agent.status), [agent.status])
  const modelBadgeColor = useMemo(() => getModelBadgeColor(agent.model), [agent.model])
  const modelDisplayName = useMemo(() => getModelDisplayName(agent.model), [agent.model])
  const formattedUptime = useMemo(() => formatUptime(agent.uptime), [agent.uptime])
  const formattedMemory = useMemo(() => formatMemory(agent.memory), [agent.memory])
  const formattedLastActivity = useMemo(() => formatLastActivity(agent.lastActivity), [agent.lastActivity])

  // Memoized terminal toggle handler
  const handleTerminalToggle = useCallback(() => {
    setShowTerminal(prev => !prev)
  }, [])

  // Memoized command handler
  const handleCommand = useCallback((command: string) => {
    onCommand?.(agent.id, command)
  }, [onCommand, agent.id])

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
            <span className={`px-2 py-1 text-xs rounded-full border ${modelBadgeColor}`}>
              {modelDisplayName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.workspace}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Uptime</div>
          <div className="text-foreground font-medium">{formattedUptime}</div>
        </div>
        <div>
          <div className="text-muted-foreground">CPU</div>
          <div className="text-foreground font-medium">{agent.cpu ? `${agent.cpu}%` : 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Memory</div>
          <div className="text-foreground font-medium">{formattedMemory}</div>
        </div>
        <div>
          <div className="text-muted-foreground">ID</div>
          <div className="text-foreground font-medium font-mono text-xs">{agent.id.slice(-8)}</div>
        </div>
      </div>

      {/* Terminal Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleTerminalToggle}
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
          onCommand={handleCommand}
          className="min-h-[300px]"
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <AgentActions
          agentId={agent.id}
          status={agent.status}
          onStart={onStart}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
          onEdit={onEdit}
          onViewLogs={onViewLogs}
          onDelete={onDelete}
          onTerminate={onTerminate}
        />
        
        <div className="text-xs text-muted-foreground">
          Last activity: {formattedLastActivity}
        </div>
      </div>
    </div>
  )
})

AgentCard.displayName = 'AgentCard'