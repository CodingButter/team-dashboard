'use client'

import React, { useState, useCallback } from 'react'
import { AgentConfiguration, MCPSystemPrompt as SystemPrompt, MCPServer, AgentModel } from '@team-dashboard/types'
import { PromptEditor } from '../prompts/prompt-editor'

interface AgentCreationWizardProps {
  onCreateAgent: (config: AgentConfiguration) => void
  onCancel: () => void
  systemPrompts: SystemPrompt[]
  mcpServers: MCPServer[]
  isCreating?: boolean
}

type WizardStep = 'basic' | 'model' | 'prompt' | 'mcp' | 'permissions' | 'review'

const AVAILABLE_MODELS: { model: AgentModel; name: string; description: string; provider: string }[] = [
  {
    model: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable OpenAI model with multimodal capabilities',
    provider: 'OpenAI'
  },
  {
    model: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and efficient model for most tasks',
    provider: 'OpenAI'
  },
  {
    model: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Advanced reasoning with large context window',
    provider: 'OpenAI'
  },
  {
    model: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Most powerful Claude model for complex tasks',
    provider: 'Anthropic'
  },
  {
    model: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and speed',
    provider: 'Anthropic'
  },
  {
    model: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient for simple tasks',
    provider: 'Anthropic'
  }
]

