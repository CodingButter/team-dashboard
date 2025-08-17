'use client'

import React, { useState, useCallback } from 'react'
import { AgentConfiguration, SystemPrompt, MCPServer } from '@team-dashboard/types'
import { useWizardNavigation } from './hooks/use-wizard-navigation'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { ModelSelectionStep } from './steps/ModelSelectionStep'
import { PromptSelectionStep } from './steps/PromptSelectionStep'
import { McpServerStep } from './steps/McpServerStep'
import { PermissionsStep } from './steps/PermissionsStep'
import { ReviewStep } from './steps/ReviewStep'

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
  const [config, setConfig] = useState<Partial<AgentConfiguration>>({
    id: '',
    name: '',
    description: '',
    model: undefined,
    systemPromptId: '',
    mcpServers: [],
    permissions: {},
    maxTokens: 1000,
    temperature: 0.7,
    status: 'inactive',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  const {
    currentStep,
    currentStepIndex,
    steps,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    isLastStep
  } = useWizardNavigation()

  const updateConfig = useCallback((updates: Partial<AgentConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const handleCreate = useCallback(() => {
    const timestamp = Date.now()
    const finalConfig: AgentConfiguration = {
      ...config,
      id: config.id || `agent-${timestamp}`,
      name: config.name || 'Unnamed Agent',
      description: config.description || '',
      model: config.model!,
      systemPromptId: config.systemPromptId!,
      mcpServers: config.mcpServers || [],
      permissions: config.permissions || {},
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.7,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    onCreateAgent(finalConfig)
  }, [config, onCreateAgent])

  const canProceed = useCallback(() => {
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
  }, [currentStep, config])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return <BasicInfoStep config={config} onUpdateConfig={updateConfig} />
      case 'model':
        return <ModelSelectionStep config={config} onUpdateConfig={updateConfig} />
      case 'prompt':
        return <PromptSelectionStep config={config} onUpdateConfig={updateConfig} systemPrompts={systemPrompts} />
      case 'mcp':
        return <McpServerStep config={config} onUpdateConfig={updateConfig} mcpServers={mcpServers} />
      case 'permissions':
        return <PermissionsStep config={config} onUpdateConfig={updateConfig} />
      case 'review':
        return <ReviewStep config={config} systemPrompts={systemPrompts} mcpServers={mcpServers} isCreating={isCreating} />
      default:
        return null
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Create New Agent</h2>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              index <= currentStepIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1}
            </div>
            <div className="ml-2 hidden sm:block">
              <div className={`text-sm font-medium ${
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
      <div className="flex justify-between pt-6 border-t border-border">
        <button
          onClick={prevStep}
          disabled={!canGoPrev}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 text-white rounded-md transition-colors"
        >
          Previous
        </button>
        
        <div className="space-x-2">
          {isLastStep ? (
            <button
              onClick={handleCreate}
              disabled={!canProceed() || isCreating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-md transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed() || !canGoNext}
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