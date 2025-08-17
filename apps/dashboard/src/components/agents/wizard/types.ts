/**
 * @package dashboard/components/agents/wizard
 * Wizard-specific types and interfaces
 */

export type WizardStep = 'basic' | 'model' | 'prompt' | 'mcp' | 'permissions' | 'review'

export interface WizardStepConfig {
  key: WizardStep
  title: string
  description: string
  isValid?: boolean
}

export interface WizardState {
  currentStep: WizardStep
  currentStepIndex: number
  totalSteps: number
  canGoNext: boolean
  canGoPrev: boolean
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    key: 'basic',
    title: 'Basic Information',
    description: 'Set up agent name and description'
  },
  {
    key: 'model',
    title: 'Model Selection',
    description: 'Choose the AI model to use'
  },
  {
    key: 'prompt',
    title: 'System Prompt',
    description: 'Configure the agent behavior'
  },
  {
    key: 'mcp',
    title: 'MCP Integration',
    description: 'Connect to external services'
  },
  {
    key: 'permissions',
    title: 'Permissions',
    description: 'Set security permissions'
  },
  {
    key: 'review',
    title: 'Review & Create',
    description: 'Review configuration and create agent'
  }
]