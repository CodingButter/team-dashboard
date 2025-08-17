'use client'

import React, { useState, useCallback, useEffect } from 'react'
import type { SystemPrompt, PromptTemplate, PromptVariable } from '@team-dashboard/types'

// Component imports
import { PromptMetadataPanel, DEFAULT_TEMPLATES } from './prompt-metadata-panel'
import { PromptEditorPanel } from './prompt-editor-panel'
import { PromptVariablesPanel } from './prompt-variables-panel'
import { PromptPreviewPanel } from './prompt-preview-panel'
import { PromptVersionHistory, type PromptVersion } from './prompt-version-history'
import { usePromptAutoSave } from './use-prompt-auto-save'

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
      performance: {
        successRate: 0,
        averageTokens: 0,
        averageResponseTime: 0
      },
      usage: {
        totalUses: 0,
        lastUsed: new Date(),
        popularityScore: 0
      }
    }
  })

  // Panel state
  const [showVariablePanel, setShowVariablePanel] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState('')
  
  // Version history
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [showDiffViewer, setShowDiffViewer] = useState(false)
  const [diffVersion, setDiffVersion] = useState<PromptVersion | null>(null)
  
  // Auto-save state
  const [isDirty, setIsDirty] = useState(false)

  // Auto-save hook
  const { lastSaved } = usePromptAutoSave({
    content: formData.content || '',
    variables: formData.variables || [],
    isDirty,
    onDirtyChange: setIsDirty,
    onVersionCreate: (version) => setVersions(prev => [version, ...prev])
  })

  const generatePreview = useCallback(() => {
    let preview = formData.content || ''
    
    // Replace variable placeholders with actual values or defaults
    formData.variables?.forEach(variable => {
      const placeholder = `{{${variable.name}}}`
      const value = variable.defaultValue || `[${variable.name}]`
      preview = preview.replace(new RegExp(placeholder, 'g'), String(value))
    })
    
    setGeneratedPreview(preview)
    onPreview?.(preview)
  }, [formData.content, formData.variables, onPreview])

  const handleContentChange = useCallback((value: string | undefined) => {
    const content = value || ''
    setFormData(prev => ({ ...prev, content }))
    setIsDirty(true)
    generatePreview()
  }, [generatePreview])

  const handleVariableChange = useCallback((index: number, field: keyof PromptVariable, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      ) || []
    }))
    setIsDirty(true)
    generatePreview()
  }, [generatePreview])

  const addVariable = useCallback(() => {
    const newVariable: PromptVariable = {
      name: `variable_${(formData.variables?.length || 0) + 1}`,
      type: 'string',
      description: '',
      required: false
    }
    
    setFormData(prev => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable]
    }))
    setIsDirty(true)
  }, [formData.variables])

  const removeVariable = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.filter((_, i) => i !== index) || []
    }))
    setIsDirty(true)
    generatePreview()
  }, [generatePreview])

  const handleFormDataChange = useCallback((updates: Partial<SystemPrompt>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  const handleTemplateSelect = useCallback((templateName: string) => {
    const allTemplates = [...DEFAULT_TEMPLATES, ...templates]
    const template = allTemplates.find(t => t.name === templateName)
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name || prev.name,
        description: template.description || prev.description,
        content: template.basePrompt || prev.content,
        variables: template.variables || prev.variables,
        category: template.category || prev.category
      }))
      setIsDirty(true)
      generatePreview()
    }
  }, [templates, generatePreview])

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
        performance: {
          successRate: 0,
          averageTokens: 0,
          averageResponseTime: 0
        },
        usage: {
          totalUses: 0,
          lastUsed: new Date(),
          popularityScore: 0
        }
      },
      createdAt: prompt?.createdAt || new Date(),
      updatedAt: new Date()
    }

    onSave(promptToSave)
    setIsDirty(false)
  }, [formData, onSave, prompt])

  const revertToVersion = useCallback((version: PromptVersion) => {
    setFormData(prev => ({
      ...prev,
      content: version.content,
      variables: version.variables
    }))
    setIsDirty(true)
    setShowVersionHistory(false)
    generatePreview()
  }, [generatePreview])

  const showDiff = useCallback((version: PromptVersion) => {
    setDiffVersion(version)
    setShowDiffViewer(true)
  }, [])

  // Initialize with current version if editing
  useEffect(() => {
    if (isEditing && prompt && versions.length === 0) {
      const initialVersion: PromptVersion = {
        id: 'initial',
        content: prompt.content,
        variables: prompt.variables,
        timestamp: prompt.updatedAt,
        message: 'Current version'
      }
      setVersions([initialVersion])
    }
  }, [isEditing, prompt, versions.length])

  // Generate preview on mount and variable changes
  useEffect(() => {
    generatePreview()
  }, [generatePreview])

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
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            History ({versions.length})
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
        <PromptMetadataPanel
          formData={formData}
          onFormDataChange={handleFormDataChange}
          templates={templates}
          onTemplateSelect={handleTemplateSelect}
        />

        {/* Center Panel - Editor */}
        <div className={`space-y-4 ${showPreview || showVariablePanel ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <PromptEditorPanel
            content={formData.content || ''}
            onChange={handleContentChange}
            showDiffViewer={showDiffViewer}
            diffVersion={diffVersion}
            onCloseDiff={() => setShowDiffViewer(false)}
            onFormat={() => {}}
          />
        </div>

        {/* Right Panel - Variables/Preview/History */}
        {(showVariablePanel || showPreview || showVersionHistory) && (
          <div className="space-y-4">
            <PromptVariablesPanel
              variables={formData.variables || []}
              onVariableChange={handleVariableChange}
              onAddVariable={addVariable}
              onRemoveVariable={removeVariable}
              isVisible={showVariablePanel}
            />

            <PromptPreviewPanel
              preview={generatedPreview}
              isVisible={showPreview}
            />

            <PromptVersionHistory
              versions={versions}
              isVisible={showVersionHistory}
              onRevertToVersion={revertToVersion}
              onShowDiff={showDiff}
            />
          </div>
        )}
      </div>
    </div>
  )
}