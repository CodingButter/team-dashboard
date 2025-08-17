'use client'

import React from 'react'

export type WizardStep = 'basic' | 'model' | 'prompt' | 'mcp' | 'permissions' | 'review'

interface WizardNavigationProps {
  currentStep: WizardStep
  onStepChange: (step: WizardStep) => void
  canProgress: boolean
  isCreating: boolean
  onNext: () => void
  onPrevious: () => void
  onCancel: () => void
  onFinish: () => void
}

export const WIZARD_STEPS: { key: WizardStep; title: string; description: string }[] = [
  { key: 'basic', title: 'Basic Info', description: 'Agent name and description' },
  { key: 'model', title: 'Model Selection', description: 'Choose the AI model' },
  { key: 'prompt', title: 'System Prompt', description: 'Configure agent behavior' },
  { key: 'mcp', title: 'MCP Servers', description: 'Select available tools' },
  { key: 'permissions', title: 'Permissions', description: 'Tool approval settings' },
  { key: 'review', title: 'Review', description: 'Confirm configuration' }
]

export function WizardNavigation({
  currentStep,
  onStepChange,
  canProgress,
  isCreating,
  onNext,
  onPrevious,
  onCancel,
  onFinish
}: WizardNavigationProps) {
  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.key === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

  return (
    <>
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        {WIZARD_STEPS.map((step, index) => (
          <React.Fragment key={step.key}>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-colors ${
                index <= currentStepIndex
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}
              onClick={() => index <= currentStepIndex && onStepChange(step.key)}
            >
              {index + 1}
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={`h-1 w-16 mx-2 ${
                  index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">{WIZARD_STEPS[currentStepIndex].title}</h2>
        <p className="text-muted-foreground mt-2">{WIZARD_STEPS[currentStepIndex].description}</p>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-border">
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
          {!isFirstStep && (
            <button
              onClick={onPrevious}
              className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Previous
            </button>
          )}
        </div>

        <div>
          {isLastStep ? (
            <button
              onClick={onFinish}
              disabled={!canProgress || isCreating}
              className="px-6 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canProgress}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </>
  )
}