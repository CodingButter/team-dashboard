'use client'

/**
 * @package dashboard/components/agents
 * Agent Creation Wizard - Refactored for maintainability
 * 
 * Original 583+ lines broken down into:
 * - wizard/types.ts - Type definitions and wizard steps
 * - wizard/models.ts - Available models and permissions  
 * - wizard/useWizardState.ts - State management hook
 * - Individual step components (to be created)
 */

import React, { useState, useCallback } from 'react'
import type { AgentConfiguration, SystemPrompt, MCPServer } from '@team-dashboard/types'
import { PromptEditor } from '../prompts/prompt-editor.js'

// Extracted utilities
import { useWizardState } from './wizard/useWizardState.js'
import { AVAILABLE_MODELS, DEFAULT_PERMISSIONS, PERMISSION_DESCRIPTIONS } from './wizard/models.js'
import type { WizardStep, AgentPermissions } from './wizard/types.js'

interface AgentCreationWizardProps {
  onCreateAgent: (config: AgentConfiguration) => void
  onCancel: () => void
  systemPrompts: SystemPrompt[]
  mcpServers: MCPServer[]
  isCreating?: boolean
}

export function AgentCreationWizard({
  onCreateAgent,
  onCancel,
  systemPrompts,
  mcpServers,
  isCreating = false
}: AgentCreationWizardProps) {
  // Wizard state
  const wizard = useWizardState()
  
  // Form data
  const [agentConfig, setAgentConfig] = useState<Partial<AgentConfiguration>>({
    name: '',
    description: '',
    model: 'gpt-4o-mini',
    systemPrompt: null,
    mcpServers: [],
    permissions: { ...DEFAULT_PERMISSIONS }
  })

  const updateConfig = useCallback((updates: Partial<AgentConfiguration>) => {
    setAgentConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const isStepValid = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 'basic':
        return !!(agentConfig.name && agentConfig.description)
      case 'model':
        return !!agentConfig.model
      case 'prompt':
        return !!agentConfig.systemPrompt
      case 'mcp':
      case 'permissions':
        return true
      case 'review':
        return !!(agentConfig.name && agentConfig.model && agentConfig.systemPrompt)
      default:
        return false
    }
  }, [agentConfig])

  const handleCreate = useCallback(() => {
    if (isStepValid('review')) {
      onCreateAgent(agentConfig as AgentConfiguration)
    }
  }, [agentConfig, isStepValid, onCreateAgent])

  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Agent Name</label>
              <input
                type="text"
                value={agentConfig.name || ''}
                onChange={(e) => updateConfig({ name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Enter agent name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <textarea
                value={agentConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                rows={3}
                placeholder="Describe what this agent does..."
              />
            </div>
          </div>
        )

      case 'model':
        return (
          <div className="space-y-4">
            {AVAILABLE_MODELS.map((model) => (
              <div
                key={model.model}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  agentConfig.model === model.model
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-border hover:border-gray-300'
                }`}
                onClick={() => updateConfig({ model: model.model })}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{model.name}</h3>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-secondary px-2 py-1 rounded">{model.provider}</span>
                      {model.pricing && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          model.pricing === 'low' ? 'bg-green-100 text-green-800' :
                          model.pricing === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {model.pricing} cost
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="model"
                    checked={agentConfig.model === model.model}
                    onChange={() => updateConfig({ model: model.model })}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            ))}
          </div>
        )

      case 'prompt':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">System Prompt</label>
              <select
                value={agentConfig.systemPrompt?.id || ''}
                onChange={(e) => {
                  const prompt = systemPrompts.find(p => p.id === e.target.value)
                  updateConfig({ systemPrompt: prompt || null })
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              >
                <option value="">Select a system prompt...</option>
                {systemPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name} - {prompt.description}
                  </option>
                ))}
              </select>
            </div>
            {agentConfig.systemPrompt && (
              <div className="mt-4 p-4 bg-secondary rounded-md">
                <h4 className="font-medium text-foreground mb-2">Preview</h4>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-auto max-h-40">
                  {agentConfig.systemPrompt.content.substring(0, 300)}
                  {agentConfig.systemPrompt.content.length > 300 && '...'}
                </pre>
              </div>
            )}
          </div>
        )

      case 'mcp':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-2">Available MCP Servers</h3>
              <div className="space-y-2">
                {mcpServers.map((server) => (
                  <label key={server.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={agentConfig.mcpServers?.some(s => s.id === server.id) || false}
                      onChange={(e) => {
                        const servers = agentConfig.mcpServers || []
                        if (e.target.checked) {
                          updateConfig({ mcpServers: [...servers, server] })
                        } else {
                          updateConfig({ mcpServers: servers.filter(s => s.id !== server.id) })
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <div>
                      <span className="font-medium text-foreground">{server.name}</span>
                      <p className="text-sm text-muted-foreground">{server.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 'permissions':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-foreground mb-4">Security Permissions</h3>
            {Object.entries(PERMISSION_DESCRIPTIONS).map(([key, description]) => (
              <label key={key} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={(agentConfig.permissions as any)?.[key] || false}
                  onChange={(e) => {
                    updateConfig({
                      permissions: {
                        ...agentConfig.permissions,
                        [key]: e.target.checked
                      }
                    })
                  }}
                  className="h-4 w-4 mt-1"
                />
                <div>
                  <span className="font-medium text-foreground capitalize">{key}</span>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </label>
            ))}
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="font-medium text-foreground">Review Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-foreground">{agentConfig.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Model</label>
                <p className="text-foreground">{AVAILABLE_MODELS.find(m => m.model === agentConfig.model)?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">System Prompt</label>
                <p className="text-foreground">{agentConfig.systemPrompt?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">MCP Servers</label>
                <p className="text-foreground">{agentConfig.mcpServers?.length || 0} selected</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-foreground">Create Agent</h2>
          <span className="text-sm text-muted-foreground">
            Step {wizard.currentStepIndex + 1} of {wizard.totalSteps}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((wizard.currentStepIndex + 1) / wizard.totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-between mb-8">
        {wizard.steps.map((step, index) => (
          <div
            key={step.key}
            className={`flex items-center ${index < wizard.steps.length - 1 ? 'flex-1' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                wizard.getStepProgress(step.key) === 'completed'
                  ? 'bg-green-600 text-white'
                  : wizard.getStepProgress(step.key) === 'current'
                  ? 'bg-blue-600 text-white'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span className={`ml-2 text-sm ${
              wizard.getStepProgress(step.key) === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}>
              {step.title}
            </span>
            {index < wizard.steps.length - 1 && (
              <div className="flex-1 h-px bg-border ml-4" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={wizard.prevStep}
            disabled={!wizard.canGoPrev}
            className={`px-4 py-2 rounded-md border ${
              wizard.canGoPrev
                ? 'border-border text-foreground hover:bg-secondary'
                : 'border-border text-muted-foreground cursor-not-allowed'
            }`}
          >
            Previous
          </button>
          {wizard.currentStep === 'review' ? (
            <button
              onClick={handleCreate}
              disabled={!isStepValid('review') || isCreating}
              className={`px-6 py-2 rounded-md ${
                isStepValid('review') && !isCreating
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </button>
          ) : (
            <button
              onClick={wizard.nextStep}
              disabled={!wizard.canGoNext || !isStepValid(wizard.currentStep)}
              className={`px-4 py-2 rounded-md ${
                wizard.canGoNext && isStepValid(wizard.currentStep)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}