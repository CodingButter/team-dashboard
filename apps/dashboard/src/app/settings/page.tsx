'use client'

import React from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { GeneralSettings } from '../../components/settings/general-settings'
import { NotificationSettings } from '../../components/settings/notification-settings'
import { WebSocketSettings } from '../../components/settings/websocket-settings'
import { AgentSettings } from '../../components/settings/agent-settings'
import { SettingsActions } from '../../components/settings/settings-actions'
import { useSettings } from '../../hooks/use-settings'

export default function SettingsPage() {
  const {
    settings,
    hasChanges,
    handleSettingChange,
    saveSettings,
    resetSettings,
  } = useSettings()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure your dashboard preferences and system settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GeneralSettings 
            settings={settings} 
            onSettingChange={handleSettingChange} 
          />
          
          <NotificationSettings 
            notifications={settings.notifications} 
            onSettingChange={handleSettingChange} 
          />
          
          <WebSocketSettings 
            websocket={settings.websocket} 
            onSettingChange={handleSettingChange} 
          />
          
          <AgentSettings 
            agents={settings.agents} 
            onSettingChange={handleSettingChange} 
          />
        </div>

        <SettingsActions 
          onSave={saveSettings}
          onReset={resetSettings}
          hasChanges={hasChanges}
        />
      </div>
    </DashboardLayout>
  )
}