'use client'

import React from 'react'
import { SettingsSection } from './settings-section'
import { FormField } from './form-field'

interface WebSocketSettingsProps {
  websocket: {
    url: string
    reconnectDelay: number
    maxRetries: number
  }
  onSettingChange: (path: string, value: any) => void
}

export function WebSocketSettings({ websocket, onSettingChange }: WebSocketSettingsProps) {
  return (
    <SettingsSection title="WebSocket Connection">
      <FormField 
        label="WebSocket URL" 
        description="URL for WebSocket connection to agent manager"
        required
      >
        <input
          type="url"
          value={websocket.url}
          onChange={(e) => onSettingChange('websocket.url', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="ws://localhost:3001"
          required
        />
      </FormField>

      <FormField 
        label="Reconnect Delay (ms)" 
        description="Delay between reconnection attempts (1000-30000ms)"
      >
        <input
          type="number"
          min="1000"
          max="30000"
          step="1000"
          value={websocket.reconnectDelay}
          onChange={(e) => onSettingChange('websocket.reconnectDelay', parseInt(e.target.value) || 1000)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </FormField>

      <FormField 
        label="Max Reconnection Attempts" 
        description="Maximum number of reconnection attempts before giving up"
      >
        <input
          type="number"
          min="1"
          max="20"
          value={websocket.maxRetries}
          onChange={(e) => onSettingChange('websocket.maxRetries', parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </FormField>
    </SettingsSection>
  )
}