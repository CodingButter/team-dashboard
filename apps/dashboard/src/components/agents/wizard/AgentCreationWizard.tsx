/**
 * @package dashboard/components/agents/wizard
 * Refactored agent creation wizard - main coordinator component
 */

'use client';

import React, { useState, useCallback } from 'react';
import { AgentConfiguration } from '@team-dashboard/types';
import { AgentCreationWizardProps, WizardStep } from './types';
import { WIZARD_STEPS } from './constants';
import { BasicInfoStep } from './BasicInfoStep';
import { ModelSelectionStep } from './ModelSelectionStep';
// Additional step imports will be added as they're created

export function AgentCreationWizard({
  onCreateAgent,
  onCancel,
  systemPrompts,
  mcpServers,
  isCreating = false
}: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [config, setConfig] = useState<Partial<AgentConfiguration>>({
    name: '',
    role: '',
    model: 'gpt-4o-mini',
    modelConfig: {
      provider: 'OpenAI',
      temperature: 0.7,
      maxTokens: 2048
    },
    systemPromptId: '',
    mcpServers: [],
    permissions: {
      level: 'moderate',
      toolApproval: 'manual',
      resourceAccess: 'limited'
    },
    enabled: true
  });

  const currentStepIndex = WIZARD_STEPS.findIndex(step => step.key === currentStep);

  const updateConfig = useCallback((updates: Partial<AgentConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].key);
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].key);
    }
  }, [currentStepIndex]);

  const handleCreate = useCallback(() => {
    const finalConfig: AgentConfiguration = {
      id: '',
      name: config.name || '',
      role: config.role || '',
      model: config.model || 'gpt-4o-mini',
      modelConfig: config.modelConfig || {
        provider: 'OpenAI',
        temperature: 0.7,
        maxTokens: 2048
      },
      systemPromptId: config.systemPromptId || '',
      mcpServers: config.mcpServers || [],
      permissions: config.permissions || {
        level: 'moderate',
        toolApproval: 'manual',
        resourceAccess: 'limited'
      },
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    onCreateAgent(finalConfig);
  }, [config, onCreateAgent]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'basic':
        return !!(config.name && config.role);
      case 'model':
        return !!config.model;
      case 'prompt':
        return !!config.systemPromptId;
      case 'mcp':
        return true; // MCP servers are optional
      case 'permissions':
        return true; // Default permissions are always valid
      case 'review':
        return !!(config.name && config.role && config.model);
      default:
        return false;
    }
  }, [currentStep, config]);

  const renderStepContent = () => {
    const stepProps = {
      config,
      updateConfig,
      systemPrompts,
      mcpServers,
      onNext: currentStep === 'review' ? handleCreate : nextStep,
      onPrevious: prevStep,
      canProceed: canProceed(),
      isFirst: currentStepIndex === 0,
      isLast: currentStepIndex === WIZARD_STEPS.length - 1
    };

    switch (currentStep) {
      case 'basic':
        return <BasicInfoStep {...stepProps} />;
      case 'model':
        return <ModelSelectionStep {...stepProps} />;
      // Additional cases will be added as step components are created
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Step component not yet implemented</p>
            <button
              onClick={nextStep}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Skip to Next Step
            </button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index <= currentStepIndex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index + 1}
              </div>
              
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`ml-8 h-px w-16 ${
                  index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white border rounded-lg p-6">
        {renderStepContent()}
      </div>

      {/* Cancel button */}
      <div className="mt-6 text-center">
        <button
          onClick={onCancel}
          disabled={isCreating}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          Cancel wizard
        </button>
      </div>
    </div>
  );
}