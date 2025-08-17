/**
 * @package dashboard/components/agents/wizard
 * Wizard state management hook
 */

import { useState, useCallback, useMemo } from 'react'
import type { WizardStep, WizardState } from './types.js'
import { WIZARD_STEPS } from './types.js'

export function useWizardState(initialStep: WizardStep = 'basic') {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep)

  const currentStepIndex = useMemo(() => 
    WIZARD_STEPS.findIndex(step => step.key === currentStep), 
    [currentStep]
  )

  const wizardState: WizardState = useMemo(() => ({
    currentStep,
    currentStepIndex,
    totalSteps: WIZARD_STEPS.length,
    canGoNext: currentStepIndex < WIZARD_STEPS.length - 1,
    canGoPrev: currentStepIndex > 0
  }), [currentStep, currentStepIndex])

  const nextStep = useCallback(() => {
    if (wizardState.canGoNext) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].key)
    }
  }, [currentStepIndex, wizardState.canGoNext])

  const prevStep = useCallback(() => {
    if (wizardState.canGoPrev) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].key)
    }
  }, [currentStepIndex, wizardState.canGoPrev])

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step)
  }, [])

  const getStepProgress = useCallback((step: WizardStep) => {
    const stepIndex = WIZARD_STEPS.findIndex(s => s.key === step)
    
    if (stepIndex < currentStepIndex) return 'completed'
    if (stepIndex === currentStepIndex) return 'current'
    return 'pending'
  }, [currentStepIndex])

  return {
    ...wizardState,
    nextStep,
    prevStep,
    goToStep,
    getStepProgress,
    steps: WIZARD_STEPS
  }
}