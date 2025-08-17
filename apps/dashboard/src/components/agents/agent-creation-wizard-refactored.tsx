'use client'

import React, { useState, useCallback } from 'react'
import { AgentConfiguration, SystemPrompt, MCPServer } from '@team-dashboard/types'

// Wizard components
import { WizardNavigation, type WizardStep, WIZARD_STEPS } from './wizard/wizard-navigation'
import { WizardBasicStep } from './wizard/wizard-basic-step'
import { WizardModelStep } from './wizard/wizard-model-step'

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

  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.key === currentStep)

  const updateConfig = useCallback((updates: Partial<AgentConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const nextStep = useCallback(() => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].key)
    }
  }, [currentStepIndex])

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].key)
    }
  }, [currentStepIndex])

  const canProgress = useCallback(() => {
    switch (currentStep) {
      case 'basic':
        return !!(config.name && config.name.trim())
      case 'model':
        return !!(config.model)
      case 'prompt':
        return true // Optional step
      case 'mcp':
        return true // Optional step
      case 'permissions':
        return true // Optional step
      case 'review':
        return !!(config.name && config.model)
      default:
        return false
    }
  }, [currentStep, config])

  const handleFinish = useCallback(() => {
    if (canProgress()) {
      const finalConfig: AgentConfiguration = {
        id: config.id || `agent-${Date.now()}`,
        name: config.name || 'Unnamed Agent',
        description: config.description || '',
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
        },
        status: 'idle',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      onCreateAgent(finalConfig)
    }
  }, [config, canProgress, onCreateAgent])

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return <WizardBasicStep config={config} onConfigUpdate={updateConfig} />
      case 'model':
        return <WizardModelStep config={config} onConfigUpdate={updateConfig} />
      case 'prompt':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">System Prompt</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose a system prompt or create a custom one.
              </p>
            </div>
            <div className="text-center py-12 text-muted-foreground">
              Prompt selection UI will be implemented here
            </div>
          </div>
        )
      case 'mcp':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">MCP Servers</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select which MCP servers your agent can access.
              </p>
            </div>
            <div className="text-center py-12 text-muted-foreground">
              MCP server selection UI will be implemented here
            </div>
          </div>
        )
      case 'permissions':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Tool Permissions</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure which tools require approval before execution.
              </p>
            </div>
            <div className="text-center py-12 text-muted-foreground">
              Permission configuration UI will be implemented here
            </div>
          </div>
        )
      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Review Configuration</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Review your agent configuration before creating.
              </p>
            </div>
            <div className="bg-background border border-border rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-foreground">{config.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Model</label>
                  <p className="text-foreground">{config.model || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Tokens</label>
                  <p className="text-foreground">{config.maxTokens || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Temperature</label>
                  <p className="text-foreground">{config.temperature || 'Not set'}</p>
                </div>
              </div>
              {config.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground">{config.description}</p>
                </div>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-8 max-w-4xl mx-auto">
      <WizardNavigation
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        canProgress={canProgress()}
        isCreating={isCreating}
        onNext={nextStep}
        onPrevious={previousStep}
        onCancel={onCancel}
        onFinish={handleFinish}
      />

      <div className="mt-8">
        {renderCurrentStep()}
      </div>
    </div>
  )
}