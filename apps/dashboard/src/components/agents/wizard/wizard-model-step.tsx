'use client'

import React from 'react'
import type { AgentConfiguration, AgentModel } from '@team-dashboard/types'

interface WizardModelStepProps {
  config: Partial<AgentConfiguration>
  onConfigUpdate: (updates: Partial<AgentConfiguration>) => void
}

const AVAILABLE_MODELS: { model: AgentModel; name: string; description: string; provider: string }[] = [
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
    description: 'Fast and efficient for simple tasks',
    provider: 'Anthropic'
  }
]

export function WizardModelStep({ config, onConfigUpdate }: WizardModelStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Model Selection</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Choose the AI model that will power your agent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_MODELS.map((modelInfo) => (
          <div
            key={modelInfo.model}
            className={`border border-border rounded-lg p-4 cursor-pointer transition-colors ${
              config.model === modelInfo.model
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'hover:border-gray-400'
            }`}
            onClick={() => onConfigUpdate({ model: modelInfo.model })}
          >
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                checked={config.model === modelInfo.model}
                onChange={() => onConfigUpdate({ model: modelInfo.model })}
                className="text-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">{modelInfo.name}</h4>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                    {modelInfo.provider}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {modelInfo.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            value={config.maxTokens || 4000}
            onChange={(e) => onConfigUpdate({ maxTokens: parseInt(e.target.value) || 4000 })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            min="100"
            max="32000"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum tokens per response (100-32000)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Temperature
          </label>
          <input
            type="number"
            value={config.temperature || 0.1}
            onChange={(e) => onConfigUpdate({ temperature: parseFloat(e.target.value) || 0.1 })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            min="0"
            max="2"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Creativity level (0.0 = deterministic, 2.0 = very creative)
          </p>
        </div>
      </div>
    </div>
  )
}