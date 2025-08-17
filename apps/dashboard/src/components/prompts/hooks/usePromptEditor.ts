/**
 * @package dashboard/components/prompts/hooks
 * Main prompt editor logic and utilities
 */

import { useCallback, useRef } from 'react'
import type { PromptVariable, PromptTemplate, SystemPrompt } from '@team-dashboard/types'

interface UsePromptEditorProps {
  formData: Partial<SystemPrompt>
  allTemplates: Partial<PromptTemplate>[]
  onFormDataChange: (updater: (prev: Partial<SystemPrompt>) => Partial<SystemPrompt>) => void
  onDirtyChange: (dirty: boolean) => void
  onPreviewChange: (preview: string) => void
  onPreview?: (generatedPrompt: string) => void
}

interface UsePromptEditorReturn {
  editorRef: React.MutableRefObject<any>
  generatePreview: () => void
  handleTemplateSelect: (templateName: string) => void
  formatContent: () => void
  addVariable: () => void
  removeVariable: (index: number) => void
  handleContentChange: (value: string | undefined) => void
  handleVariableChange: (index: number, field: keyof PromptVariable, value: any) => void
  handleSave: () => SystemPrompt
}

export function usePromptEditor({
  formData,
  allTemplates,
  onFormDataChange,
  onDirtyChange,
  onPreviewChange,
  onPreview
}: UsePromptEditorProps): UsePromptEditorReturn {
  const editorRef = useRef<any>(null)

  const generatePreview = useCallback(() => {
    let preview = formData.content || ''
    
    // Replace variable placeholders with actual values or defaults
    formData.variables?.forEach(variable => {
      const placeholder = `{{${variable.name}}}`
      const value = variable.defaultValue || `[${variable.name}]`
      preview = preview.replace(new RegExp(placeholder, 'g'), String(value))
    })
    
    onPreviewChange(preview)
    onPreview?.(preview)
  }, [formData.content, formData.variables, onPreview, onPreviewChange])

  const handleTemplateSelect = useCallback((templateName: string) => {
    const template = allTemplates.find(t => t.name === templateName)
    if (template) {
      onFormDataChange(prev => ({
        ...prev,
        content: template.basePrompt,
        variables: template.variables || [],
        category: template.category
      }))
      onDirtyChange(true)
      generatePreview()
    }
  }, [allTemplates, onFormDataChange, onDirtyChange, generatePreview])

  const formatContent = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run()
    }
  }, [])

  const addVariable = useCallback(() => {
    const newVariable: PromptVariable = {
      name: `variable_${(formData.variables?.length || 0) + 1}`,
      type: 'string',
      description: '',
      required: false
    }
    
    onFormDataChange(prev => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable]
    }))
    onDirtyChange(true)
    generatePreview()
  }, [formData.variables, onFormDataChange, onDirtyChange, generatePreview])

  const removeVariable = useCallback((index: number) => {
    onFormDataChange(prev => ({
      ...prev,
      variables: prev.variables?.filter((_, i) => i !== index) || []
    }))
    onDirtyChange(true)
    generatePreview()
  }, [onFormDataChange, onDirtyChange, generatePreview])

  const handleContentChange = useCallback((value: string | undefined) => {
    const content = value || ''
    onFormDataChange(prev => ({ ...prev, content }))
    onDirtyChange(true)
    generatePreview()
  }, [onFormDataChange, onDirtyChange, generatePreview])

  const handleVariableChange = useCallback((index: number, field: keyof PromptVariable, value: any) => {
    onFormDataChange(prev => ({
      ...prev,
      variables: prev.variables?.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      ) || []
    }))
    onDirtyChange(true)
    generatePreview()
  }, [onFormDataChange, onDirtyChange, generatePreview])

  const handleSave = useCallback((): SystemPrompt => {
    return {
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
      createdAt: new Date(),
      updatedAt: new Date()
    } as SystemPrompt
  }, [formData])

  return {
    editorRef,
    generatePreview,
    handleTemplateSelect,
    formatContent,
    addVariable,
    removeVariable,
    handleContentChange,
    handleVariableChange,
    handleSave
  }
}