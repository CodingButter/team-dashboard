/**
 * @package dashboard/components/agents/wizard
 * AI model selection step for agent creation wizard
 */

import React from 'react';
import { StepComponentProps } from './types';
import { AVAILABLE_MODELS } from './constants';

export function ModelSelectionStep({
  config,
  updateConfig,
  onNext,
  onPrevious,
  canProceed,
  isFirst,
  isLast
}: StepComponentProps) {
  const handleModelSelect = (modelId: string) => {
    const selectedModel = AVAILABLE_MODELS.find(m => m.model === modelId);
    if (selectedModel) {
      updateConfig({
        model: selectedModel.model,
        modelConfig: {
          provider: selectedModel.provider,
          temperature: 0.7,
          maxTokens: 2048
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Choose AI Model
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the AI model that best fits your agent's needs and use case.
        </p>
      </div>

      <div className="grid gap-4">
        {AVAILABLE_MODELS.map((model) => (
          <div
            key={model.model}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              config.model === model.model
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleModelSelect(model.model)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    config.model === model.model
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {config.model === model.model && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900">{model.name}</h4>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {model.provider}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2 ml-7">
                  {model.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {config.model && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Model Configuration</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.modelConfig?.temperature || 0.7}
                onChange={(e) => updateConfig({
                  modelConfig: {
                    ...config.modelConfig,
                    temperature: parseFloat(e.target.value)
                  }
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused (0)</span>
                <span className="font-medium">
                  {config.modelConfig?.temperature || 0.7}
                </span>
                <span>Creative (1)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <select
                value={config.modelConfig?.maxTokens || 2048}
                onChange={(e) => updateConfig({
                  modelConfig: {
                    ...config.modelConfig,
                    maxTokens: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1024}>1,024 tokens</option>
                <option value={2048}>2,048 tokens</option>
                <option value={4096}>4,096 tokens</option>
                <option value={8192}>8,192 tokens</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={onPrevious}
          disabled={isFirst}
          className={`px-6 py-2 rounded-md font-medium ${
            isFirst
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          Previous
        </button>
        
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-md font-medium ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLast ? 'Create Agent' : 'Next Step'}
        </button>
      </div>
    </div>
  );
}