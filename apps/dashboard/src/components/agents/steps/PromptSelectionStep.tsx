import React, { useState } from 'react'
import { AgentConfiguration, SystemPrompt } from '@team-dashboard/types'
import { PromptEditor } from '../../prompts/prompt-editor'

interface PromptSelectionStepProps {
  config: Partial<AgentConfiguration>
  onUpdateConfig: (updates: Partial<AgentConfiguration>) => void
  systemPrompts: SystemPrompt[]
}

export function PromptSelectionStep({ config, onUpdateConfig, systemPrompts }: PromptSelectionStepProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const handlePromptSelect = (promptId: string) => {
    const prompt = systemPrompts.find(p => p.id === promptId)
    if (prompt) {
      setSelectedPrompt(prompt)
      onUpdateConfig({ systemPromptId: promptId })
    }
  }

  const handleCreateNew = () => {
    setShowEditor(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">System Prompt</h3>
        <p className="text-muted-foreground mb-6">
          Choose or create a system prompt that defines your agent's behavior and capabilities.
        </p>
      </div>

      {!showEditor ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-foreground">Available Prompts</h4>
            <button
              onClick={handleCreateNew}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Create New
            </button>
          </div>

          <div className="grid gap-3 max-h-60 overflow-y-auto">
            {systemPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  config.systemPromptId === prompt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-border hover:border-blue-300'
                }`}
                onClick={() => handlePromptSelect(prompt.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-foreground">{prompt.name}</h5>
                    <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                  </div>
                  <input
                    type="radio"
                    checked={config.systemPromptId === prompt.id}
                    onChange={() => handlePromptSelect(prompt.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedPrompt && (
            <div className="border border-border rounded-md p-4 bg-muted/50">
              <h5 className="font-medium text-foreground mb-2">Preview</h5>
              <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{selectedPrompt.content}</pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-foreground">Create System Prompt</h4>
            <button
              onClick={() => setShowEditor(false)}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              Back to Selection
            </button>
          </div>
          
          <PromptEditor
            onSave={(prompt) => {
              onUpdateConfig({ systemPromptId: prompt.id })
              setShowEditor(false)
            }}
            onCancel={() => setShowEditor(false)}
          />
        </div>
      )}
    </div>
  )
}