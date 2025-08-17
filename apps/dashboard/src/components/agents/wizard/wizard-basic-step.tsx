'use client'

import React from 'react'
import type { AgentConfiguration } from '@team-dashboard/types'

interface WizardBasicStepProps {
  config: Partial<AgentConfiguration>
  onConfigUpdate: (updates: Partial<AgentConfiguration>) => void
}

export function WizardBasicStep({ config, onConfigUpdate }: WizardBasicStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set up the basic details for your agent.
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
            onChange={(e) => onConfigUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="My Assistant Agent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => onConfigUpdate({ description: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Brief description of what this agent does..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Working Directory
          </label>
          <input
            type="text"
            value={config.workingDirectory || '/home/agent'}
            onChange={(e) => onConfigUpdate({ workingDirectory: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="/home/agent"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Default working directory for agent operations
          </p>
        </div>
      </div>
    </div>
  )
}