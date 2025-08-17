'use client'

/**
 * @package dashboard/components/prompts
 * System prompt editor - refactored for maintainability
 * 
 * Original 665+ lines broken down into:
 * - Extracted components: VariablePanel, PreviewPanel, VersionHistoryPanel
 * - Custom hooks: useAutoSave, usePromptEditor, useVersionHistory
 * - Default templates moved to separate file
 */

import React, { useState, useEffect } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import type { SystemPrompt, PromptTemplate, PromptVariable } from '@team-dashboard/types'

// Extracted components and hooks
import { DEFAULT_TEMPLATES } from './templates/default-templates.js'
import { VariablePanel } from './editor/VariablePanel.js'
import { PreviewPanel } from './editor/PreviewPanel.js'
import { VersionHistoryPanel } from './editor/VersionHistoryPanel.js'
import { useAutoSave } from './hooks/useAutoSave.js'
import { usePromptEditor } from './hooks/usePromptEditor.js'
import { useVersionHistory } from './hooks/useVersionHistory.js'

interface SystemPromptEditorProps {
  prompt?: SystemPrompt
  onSave: (prompt: SystemPrompt) => void
  onCancel: () => void
  isEditing?: boolean
  templates?: PromptTemplate[]
  onPreview?: (generatedPrompt: string) => void
}

interface PromptVersion {
  id: string
  content: string
  variables: PromptVariable[]
  timestamp: Date
  message?: string
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
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState('')
  const [versions, setVersions] = useState<PromptVersion[]>([])
  
  const allTemplates = [...DEFAULT_TEMPLATES, ...templates]
  
  // Custom hooks for functionality
  const autoSave = useAutoSave({
    content: formData.content || '',
    variables: formData.variables || []
  })
  
  const editor = usePromptEditor({
    formData,
    allTemplates,
    onFormDataChange: setFormData,
    onDirtyChange: autoSave.setIsDirty,
    onPreviewChange: setGeneratedPreview,
    onPreview
  })
  
  const versionHistory = useVersionHistory({
    onFormDataChange: setFormData,
    onDirtyChange: autoSave.setIsDirty,
    onVersionHistoryToggle: setShowVersionHistory,
    onPreviewGenerate: editor.generatePreview
  })

  // Initialize version history for editing
  useEffect(() => {
    if (isEditing && prompt && versions.length === 0) {
      const initialVersion = versionHistory.initializeVersion(prompt, versions)
      setVersions([initialVersion])
    }
  }, [isEditing, prompt, versions.length, versionHistory])

  useEffect(() => {
    editor.generatePreview()
  }, [editor])

  const handleSave = () => {
    const promptToSave = editor.handleSave()
    onSave(promptToSave)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit System Prompt' : 'Create System Prompt'}
          </h3>
          {autoSave.lastSaved && (
            <p className="text-sm text-muted-foreground">
              Last saved: {autoSave.lastSaved.toLocaleTimeString()}
              {autoSave.isDirty && <span className="text-orange-500 ml-2">• Unsaved changes</span>}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVariablePanel(!showVariablePanel)}
            className={`px-3 py-1 text-sm rounded ${
              showVariablePanel ? 'bg-blue-600 text-white' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Variables
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 text-sm rounded ${
              showPreview ? 'bg-blue-600 text-white' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`px-3 py-1 text-sm rounded ${
              showVersionHistory ? 'bg-blue-600 text-white' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Form Fields */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Prompt name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
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
                <option value="marketing">Marketing</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              rows={2}
              placeholder="Describe what this prompt does"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Start from Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value)
                if (e.target.value) editor.handleTemplateSelect(e.target.value)
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">Select a template...</option>
              {allTemplates.map((template, index) => (
                <option key={index} value={template.name}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Content{versionHistory.showDiffViewer && versionHistory.diffVersion && ' - Diff View'}
              </label>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{formData.content?.length || 0} characters</span>
                <button onClick={editor.formatContent} className="text-blue-400 hover:text-blue-300">
                  Format
                </button>
                {versionHistory.showDiffViewer && (
                  <button
                    onClick={() => versionHistory.setShowDiffViewer(false)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Close Diff
                  </button>
                )}
              </div>
            </div>
            
            <div className="border border-border rounded-md overflow-hidden">
              {versionHistory.showDiffViewer && versionHistory.diffVersion ? (
                <DiffEditor
                  height="600px"
                  language="markdown"
                  theme="vs-dark"
                  original={versionHistory.diffVersion.content}
                  modified={formData.content || ''}
                  options={{ fontSize: 14, readOnly: false, automaticLayout: true, renderSideBySide: true }}
                />
              ) : (
                <Editor
                  height="600px"
                  language="markdown"
                  theme="vs-dark"
                  value={formData.content || ''}
                  onChange={editor.handleContentChange}
                  onMount={(editorInstance) => { editor.editorRef.current = editorInstance }}
                  options={{ fontSize: 14, wordWrap: 'on', minimap: { enabled: false }, automaticLayout: true }}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isEditing ? 'Update' : 'Create'} Prompt
            </button>
          </div>
        </div>

        {/* Right Panel - Variables/Preview/History */}
        {(showVariablePanel || showPreview || showVersionHistory) && (
          <div className="space-y-4">
            {showVariablePanel && (
              <VariablePanel
                variables={formData.variables || []}
                onVariableChange={editor.handleVariableChange}
                onAddVariable={editor.addVariable}
                onRemoveVariable={editor.removeVariable}
              />
            )}
            {showPreview && <PreviewPanel content={generatedPreview} />}
            {showVersionHistory && (
              <VersionHistoryPanel
                versions={versions}
                onRevertToVersion={versionHistory.revertToVersion}
                onShowDiff={versionHistory.showDiff}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}