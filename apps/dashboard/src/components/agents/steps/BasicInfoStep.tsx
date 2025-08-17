import React from 'react'
import { AgentConfiguration } from '@team-dashboard/types'

interface BasicInfoStepProps {
  config: Partial<AgentConfiguration>
  onUpdateConfig: (updates: Partial<AgentConfiguration>) => void
}

export function BasicInfoStep({ config, onUpdateConfig }: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>
        <p className="text-muted-foreground mb-6">
          Set up the basic details for your agent including name, description, and initial settings.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Agent Name *
          </label>
          <input
            type="text"
            value={config.name || ''}
            onChange={(e) => onUpdateConfig({ name: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            placeholder="Enter a descriptive name for your agent..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => onUpdateConfig({ description: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            rows={3}
            placeholder="Describe what this agent does and how it should behave..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            value={config.maxTokens || 1000}
            onChange={(e) => onUpdateConfig({ maxTokens: parseInt(e.target.value) || 1000 })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            min="100"
            max="32000"
            step="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Temperature
          </label>
          <input
            type="range"
            value={config.temperature || 0.7}
            onChange={(e) => onUpdateConfig({ temperature: parseFloat(e.target.value) })}
            className="w-full"
            min="0"
            max="1"
            step="0.1"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>More focused (0)</span>
            <span>Current: {config.temperature || 0.7}</span>
            <span>More creative (1)</span>
          </div>
        </div>
      </div>
    </div>
  )
}