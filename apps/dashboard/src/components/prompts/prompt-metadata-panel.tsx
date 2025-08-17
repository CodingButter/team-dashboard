'use client'

import React from 'react'
import type { PromptCategory, SystemPrompt, PromptTemplate } from '@team-dashboard/types'

interface PromptMetadataPanelProps {
  formData: Partial<SystemPrompt>
  onFormDataChange: (updates: Partial<SystemPrompt>) => void
  templates: PromptTemplate[]
  onTemplateSelect: (templateName: string) => void
}

// Default templates for quick start
export const DEFAULT_TEMPLATES: Partial<PromptTemplate>[] = [
  {
    name: 'Frontend Expert',
    description: 'React and frontend development specialist',
    basePrompt: `You are a Senior Frontend Developer with expertise in React, TypeScript, and modern web technologies.

Your capabilities include:
- {framework} development and optimization
- {styling} implementation and responsive design
- Performance optimization and {performance_metrics}
- {accessibility} compliance and best practices

Variable substitutions:
- framework: {{framework}}
- styling: {{styling}}
- performance_metrics: {{performance_metrics}}
- accessibility: {{accessibility}}

Always provide modern, efficient solutions with proper typing and documentation.`,
    variables: [
      { name: 'framework', type: 'string', description: 'Primary framework (React, Vue, Angular)', defaultValue: 'React', required: true },
      { name: 'styling', type: 'string', description: 'Styling approach (CSS, TailwindCSS, styled-components)', defaultValue: 'TailwindCSS', required: true },
      { name: 'performance_metrics', type: 'string', description: 'Performance focus areas', defaultValue: 'Core Web Vitals, bundle size', required: false },
      { name: 'accessibility', type: 'string', description: 'Accessibility standards', defaultValue: 'WCAG 2.1 AA', required: false }
    ],
    category: 'frontend' as PromptCategory,
    tags: ['react', 'frontend', 'typescript']
  },
  {
    name: 'DevOps Specialist',
    description: 'Infrastructure and deployment expert',
    basePrompt: `You are a DevOps Engineer specializing in {{platform}} infrastructure and {{deployment_strategy}} deployments.

Your expertise covers:
- Container orchestration with {{container_tech}}
- CI/CD pipelines using {{ci_cd_tools}}
- Monitoring and alerting with {{monitoring_stack}}
- Security and compliance for {{compliance_standards}}

Focus on:
- Scalable and resilient infrastructure
- Automated deployment processes
- Cost optimization strategies
- Security best practices`,
    variables: [
      { name: 'platform', type: 'string', description: 'Cloud platform', defaultValue: 'AWS', required: true },
      { name: 'deployment_strategy', type: 'string', description: 'Deployment approach', defaultValue: 'blue-green', required: false },
      { name: 'container_tech', type: 'string', description: 'Container technology', defaultValue: 'Docker/Kubernetes', required: true },
      { name: 'ci_cd_tools', type: 'string', description: 'CI/CD toolchain', defaultValue: 'GitHub Actions', required: true },
      { name: 'monitoring_stack', type: 'string', description: 'Monitoring tools', defaultValue: 'Prometheus/Grafana', required: false },
      { name: 'compliance_standards', type: 'string', description: 'Compliance requirements', defaultValue: 'SOC2, GDPR', required: false }
    ],
    category: 'devops' as PromptCategory,
    tags: ['devops', 'infrastructure', 'kubernetes']
  }
]

export function PromptMetadataPanel({
  formData,
  onFormDataChange,
  templates,
  onTemplateSelect
}: PromptMetadataPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = React.useState('')
  const allTemplates = [...DEFAULT_TEMPLATES, ...templates]

  const handleTemplateSelect = (templateName: string) => {
    onTemplateSelect(templateName)
    setSelectedTemplate('')
  }

  return (
    <div className="space-y-4">
      <h4 className="text-md font-medium text-foreground">Prompt Configuration</h4>
      
      {/* Basic Info */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          placeholder="My System Prompt"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          rows={3}
          placeholder="Brief description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Category
        </label>
        <select
          value={formData.category || 'custom'}
          onChange={(e) => onFormDataChange({ category: e.target.value as PromptCategory })}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
        >
          <option value="system">System</option>
          <option value="coding">Coding</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="devops">DevOps</option>
          <option value="testing">Testing</option>
          <option value="documentation">Documentation</option>
          <option value="security">Security</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Version
        </label>
        <input
          type="text"
          value={formData.version || '1.0.0'}
          onChange={(e) => onFormDataChange({ version: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          placeholder="1.0.0"
        />
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Load Template
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
        >
          <option value="">Select a template...</option>
          {allTemplates.map(template => (
            <option key={template.name} value={template.name}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}