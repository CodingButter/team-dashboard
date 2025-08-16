'use client'

import React, { useState } from 'react'

interface SettingsActionsProps {
  onSave: () => Promise<void> | void
  onReset: () => void
  hasChanges?: boolean
}

export function SettingsActions({ onSave, onReset, hasChanges = false }: SettingsActionsProps) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex justify-end space-x-4 pt-6 border-t border-border">
      <button
        onClick={onReset}
        disabled={saving}
        className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Reset to Defaults
      </button>
      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {saving && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
        )}
        <span>{saving ? 'Saving...' : 'Save Settings'}</span>
      </button>
    </div>
  )
}