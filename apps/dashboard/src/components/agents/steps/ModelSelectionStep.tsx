import React from 'react'
import { AgentConfiguration } from '@team-dashboard/types'
import { AVAILABLE_MODELS } from '../constants/available-models'

interface ModelSelectionStepProps {
  config: Partial<AgentConfiguration>
  onUpdateConfig: (updates: Partial<AgentConfiguration>) => void
}

export function ModelSelectionStep({ config, onUpdateConfig }: ModelSelectionStepProps) {
  const groupedModels = AVAILABLE_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = []
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, typeof AVAILABLE_MODELS>)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Model Selection</h3>
        <p className="text-muted-foreground mb-6">
          Choose the AI model that best fits your agent's requirements.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedModels).map(([provider, models]) => (
          <div key={provider}>
            <h4 className="text-md font-medium text-foreground mb-3">{provider}</h4>
            <div className="grid gap-3">
              {models.map((model) => (
                <div
                  key={model.model}
                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                    config.model === model.model
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-blue-300'
                  }`}
                  onClick={() => onUpdateConfig({ model: model.model })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{model.name}</h5>
                      <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                    </div>
                    <div className="ml-3">
                      <input
                        type="radio"
                        checked={config.model === model.model}
                        onChange={() => onUpdateConfig({ model: model.model })}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}