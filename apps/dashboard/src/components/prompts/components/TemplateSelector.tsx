import React from 'react'
import type { PromptTemplate } from '@team-dashboard/types'
import { DEFAULT_TEMPLATES } from '../templates/default-templates'

interface TemplateSelectorProps {
  templates: PromptTemplate[]
  selectedTemplate: string
  onTemplateSelect: (templateName: string) => void
}

export function TemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect
}: TemplateSelectorProps) {
  const allTemplates = [...DEFAULT_TEMPLATES, ...templates]

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        Load Template
      </label>
      <select
        value={selectedTemplate}
        onChange={(e) => onTemplateSelect(e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
      >
        <option value="">Select a template...</option>
        {allTemplates.map(template => (
          <option key={template.name} value={template.name}>
            {template.name}
          </option>
        ))}
      </select>
      
      {selectedTemplate && (
        <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
          {allTemplates.find(t => t.name === selectedTemplate)?.description}
        </div>
      )}
    </div>
  )
}