'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import type { SystemPrompt, PromptTemplate, PromptVariable, PromptCategory } from '@team-dashboard/types'

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

// Default templates for quick start
const DEFAULT_TEMPLATES: Partial<PromptTemplate>[] = [
  {
    name: 'Frontend Expert',
    description: 'React and frontend development specialist',
    basePrompt: `You are a Senior Frontend Developer with expertise in React, TypeScript, and modern web technologies.

Your capabilities include:
- {framework} development and optimization
- {styling} implementation and responsive design
- Performance optimization and {performance_metrics}
- {accessibility} compliance and best practices

Variable substitutions:
- framework: {{framework}}
- styling: {{styling}}
- performance_metrics: {{performance_metrics}}
- accessibility: {{accessibility}}

Always provide modern, efficient solutions with proper typing and documentation.`,
    variables: [
      { name: 'framework', type: 'string', description: 'Primary framework (React, Vue, Angular)', defaultValue: 'React', required: true },
      { name: 'styling', type: 'string', description: 'Styling approach (CSS, TailwindCSS, styled-components)', defaultValue: 'TailwindCSS', required: true },
      { name: 'performance_metrics', type: 'string', description: 'Performance focus areas', defaultValue: 'Core Web Vitals, bundle size', required: false },
      { name: 'accessibility', type: 'string', description: 'Accessibility standards', defaultValue: 'WCAG 2.1 AA', required: false }
    ],
    category: 'frontend' as PromptCategory,
    tags: ['react', 'frontend', 'typescript']
  },
  {
    name: 'DevOps Specialist',
    description: 'Infrastructure and deployment expert',
    basePrompt: `You are a DevOps Engineer specializing in {{platform}} infrastructure and {{deployment_strategy}} deployments.

Your expertise covers:
- Container orchestration with {{container_tech}}
- CI/CD pipelines using {{ci_cd_tools}}
- Monitoring and alerting with {{monitoring_stack}}
- Security and compliance for {{compliance_standards}}

Focus on:
- Scalable and resilient infrastructure
- Automated deployment processes
- Cost optimization strategies
- Security best practices`,
    variables: [
      { name: 'platform', type: 'string', description: 'Cloud platform', defaultValue: 'AWS', required: true },
      { name: 'deployment_strategy', type: 'string', description: 'Deployment approach', defaultValue: 'blue-green', required: false },
      { name: 'container_tech', type: 'string', description: 'Container technology', defaultValue: 'Docker/Kubernetes', required: true },
      { name: 'ci_cd_tools', type: 'string', description: 'CI/CD toolchain', defaultValue: 'GitHub Actions', required: true },
      { name: 'monitoring_stack', type: 'string', description: 'Monitoring tools', defaultValue: 'Prometheus/Grafana', required: false },
      { name: 'compliance_standards', type: 'string', description: 'Compliance requirements', defaultValue: 'SOC2, GDPR', required: false }
    ],
    category: 'devops' as PromptCategory,
    tags: ['devops', 'infrastructure', 'kubernetes']
  }
]

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

  // Editor state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showVariablePanel, setShowVariablePanel] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [generatedPreview, setGeneratedPreview] = useState('')
  
  // Version history
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)
  const [showDiffViewer, setShowDiffViewer] = useState(false)
  const [diffVersion, setDiffVersion] = useState<PromptVersion | null>(null)
  
  // Auto-save
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  
  const editorRef = useRef<any>(null)
  const allTemplates = [...DEFAULT_TEMPLATES, ...templates]

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && formData.content) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, 30000) // Auto-save every 30 seconds
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isDirty, formData.content])

  const handleAutoSave = useCallback(() => {
    if (formData.content) {
      const newVersion: PromptVersion = {
        id: `v${Date.now()}`,
        content: formData.content,
        variables: formData.variables || [],
        timestamp: new Date(),
        message: 'Auto-save'
      }
      
      setVersions(prev => [newVersion, ...prev])
      setLastSaved(new Date())
      setIsDirty(false)
    }
  }, [formData.content, formData.variables])

  const handleContentChange = useCallback((value: string | undefined) => {
    const content = value || ''
    setFormData(prev => ({ ...prev, content }))
    setIsDirty(true)
    generatePreview()
  }, [])

  const handleVariableChange = useCallback((index: number, field: keyof PromptVariable, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      ) || []
    }))
    setIsDirty(true)
    generatePreview()
  }, [])

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
  }, [])

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

  const handleTemplateSelect = useCallback((templateName: string) => {
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
    setSelectedTemplate('')
  }, [allTemplates])

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

  const formatContent = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run()
    }
  }, [])

  const revertToVersion = useCallback((version: PromptVersion) => {
    setFormData(prev => ({
      ...prev,
      content: version.content,
      variables: version.variables
    }))
    setIsDirty(true)
    setShowVersionHistory(false)
    generatePreview()
  }, [])

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
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Prompt Configuration</h4>
          
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="My System Prompt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              rows={3}
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Category
            </label>
            <select
              value={formData.category || 'custom'}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as PromptCategory }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="system">System</option>
              <option value="coding">Coding</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="devops">DevOps</option>
              <option value="testing">Testing</option>
              <option value="documentation">Documentation</option>
              <option value="security">Security</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Version
            </label>
            <input
              type="text"
              value={formData.version || '1.0.0'}
              onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="1.0.0"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Load Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">Select a template...</option>
              {allTemplates.map(template => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Panel - Editor */}
        <div className={`space-y-4 ${showPreview || showVariablePanel ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-foreground">
              Prompt Content
              {showDiffViewer && diffVersion && ' - Diff View'}
            </h4>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{formData.content?.length || 0} characters</span>
              <button
                onClick={formatContent}
                className="text-blue-400 hover:text-blue-300"
              >
                Format
              </button>
              {showDiffViewer && (
                <button
                  onClick={() => setShowDiffViewer(false)}
                  className="text-red-400 hover:text-red-300"
                >
                  Close Diff
                </button>
              )}
            </div>
          </div>
          
          <div className="border border-border rounded-md overflow-hidden">
            {showDiffViewer && diffVersion ? (
              <DiffEditor
                height="600px"
                language="markdown"
                theme="vs-dark"
                original={diffVersion.content}
                modified={formData.content || ''}
                options={{
                  fontSize: 14,
                  readOnly: false,
                  automaticLayout: true,
                  renderSideBySide: true
                }}
              />
            ) : (
              <Editor
                height="600px"
                language="markdown"
                theme="vs-dark"
                value={formData.content || ''}
                onChange={handleContentChange}
                onMount={(editor) => {
                  editorRef.current = editor
                }}
                options={{
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                  folding: true,
                  findMatchesTolerance: 'medium',
                  renderLineHighlight: 'line',
                  selectOnLineNumbers: true,
                  roundedSelection: false,
                  readOnly: false,
                  cursorStyle: 'line',
                  multiCursorModifier: 'ctrlCmd',
                  formatOnPaste: true,
                  formatOnType: true,
                  suggest: {
                    showKeywords: true,
                    showSnippets: true
                  }
                }}
              />
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Shortcuts: Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+F (find), Alt+Click (multi-cursor)</p>
            <p>Variables: Use {{variable_name}} syntax for variable substitution</p>
          </div>
        </div>

        {/* Right Panel - Variables/Preview/History */}
        {(showVariablePanel || showPreview || showVersionHistory) && (
          <div className="space-y-4">
            {/* Variable Panel */}
            {showVariablePanel && (
              <div className="border border-border rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-foreground">Variables</h5>
                  <button
                    onClick={addVariable}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                  >
                    Add
                  </button>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {formData.variables?.map((variable, index) => (
                    <div key={index} className="border border-border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                          className="text-sm font-mono bg-background border border-border rounded px-2 py-1"
                          placeholder="variable_name"
                        />
                        <button
                          onClick={() => removeVariable(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          ×
                        </button>
                      </div>
                      
                      <select
                        value={variable.type}
                        onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
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
                        onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                        className="w-full text-sm bg-background border border-border rounded px-2 py-1"
                        placeholder="Description"
                      />
                      
                      <input
                        type="text"
                        value={variable.defaultValue || ''}
                        onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                        className="w-full text-sm bg-background border border-border rounded px-2 py-1"
                        placeholder="Default value"
                      />
                      
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={variable.required}
                          onChange={(e) => handleVariableChange(index, 'required', e.target.checked)}
                        />
                        <span>Required</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
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

            {/* Version History */}
            {showVersionHistory && (
              <div className="border border-border rounded-md p-4">
                <h5 className="font-medium text-foreground mb-3">Version History</h5>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {versions.map((version, index) => (
                    <div key={version.id} className="border border-border rounded p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{version.id}</span>
                        <span className="text-muted-foreground text-xs">
                          {version.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">{version.message}</p>
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => revertToVersion(version)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                        >
                          Revert
                        </button>
                        <button
                          onClick={() => showDiff(version)}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded"
                        >
                          Diff
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}