export function AgentCreationWizard({
  onCreateAgent,
  onCancel,
  systemPrompts,
  mcpServers,
  isCreating = false
}: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [config, setConfig] = useState<Partial<AgentConfiguration>>({
    id: '',
    name: '',
    model: 'gpt-4o-mini',
    systemPromptId: '',
    mcpServers: [],
    toolPermissions: {},
    maxTokens: 4000,
    temperature: 0.1,
    workingDirectory: '/home/agent',
    environment: {},
    resourceLimits: {
      maxMemory: 1024 * 1024 * 1024, // 1GB
      maxCpu: 100, // 100% of one core
      timeout: 300000 // 5 minutes
    }
  })

  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<SystemPrompt | null>(null)

  const steps: { key: WizardStep; title: string; description: string }[] = [
    { key: 'basic', title: 'Basic Info', description: 'Agent name and description' },
    { key: 'model', title: 'Model Selection', description: 'Choose the AI model' },
    { key: 'prompt', title: 'System Prompt', description: 'Configure agent behavior' },
    { key: 'mcp', title: 'MCP Servers', description: 'Select available tools' },
    { key: 'permissions', title: 'Permissions', description: 'Tool approval settings' },
    { key: 'review', title: 'Review', description: 'Confirm configuration' }
  ]

  const currentStepIndex = steps.findIndex(step => step.key === currentStep)

  const updateConfig = useCallback((updates: Partial<AgentConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key)
    }
  }, [currentStepIndex, steps])

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key)
    }
  }, [currentStepIndex, steps])

  const handleCreate = useCallback(() => {
    const finalConfig: AgentConfiguration = {
      ...config,
      id: config.id || `agent-${Date.now()}`,
      name: config.name || 'Unnamed Agent',
      model: config.model || 'gpt-4o-mini',
      systemPromptId: config.systemPromptId || '',
      mcpServers: config.mcpServers || [],
      toolPermissions: config.toolPermissions || {},
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.1,
      workingDirectory: config.workingDirectory || '/home/agent',
      environment: config.environment || {},
      resourceLimits: config.resourceLimits || {
        maxMemory: 1024 * 1024 * 1024,
        maxCpu: 100,
        timeout: 300000
      }
    } as AgentConfiguration

    onCreateAgent(finalConfig)
  }, [config, onCreateAgent])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={config.name || ''}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  placeholder="Frontend Developer Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Working Directory
                </label>
                <input
                  type="text"
                  value={config.workingDirectory || ''}
                  onChange={(e) => updateConfig({ workingDirectory: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground font-mono"
                  placeholder="/home/agent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={config.maxTokens || 4000}
                    onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    min="100"
                    max="32000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    value={config.temperature || 0.1}
                    onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'model':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">Select AI Model</h3>
            
            <div className="grid gap-4">
              {AVAILABLE_MODELS.map(({ model, name, description, provider }) => (
                <div
                  key={model}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    config.model === model
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border hover:border-blue-400'
                  }`}
                  onClick={() => updateConfig({ model })}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-foreground">{name}</div>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {provider}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">{description}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      config.model === model
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'prompt':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">System Prompt Configuration</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCustomPrompt(false)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    !showCustomPrompt
                      ? 'bg-blue-600 text-white'
                      : 'bg-background border border-border text-foreground'
                  }`}
                >
                  Choose Existing
                </button>
                <button
                  onClick={() => setShowCustomPrompt(true)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    showCustomPrompt
                      ? 'bg-blue-600 text-white'
                      : 'bg-background border border-border text-foreground'
                  }`}
                >
                  Create Custom
                </button>
              </div>

              {!showCustomPrompt ? (
                <div className="space-y-3">
                  {systemPrompts.map(prompt => (
                    <div
                      key={prompt.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        config.systemPromptId === prompt.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-blue-400'
                      }`}
                      onClick={() => updateConfig({ systemPromptId: prompt.id })}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{prompt.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {prompt.description}
                          </div>
                          <div className="flex space-x-2">
                            {prompt.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          config.systemPromptId === prompt.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PromptEditor
                  onSave={(prompt) => {
                    setCustomPrompt(prompt)
                    updateConfig({ systemPromptId: prompt.id })
                    setShowCustomPrompt(false)
                  }}
                  onCancel={() => setShowCustomPrompt(false)}
                />
              )}
            </div>
          </div>
        )

      case 'mcp':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">MCP Server Selection</h3>
            
            <div className="space-y-3">
              {mcpServers.map(server => (
                <div
                  key={server.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-foreground">{server.name}</div>
                        <div className={`w-2 h-2 rounded-full ${
                          server.status === 'connected' ? 'bg-green-500' :
                          server.status === 'connecting' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <span className="text-xs text-muted-foreground">
                          {server.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {server.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {server.capabilities?.tools?.length || 0} tools available
                      </div>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.mcpServers?.includes(server.id) || false}
                        onChange={(e) => {
                          const servers = config.mcpServers || []
                          if (e.target.checked) {
                            updateConfig({ mcpServers: [...servers, server.id] })
                          } else {
                            updateConfig({ 
                              mcpServers: servers.filter(id => id !== server.id) 
                            })
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'permissions':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">Tool Permissions</h3>
            
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Configure how the agent should handle different types of tools.
              </div>

              <div className="grid gap-4">
                {['file_operations', 'network_requests', 'system_commands', 'package_management'].map(category => (
                  <div key={category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground capitalize">
                          {category.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          File read/write, deletion, and directory operations
                        </div>
                      </div>
                      <select
                        value={config.toolPermissions?.[category] || 'require_approval'}
                        onChange={(e) => {
                          updateConfig({
                            toolPermissions: {
                              ...config.toolPermissions,
                              [category]: e.target.value as 'always_allow' | 'always_deny' | 'require_approval'
                            }
                          })
                        }}
                        className="px-3 py-1 bg-background border border-border rounded-md text-foreground"
                      >
                        <option value="always_allow">Always Allow</option>
                        <option value="require_approval">Require Approval</option>
                        <option value="always_deny">Always Deny</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">Review Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Agent Name</div>
                  <div className="text-sm text-muted-foreground">{config.name}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-foreground">Model</div>
                  <div className="text-sm text-muted-foreground">
                    {AVAILABLE_MODELS.find(m => m.model === config.model)?.name}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">System Prompt</div>
                  <div className="text-sm text-muted-foreground">
                    {systemPrompts.find(p => p.id === config.systemPromptId)?.name || 'Custom prompt'}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Working Directory</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {config.workingDirectory}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">MCP Servers</div>
                  <div className="text-sm text-muted-foreground">
                    {config.mcpServers?.length || 0} servers selected
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Max Tokens</div>
                  <div className="text-sm text-muted-foreground">{config.maxTokens}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Temperature</div>
                  <div className="text-sm text-muted-foreground">{config.temperature}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Resource Limits</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((config.resourceLimits?.maxMemory || 0) / 1024 / 1024 / 1024)}GB RAM, 
                    {config.resourceLimits?.maxCpu}% CPU
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'basic':
        return !!config.name
      case 'model':
        return !!config.model
      case 'prompt':
        return !!config.systemPromptId
      default:
        return true
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Create New Agent</h2>
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              index <= currentStepIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1}
            </div>
            <div className="ml-2 text-sm">
              <div className={`font-medium ${
                index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.title}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-px mx-4 ${
                index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 text-white rounded-md transition-colors"
        >
          Previous
        </button>

        <div className="flex space-x-2">
          {currentStep === 'review' ? (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-md transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-md transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}