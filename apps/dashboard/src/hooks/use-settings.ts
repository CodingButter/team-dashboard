'use client'

import { useState, useCallback, useEffect } from 'react'

export interface DashboardSettings {
  theme: string
  autoRefresh: boolean
  refreshInterval: number
  notifications: {
    agentStatus: boolean
    systemAlerts: boolean
    performance: boolean
  }
  websocket: {
    url: string
    reconnectDelay: number
    maxRetries: number
  }
  agents: {
    maxConcurrent: number
    defaultModel: string
    defaultWorkspace: string
  }
}

const DEFAULT_SETTINGS: DashboardSettings = {
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
}

const SETTINGS_STORAGE_KEY = 'dashboard-settings'

export function useSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
        setSettings(parsedSettings)
        setOriginalSettings(parsedSettings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  // Check for changes whenever settings change
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const handleSettingChange = useCallback((path: string, value: any) => {
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
  }, [])

  const saveSettings = useCallback(async () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setOriginalSettings(settings)
      setHasChanges(false)
      
      // Here you could also send settings to a backend API
      // await fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings) })
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }, [settings])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const resetToSaved = useCallback(() => {
    setSettings(originalSettings)
  }, [originalSettings])

  return {
    settings,
    hasChanges,
    handleSettingChange,
    saveSettings,
    resetSettings,
    resetToSaved,
  }
}