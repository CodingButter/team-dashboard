'use client'

import React from 'react'

interface PromptPreviewPanelProps {
  preview: string
  isVisible: boolean
}

export function PromptPreviewPanel({
  preview,
  isVisible
}: PromptPreviewPanelProps) {
  if (!isVisible) return null

  return (
    <div className="border border-border rounded-md p-4">
      <h5 className="font-medium text-foreground mb-3">Live Preview</h5>
      <div className="bg-background border border-border rounded p-3 text-sm max-h-80 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-foreground">{preview}</pre>
      </div>
    </div>
  )
}