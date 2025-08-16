'use client'

import React from 'react'
import { SettingsSection } from './settings-section'
import { ToggleField } from './form-field'

interface NotificationSettingsProps {
  notifications: {
    agentStatus: boolean
    systemAlerts: boolean
    performance: boolean
  }
  onSettingChange: (path: string, value: any) => void
}

export function NotificationSettings({ notifications, onSettingChange }: NotificationSettingsProps) {
  return (
    <SettingsSection title="Notifications">
      <ToggleField
        label="Agent Status Changes"
        description="Notify when agents start, stop, or crash"
        checked={notifications.agentStatus}
        onChange={(checked) => onSettingChange('notifications.agentStatus', checked)}
      />

      <ToggleField
        label="System Alerts"
        description="Notify about system issues and warnings"
        checked={notifications.systemAlerts}
        onChange={(checked) => onSettingChange('notifications.systemAlerts', checked)}
      />

      <ToggleField
        label="Performance Warnings"
        description="Notify when resources are running low"
        checked={notifications.performance}
        onChange={(checked) => onSettingChange('notifications.performance', checked)}
      />
    </SettingsSection>
  )
}