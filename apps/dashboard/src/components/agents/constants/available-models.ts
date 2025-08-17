import { AgentModel } from '@team-dashboard/types'

export const AVAILABLE_MODELS: { 
  model: AgentModel; 
  name: string; 
  description: string; 
  provider: string 
}[] = [
  {
    model: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable OpenAI model with multimodal capabilities',
    provider: 'OpenAI'
  },
  {
    model: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and efficient model for most tasks',
    provider: 'OpenAI'
  },
  {
    model: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Advanced reasoning with large context window',
    provider: 'OpenAI'
  },
  {
    model: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Most powerful Claude model for complex tasks',
    provider: 'Anthropic'
  },
  {
    model: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and speed',
    provider: 'Anthropic'
  },
  {
    model: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fastest Claude model for simple tasks',
    provider: 'Anthropic'
  }
]