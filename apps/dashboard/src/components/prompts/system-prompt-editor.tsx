'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { SystemPrompt, PromptTemplate, PromptVariable } from '@team-dashboard/types'
import { TemplateSelector } from './components/TemplateSelector'
import { VariableEditor } from './components/VariableEditor'
import { useAutoSave } from './hooks/use-auto-save'
import { usePromptVariables } from './hooks/use-prompt-variables'

interface SystemPromptEditorProps {
  prompt?: SystemPrompt
  onSave: (prompt: SystemPrompt) => void
  onCancel: () => void
  isEditing?: boolean
  templates?: PromptTemplate[]
  onPreview?: (generatedPrompt: string) => void
}

export function SystemPromptEditor({ 
  prompt, 
  onSave, 
  onCancel, 
  isEditing = false,
  templates = [],
  onPreview
}: SystemPromptEditorProps) {
  const [formData, setFormData] = useState<Partial<SystemPrompt>>({
    id: prompt?.id || '',
    name: prompt?.name || '',
    description: prompt?.description || '',
    content: prompt?.content || '',
    category: prompt?.category || 'custom',
    variables: prompt?.variables || [],
    version: prompt?.version || '1.0.0',
    metadata: prompt?.metadata || {
      author: 'user',
      license: 'private',
      source: 'user',
      performance: { successRate: 0, averageTokens: 0, averageResponseTime: 0 },
      usage: { totalUses: 0, lastUsed: new Date(), popularityScore: 0 }
    }
  })

  // UI state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showVariablePanel, setShowVariablePanel] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState('')

  // Auto-save hook
  const { isDirty, lastSaved, markDirty } = useAutoSave({
    content: formData.content || '',
    variables: formData.variables || []
  })

  // Variable management hook  
  const { handleVariableChange, addVariable, removeVariable, generatePreview } = usePromptVariables({
    variables: formData.variables || [],
    onVariablesChange: (variables) => setFormData(prev => ({ ...prev, variables })),
    onMarkDirty: markDirty
  })

  // Content change handler
  const handleContentChange = useCallback((value: string | undefined) => {
    const content = value || ''
    setFormData(prev => ({ ...prev, content }))
    markDirty()
    
    const preview = generatePreview(content)
    setGeneratedPreview(preview)
    onPreview?.(preview)
  }, [generatePreview, markDirty, onPreview])

  // Update preview when variables change
  useEffect(() => {
    const preview = generatePreview(formData.content || '')
    setGeneratedPreview(preview)
    onPreview?.(preview)
  }, [formData.variables, formData.content, generatePreview, onPreview])

  const handleTemplateSelect = useCallback((templateName: string) => {
    setSelectedTemplate(templateName)
    // Template selection logic will be handled by TemplateSelector
  }, [])

  const handleSave = useCallback(() => {
    const promptToSave: SystemPrompt = {
      ...formData,
      id: formData.id || `prompt-${Date.now()}`,
      name: formData.name || 'Unnamed Prompt',
      description: formData.description || '',
      content: formData.content || '',
      version: formData.version || '1.0.0',
      category: formData.category || 'custom',
      variables: formData.variables || [],
      metadata: formData.metadata || {
        author: 'user',
        license: 'private',
        source: 'user',
        performance: { successRate: 0, averageTokens: 0, averageResponseTime: 0 },
        usage: { totalUses: 0, lastUsed: new Date(), popularityScore: 0 }
      },
      createdAt: prompt?.createdAt || new Date(),
      updatedAt: new Date()
    }
    onSave(promptToSave)
  }, [formData, onSave, prompt?.createdAt])

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit System Prompt' : 'Create System Prompt'}
          </h3>
          {lastSaved && (
            <p className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
              {isDirty && <span className="text-orange-500 ml-2">• Unsaved changes</span>}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVariablePanel(!showVariablePanel)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Variables
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name || !formData.content}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Panel - Metadata & Templates */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Prompt Configuration</h4>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="Enter prompt name..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              rows={3}
              placeholder="Describe this prompt..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <select
              value={formData.category || 'custom'}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="custom">Custom</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="devops">DevOps</option>
              <option value="data">Data</option>
              <option value="content">Content</option>
            </select>
          </div>

          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />
        </div>

        {/* Center Panel - Editor */}
        <div className={`space-y-4 ${showPreview || showVariablePanel ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-foreground">Prompt Content</h4>
          </div>
          
          <div className="border border-border rounded-md">
            <Editor
              height="400px"
              defaultLanguage="markdown"
              value={formData.content || ''}
              onChange={handleContentChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true
              }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>Shortcuts: Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+F (find)</p>
            <p>Variables: Use {{variable_name}} syntax for variable substitution</p>
          </div>
        </div>

        {/* Right Panel - Variables/Preview */}
        {(showVariablePanel || showPreview) && (
          <div className="space-y-4">
            {/* Variable Panel */}
            {showVariablePanel && (
              <VariableEditor
                variables={formData.variables || []}
                onVariableChange={handleVariableChange}
                onAddVariable={addVariable}
                onRemoveVariable={removeVariable}
              />
            )}

            {/* Preview Panel */}
            {showPreview && (
              <div className="border border-border rounded-md p-4">
                <h5 className="font-medium text-foreground mb-3">Live Preview</h5>
                <div className="bg-background border border-border rounded p-3 text-sm max-h-80 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-foreground">{generatedPreview}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}