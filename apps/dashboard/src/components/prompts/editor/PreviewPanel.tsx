/**
 * @package dashboard/components/prompts/editor
 * Preview panel for prompt editor
 */

import React from 'react'

interface PreviewPanelProps {
  content: string
  title?: string
}

export function PreviewPanel({ content, title = 'Live Preview' }: PreviewPanelProps) {
  return (
    <div className="border border-border rounded-md p-4">
      <h5 className="font-medium text-foreground mb-3">{title}</h5>
      <div className="bg-background border border-border rounded p-3 text-sm max-h-80 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-foreground">{content}</pre>
      </div>
    </div>
  )
}