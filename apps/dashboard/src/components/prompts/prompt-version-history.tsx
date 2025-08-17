'use client'

import React from 'react'
import type { PromptVariable } from '@team-dashboard/types'

export interface PromptVersion {
  id: string
  content: string
  variables: PromptVariable[]
  timestamp: Date
  message?: string
}

interface PromptVersionHistoryProps {
  versions: PromptVersion[]
  isVisible: boolean
  onRevertToVersion: (version: PromptVersion) => void
  onShowDiff: (version: PromptVersion) => void
}

export function PromptVersionHistory({
  versions,
  isVisible,
  onRevertToVersion,
  onShowDiff
}: PromptVersionHistoryProps) {
  if (!isVisible) return null

  return (
    <div className="border border-border rounded-md p-4">
      <h5 className="font-medium text-foreground mb-3">Version History</h5>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {versions.map((version, index) => (
          <div key={version.id} className="border border-border rounded p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{version.id}</span>
              <span className="text-muted-foreground text-xs">
                {version.timestamp.toLocaleString()}
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">{version.message}</p>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => onRevertToVersion(version)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              >
                Revert
              </button>
              <button
                onClick={() => onShowDiff(version)}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors"
              >
                Diff
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}