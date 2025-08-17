/**
 * @package dashboard/components/agents/wizard
 * Available AI models for agent creation
 */

import type { AgentModel } from '@team-dashboard/types'

export interface ModelOption {
  model: AgentModel
  name: string
  description: string
  provider: string
  capabilities?: string[]
  pricing?: 'low' | 'medium' | 'high'
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    model: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable OpenAI model with multimodal capabilities',
    provider: 'OpenAI',
    capabilities: ['text', 'vision', 'code'],
    pricing: 'high'
  },
  {
    model: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and efficient model for most tasks',
    provider: 'OpenAI',
    capabilities: ['text', 'vision'],
    pricing: 'low'
  },
  {
    model: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Most intelligent Claude model with excellent reasoning',
    provider: 'Anthropic',
    capabilities: ['text', 'vision', 'code'],
    pricing: 'high'
  },
  {
    model: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Fastest Claude model for simple tasks',
    provider: 'Anthropic',
    capabilities: ['text'],
    pricing: 'low'
  }
]

export const DEFAULT_PERMISSIONS = {
  internet: false,
  fileSystem: false,
  subprocess: false,
  network: false,
  systemInfo: false
}

export const PERMISSION_DESCRIPTIONS = {
  internet: 'Allow the agent to access external websites and APIs',
  fileSystem: 'Allow the agent to read and write files',
  subprocess: 'Allow the agent to execute shell commands',
  network: 'Allow the agent to make network requests',
  systemInfo: 'Allow the agent to access system information'
}

export type AgentPermissions = typeof DEFAULT_PERMISSIONS