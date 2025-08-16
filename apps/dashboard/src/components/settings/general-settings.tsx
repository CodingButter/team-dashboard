'use client'

import React from 'react'
import { SettingsSection } from './settings-section'
import { FormField, ToggleField } from './form-field'

interface GeneralSettingsProps {
  settings: {
    theme: string
    autoRefresh: boolean
    refreshInterval: number
  }
  onSettingChange: (path: string, value: any) => void
}

export function GeneralSettings({ settings, onSettingChange }: GeneralSettingsProps) {
  return (
    <SettingsSection title="General">
      <FormField label="Theme">
        <select
          value={settings.theme}
          onChange={(e) => onSettingChange('theme', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </FormField>

      <ToggleField
        label="Auto Refresh"
        description="Automatically refresh data"
        checked={settings.autoRefresh}
        onChange={(checked) => onSettingChange('autoRefresh', checked)}
      />

      {settings.autoRefresh && (
        <FormField 
          label="Refresh Interval (seconds)" 
          description="How often to refresh data (1-60 seconds)"
        >
          <input
            type="number"
            min="1"
            max="60"
            value={settings.refreshInterval}
            onChange={(e) => onSettingChange('refreshInterval', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </FormField>
      )}
    </SettingsSection>
  )
}