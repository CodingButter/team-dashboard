import { useCallback } from 'react'
import type { PromptVariable } from '@team-dashboard/types'

interface UsePromptVariablesProps {
  variables: PromptVariable[]
  onVariablesChange: (variables: PromptVariable[]) => void
  onMarkDirty: () => void
}

export function usePromptVariables({ 
  variables, 
  onVariablesChange, 
  onMarkDirty 
}: UsePromptVariablesProps) {
  
  const handleVariableChange = useCallback((index: number, field: keyof PromptVariable, value: any) => {
    const updatedVariables = variables?.map((variable, i) => 
      i === index ? { ...variable, [field]: value } : variable
    ) || []
    
    onVariablesChange(updatedVariables)
    onMarkDirty()
  }, [variables, onVariablesChange, onMarkDirty])

  const addVariable = useCallback(() => {
    const newVariable: PromptVariable = {
      name: `variable_${(variables?.length || 0) + 1}`,
      type: 'string',
      description: '',
      defaultValue: '',
      required: false
    }
    
    const updatedVariables = [...(variables || []), newVariable]
    onVariablesChange(updatedVariables)
    onMarkDirty()
  }, [variables, onVariablesChange, onMarkDirty])

  const removeVariable = useCallback((index: number) => {
    const updatedVariables = variables?.filter((_, i) => i !== index) || []
    onVariablesChange(updatedVariables)
    onMarkDirty()
  }, [variables, onVariablesChange, onMarkDirty])

  const generatePreview = useCallback((content: string) => {
    let preview = content || ''
    
    // Replace variable placeholders with actual values or defaults
    variables?.forEach(variable => {
      const placeholder = `{{${variable.name}}}`
      const value = variable.defaultValue || `[${variable.name}]`
      preview = preview.replace(new RegExp(placeholder, 'g'), String(value))
    })
    
    return preview
  }, [variables])

  return {
    handleVariableChange,
    addVariable,
    removeVariable,
    generatePreview
  }
}