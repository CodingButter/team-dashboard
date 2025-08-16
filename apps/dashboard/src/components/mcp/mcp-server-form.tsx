'use client'

import React, { useState, useEffect } from 'react'
import { McpServer, McpServerTemplate, MCP_SERVER_TEMPLATES } from '@team-dashboard/types'

interface McpServerFormProps {
  server?: McpServer
  onSave: (serverData: Partial<McpServer>) => void
  onCancel: () => void
  isLoading?: boolean
}

export function McpServerForm({ server, onSave, onCancel, isLoading }: McpServerFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<McpServerTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: server?.name || '',
    description: server?.description || '',
    transport: server?.transport || 'stdio' as 'stdio' | 'http+sse',
    enabled: server?.enabled ?? true,
    autoConnect: server?.autoConnect ?? false,
    command: (server as any)?.command || '',
    args: (server as any)?.args?.join(' ') || '',
    baseUrl: (server as any)?.baseUrl || '',
    environment: server?.environment || [],
    tags: server?.tags?.join(', ') || ''
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (selectedTemplate) {
      const defaultConfig = selectedTemplate.defaultConfig as any
      setFormData(prev => ({
        ...prev,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        transport: selectedTemplate.transport,
        command: defaultConfig.command || '',
        args: defaultConfig.args?.join(' ') || '',
        baseUrl: defaultConfig.baseUrl || '',
        environment: [
          ...selectedTemplate.requiredEnvironment.map(env => ({
            key: env.key,
            value: '',
            encrypted: env.encrypted,
            required: env.required
          })),
          ...selectedTemplate.optionalEnvironment.map(env => ({
            key: env.key,
            value: '',
            encrypted: env.encrypted,
            required: env.required
          }))
        ],
        tags: selectedTemplate.tags.join(', ')
      }))
    }
  }, [selectedTemplate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const serverData: Partial<McpServer> = {
      name: formData.name,
      description: formData.description,
      transport: formData.transport,
      enabled: formData.enabled,
      autoConnect: formData.autoConnect,
      environment: formData.environment,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    }

    if (formData.transport === 'stdio') {
      (serverData as any).command = formData.command
      ;(serverData as any).args = formData.args.split(' ').filter(Boolean)
    } else {
      (serverData as any).baseUrl = formData.baseUrl
    }

    onSave(serverData)
  }

  const addEnvironmentVariable = () => {
    setFormData(prev => ({
      ...prev,
      environment: [...prev.environment, { key: '', value: '', encrypted: false, required: false }]
    }))
  }

  const removeEnvironmentVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      environment: prev.environment.filter((_, i) => i !== index)
    }))
  }

  const updateEnvironmentVariable = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      environment: prev.environment.map((env, i) => 
        i === index ? { ...env, [field]: value } : env
      )
    }))
  }

  return (
    <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">
        {server ? 'Edit MCP Server' : 'Add MCP Server'}
      </h2>

      {/* Template Selection */}
      {!server && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Choose Template (Optional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {MCP_SERVER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className={`p-3 text-left border rounded-md transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-border hover:border-blue-300 hover:bg-muted'
                }`}
              >
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
                <div className="flex gap-1 mt-1">
                  {template.verified && (
                    <span className="text-xs px-1 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                      Verified
                    </span>
                  )}
                  <span className="text-xs px-1 py-0.5 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 rounded">
                    {template.transport.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="My MCP Server"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Transport *
            </label>
            <select
              required
              value={formData.transport}
              onChange={(e) => setFormData(prev => ({ ...prev, transport: e.target.value as 'stdio' | 'http+sse' }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="stdio">STDIO</option>
              <option value="http+sse">HTTP+SSE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            rows={2}
            placeholder="Server description..."
          />
        </div>

        {/* Transport-specific Configuration */}
        {formData.transport === 'stdio' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Command *
              </label>
              <input
                type="text"
                required
                value={formData.command}
                onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="npx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Arguments
              </label>
              <input
                type="text"
                value={formData.args}
                onChange={(e) => setFormData(prev => ({ ...prev, args: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="-y @modelcontextprotocol/server-github"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Base URL *
            </label>
            <input
              type="url"
              required
              value={formData.baseUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="https://api.example.com"
            />
          </div>
        )}

        {/* Environment Variables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">
              Environment Variables
            </label>
            <button
              type="button"
              onClick={addEnvironmentVariable}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              + Add Variable
            </button>
          </div>
          <div className="space-y-2">
            {formData.environment.map((env, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={env.key}
                  onChange={(e) => updateEnvironmentVariable(index, 'key', e.target.value)}
                  placeholder="Variable name"
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
                <input
                  type={env.encrypted ? 'password' : 'text'}
                  value={env.value}
                  onChange={(e) => updateEnvironmentVariable(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={env.encrypted}
                    onChange={(e) => updateEnvironmentVariable(index, 'encrypted', e.target.checked)}
                    className="mr-1"
                  />
                  Encrypted
                </label>
                <button
                  type="button"
                  onClick={() => removeEnvironmentVariable(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              className="mr-2"
            />
            Enabled
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={formData.autoConnect}
              onChange={(e) => setFormData(prev => ({ ...prev, autoConnect: e.target.checked }))}
              className="mr-2"
            />
            Auto-connect on startup
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tags
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            placeholder="github, development, api (comma-separated)"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : (server ? 'Update Server' : 'Create Server')}
          </button>
        </div>
      </form>
    </div>
  )
}