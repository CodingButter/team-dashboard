'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    autoRefresh: true,
    refreshInterval: 5,
    notifications: {
      agentStatus: true,
      systemAlerts: true,
      performance: false,
    },
    websocket: {
      url: 'ws://localhost:3001',
      reconnectDelay: 2000,
      maxRetries: 5,
    },
    agents: {
      maxConcurrent: 10,
      defaultModel: 'claude-3-sonnet',
      defaultWorkspace: '/home/user/projects/',
    },
  })

  const handleSettingChange = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
  }

  const handleSaveSettings = () => {
    console.log('Saving settings:', settings)
    // TODO: Implement settings save
  }

  const handleResetSettings = () => {
    // Reset to defaults
    setSettings({
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 5,
      notifications: {
        agentStatus: true,
        systemAlerts: true,
        performance: false,
      },
      websocket: {
        url: 'ws://localhost:3001',
        reconnectDelay: 2000,
        maxRetries: 5,
      },
      agents: {
        maxConcurrent: 10,
        defaultModel: 'claude-3-sonnet',
        defaultWorkspace: '/home/user/projects/',
      },
    })
  }

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
          {/* General Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">General</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Auto Refresh
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Automatically refresh data
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                  className="rounded"
                />
              </div>

              {settings.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.refreshInterval}
                    onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Agent Status Changes
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Notify when agents start, stop, or crash
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.agentStatus}
                  onChange={(e) => handleSettingChange('notifications.agentStatus', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    System Alerts
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Notify about system issues and warnings
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.systemAlerts}
                  onChange={(e) => handleSettingChange('notifications.systemAlerts', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Performance Warnings
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Notify when resources are running low
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.performance}
                  onChange={(e) => handleSettingChange('notifications.performance', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
          </div>

          {/* WebSocket Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">WebSocket Connection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  WebSocket URL
                </label>
                <input
                  type="text"
                  value={settings.websocket.url}
                  onChange={(e) => handleSettingChange('websocket.url', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="ws://localhost:3001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reconnect Delay (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="30000"
                  value={settings.websocket.reconnectDelay}
                  onChange={(e) => handleSettingChange('websocket.reconnectDelay', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Max Reconnection Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.websocket.maxRetries}
                  onChange={(e) => handleSettingChange('websocket.maxRetries', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Agent Defaults</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Max Concurrent Agents
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.agents.maxConcurrent}
                  onChange={(e) => handleSettingChange('agents.maxConcurrent', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Model
                </label>
                <select
                  value={settings.agents.defaultModel}
                  onChange={(e) => handleSettingChange('agents.defaultModel', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Workspace
                </label>
                <input
                  type="text"
                  value={settings.agents.defaultWorkspace}
                  onChange={(e) => handleSettingChange('agents.defaultWorkspace', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  placeholder="/home/user/projects/"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleResetSettings}
            className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-accent transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}