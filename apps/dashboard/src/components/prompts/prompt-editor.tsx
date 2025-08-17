'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { MCPSystemPrompt as SystemPrompt } from '@team-dashboard/types'

interface PromptEditorProps {
  prompt?: SystemPrompt
  onSave: (prompt: SystemPrompt) => void
  onCancel: () => void
  isEditing?: boolean
  templates?: SystemPrompt[]
}

const DEFAULT_TEMPLATES: Partial<SystemPrompt>[] = [
  {
    name: 'General Assistant',
    content: `You are Claude, a helpful AI assistant created by Anthropic. You are knowledgeable, thoughtful, and honest. You aim to be helpful while being harmless and following your principles.

Key guidelines:
- Be helpful, harmless, and honest
- Think step-by-step through complex problems
- Ask clarifying questions when needed
- Admit when you don't know something
- Provide clear, well-structured responses

Always strive to understand the human's needs and provide the most useful response possible.`,
    tags: ['general', 'assistant', 'default'],
    maxTokens: 4000
  },
  {
    name: 'Software Developer',
    content: `You are an expert software developer with deep knowledge across multiple programming languages, frameworks, and best practices. You write clean, maintainable, and well-documented code.

Your expertise includes:
- Modern web development (React, Next.js, TypeScript, Node.js)
- Backend development (REST APIs, databases, microservices)
- DevOps and deployment practices
- Code review and optimization
- Testing strategies and implementation
- Security best practices

When helping with code:
1. Write clean, readable code with proper comments
2. Follow established coding standards and conventions
3. Consider performance, security, and maintainability
4. Provide explanations for complex logic
5. Suggest improvements and alternatives when appropriate

Always ask clarifying questions about requirements, constraints, and preferences before providing solutions.`,
    tags: ['developer', 'coding', 'programming'],
    maxTokens: 8000
  },
  {
    name: 'Code Reviewer',
    content: `You are a senior code reviewer with expertise in software engineering best practices. Your role is to review code for quality, security, performance, and maintainability.

Review criteria:
- Code clarity and readability
- Performance considerations
- Security vulnerabilities
- Best practices adherence
- Testing coverage
- Documentation quality
- Potential bugs or edge cases

Provide constructive feedback that helps developers improve their skills while maintaining a positive and educational tone.

Format your reviews with:
1. Summary of overall code quality
2. Specific issues found (with line references if applicable)
3. Suggestions for improvement
4. Positive feedback on well-written sections
5. Learning resources when relevant`,
    tags: ['review', 'quality', 'mentor'],
    maxTokens: 6000
  },
  {
    name: 'DevOps Engineer',
    content: `You are a DevOps engineer specializing in infrastructure automation, CI/CD pipelines, and cloud platforms. You help teams deploy, monitor, and scale applications reliably.

Your expertise covers:
- Infrastructure as Code (Terraform, CloudFormation, Pulumi)
- Container orchestration (Docker, Kubernetes)
- CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Cloud platforms (AWS, Azure, GCP)
- Monitoring and logging (Prometheus, Grafana, ELK stack)
- Security practices and compliance

When providing solutions:
1. Prioritize reliability and security
2. Consider scalability and cost optimization
3. Suggest automation opportunities
4. Provide monitoring and alerting strategies
5. Include disaster recovery considerations

Focus on practical, production-ready solutions with proper documentation and best practices.`,
    tags: ['devops', 'infrastructure', 'deployment'],
    maxTokens: 8000
  }
]

export function PromptEditor({ 
  prompt, 
  onSave, 
  onCancel, 
  isEditing = false,
  templates = [] 
}: PromptEditorProps) {
  const [formData, setFormData] = useState<Partial<SystemPrompt>>({
    id: prompt?.id || '',
    name: prompt?.name || '',
    content: prompt?.content || '',
    description: prompt?.description || '',
    tags: prompt?.tags || [],
    maxTokens: prompt?.maxTokens || 4000,
    isDefault: prompt?.isDefault || false,
    version: prompt?.version || 1
  })

  const [newTag, setNewTag] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [contentLength, setContentLength] = useState(prompt?.content?.length || 0)
  const editorRef = useRef<any>(null)

  const allTemplates = [...DEFAULT_TEMPLATES, ...templates]

  const handleInputChange = useCallback((field: keyof SystemPrompt, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleContentChange = useCallback((value: string | undefined) => {
    const content = value || ''
    setFormData(prev => ({ ...prev, content }))
    setContentLength(content.length)
  }, [])

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag('')
    }
  }, [newTag, formData.tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }, [])

  const handleTemplateSelect = useCallback((templateName: string) => {
    const template = allTemplates.find(t => t.name === templateName)
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name || prev.name,
        content: template.content || prev.content,
        tags: template.tags || prev.tags,
        maxTokens: template.maxTokens || prev.maxTokens
      }))
    }
    setSelectedTemplate('')
  }, [allTemplates])

  const handleSave = useCallback(() => {
    const promptToSave: SystemPrompt = {
      ...formData,
      id: formData.id || `prompt-${Date.now()}`,
      name: formData.name || 'Unnamed Prompt',
      content: formData.content || '',
      tags: formData.tags || [],
      maxTokens: formData.maxTokens || 4000,
      isDefault: formData.isDefault || false,
      version: formData.version || 1,
      createdAt: prompt?.createdAt || Date.now(),
      updatedAt: Date.now(),
      createdBy: prompt?.createdBy || 'user',
      usage: prompt?.usage || {
        timesUsed: 0
      }
    } as SystemPrompt

    onSave(promptToSave)
  }, [formData, onSave, prompt])

  const formatContent = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run()
    }
  }, [])

  const estimateTokens = useCallback((text: string): number => {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }, [])

  useEffect(() => {
    setContentLength(formData.content?.length || 0)
  }, [formData.content])

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {isEditing ? 'Edit System Prompt' : 'Create System Prompt'}
        </h3>
        <div className="flex space-x-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Metadata */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Prompt Details</h4>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="My Custom Prompt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              rows={3}
              placeholder="Brief description of this prompt's purpose"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={formData.maxTokens || 4000}
              onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              min="100"
              max="32000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Estimated tokens: ~{estimateTokens(formData.content || '')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tags
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Add tag"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isDefault || false}
                onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Set as default</span>
            </label>
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

        {/* Right Column - Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-foreground">Prompt Content</h4>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{contentLength} characters</span>
              <button
                onClick={formatContent}
                className="text-blue-400 hover:text-blue-300"
              >
                Format
              </button>
            </div>
          </div>
          
          <div className="border border-border rounded-md overflow-hidden">
            <Editor
              height="500px"
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
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'line',
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true
              }}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Tips:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Use clear, specific instructions for better agent performance</li>
              <li>Include examples when describing complex tasks</li>
              <li>Set clear boundaries and guidelines</li>
              <li>Consider the agent's capabilities and limitations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Stats (for editing existing prompts) */}
      {isEditing && prompt?.usage && (
        <div className="border-t border-border pt-4">
          <h4 className="text-md font-medium text-foreground mb-3">Usage Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Times Used</div>
              <div className="font-medium">{prompt.usage.timesUsed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Used</div>
              <div className="font-medium">
                {prompt.usage.lastUsed 
                  ? new Date(prompt.usage.lastUsed).toLocaleDateString()
                  : 'Never'
                }
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Average Rating</div>
              <div className="font-medium">
                {prompt.usage.averageRating 
                  ? `${prompt.usage.averageRating.toFixed(1)}/5`
                  : 'No ratings'
                }
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Version</div>
              <div className="font-medium">v{prompt.version}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}