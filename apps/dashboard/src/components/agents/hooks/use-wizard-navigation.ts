import { useState, useCallback } from 'react'

export type WizardStep = 'basic' | 'model' | 'prompt' | 'mcp' | 'permissions' | 'review'

export const WIZARD_STEPS: { key: WizardStep; title: string; description: string }[] = [
  { key: 'basic', title: 'Basic Info', description: 'Agent name and description' },
  { key: 'model', title: 'Model Selection', description: 'Choose the AI model' },
  { key: 'prompt', title: 'System Prompt', description: 'Define agent behavior' },
  { key: 'mcp', title: 'MCP Servers', description: 'Select available tools' },
  { key: 'permissions', title: 'Permissions', description: 'Configure access rights' },
  { key: 'review', title: 'Review', description: 'Confirm configuration' }
]

export function useWizardNavigation(initialStep: WizardStep = 'basic') {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep)
  
  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.key === currentStep)

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].key)
    }
  }, [currentStepIndex])

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].key)
    }
  }, [currentStepIndex])

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step)
  }, [])

  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1
  const canGoPrev = currentStepIndex > 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

  return {
    currentStep,
    currentStepIndex,
    steps: WIZARD_STEPS,
    nextStep,
    prevStep,
    goToStep,
    canGoNext,
    canGoPrev,
    isLastStep
  }
}