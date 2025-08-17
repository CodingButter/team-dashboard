import React, { useCallback } from 'react'
import type { PromptVariable } from '@team-dashboard/types'

interface VariableEditorProps {
  variables: PromptVariable[]
  onVariableChange: (index: number, field: keyof PromptVariable, value: any) => void
  onAddVariable: () => void
  onRemoveVariable: (index: number) => void
}

export function VariableEditor({
  variables,
  onVariableChange,
  onAddVariable,
  onRemoveVariable
}: VariableEditorProps) {
  return (
    <div className="border border-border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-medium text-foreground">Variables</h5>
        <button
          onClick={onAddVariable}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
        >
          Add Variable
        </button>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {variables?.map((variable, index) => (
          <div key={index} className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={variable.name}
                onChange={(e) => onVariableChange(index, 'name', e.target.value)}
                className="text-sm font-mono bg-background border border-border rounded px-2 py-1"
                placeholder="variable_name"
              />
              <button
                onClick={() => onRemoveVariable(index)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
            
            <select
              value={variable.type}
              onChange={(e) => onVariableChange(index, 'type', e.target.value)}
              className="w-full text-sm bg-background border border-border rounded px-2 py-1"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>
            
            <input
              type="text"
              value={variable.description}
              onChange={(e) => onVariableChange(index, 'description', e.target.value)}
              className="w-full text-sm bg-background border border-border rounded px-2 py-1"
              placeholder="Description"
            />
            
            <input
              type="text"
              value={variable.defaultValue || ''}
              onChange={(e) => onVariableChange(index, 'defaultValue', e.target.value)}
              className="w-full text-sm bg-background border border-border rounded px-2 py-1"
              placeholder="Default value"
            />
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={variable.required}
                onChange={(e) => onVariableChange(index, 'required', e.target.checked)}
              />
              <span>Required</span>
            </label>
          </div>
        ))}
      </div>
      
      {variables?.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No variables defined. Click "Add Variable" to get started.
        </div>
      )}
    </div>
  )
}