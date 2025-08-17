import { AgentModel, AgentStatus } from '@team-dashboard/types'

// Memoized utility functions for agent card formatting
export const getStatusColor = (status: AgentStatus): string => {
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

export const getModelBadgeColor = (model: AgentModel): string => {
  if (model.startsWith('gpt-')) {
    return 'text-green-400 bg-green-400/10 border-green-400/20'
  } else if (model.startsWith('claude-')) {
    return model === 'claude-3-opus' 
      ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
      : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  }
  return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
}

export const getModelDisplayName = (model: AgentModel): string => {
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

export const formatUptime = (uptime?: number): string => {
  if (!uptime) return 'N/A'
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export const formatMemory = (memory?: number): string => {
  if (!memory) return 'N/A'
  return `${(memory / 1024 / 1024).toFixed(1)}MB`
}

export const formatLastActivity = (lastActivity?: number): string => {
  return lastActivity ? new Date(lastActivity).toLocaleTimeString() : 'Never'
}