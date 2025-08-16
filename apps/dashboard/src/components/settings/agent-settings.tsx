'use client'

import React from 'react'
import { SettingsSection } from './settings-section'
import { FormField } from './form-field'

interface AgentSettingsProps {
  agents: {
    maxConcurrent: number
    defaultModel: string
    defaultWorkspace: string
  }
  onSettingChange: (path: string, value: any) => void
}

export function AgentSettings({ agents, onSettingChange }: AgentSettingsProps) {
  return (
    <SettingsSection title="Agent Defaults">
      <FormField 
        label="Max Concurrent Agents" 
        description="Maximum number of agents that can run simultaneously"
      >
        <input
          type="number"
          min="1"
          max="50"
          value={agents.maxConcurrent}
          onChange={(e) => onSettingChange('agents.maxConcurrent', parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </FormField>

      <FormField label="Default Model" description="Default Claude model for new agents">
        <select
          value={agents.defaultModel}
          onChange={(e) => onSettingChange('agents.defaultModel', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-haiku">Claude 3 Haiku</option>
        </select>
      </FormField>

      <FormField 
        label="Default Workspace" 
        description="Default workspace directory for new agents"
      >
        <input
          type="text"
          value={agents.defaultWorkspace}
          onChange={(e) => onSettingChange('agents.defaultWorkspace', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="/home/user/projects/"
        />
      </FormField>
    </SettingsSection>
  )
}