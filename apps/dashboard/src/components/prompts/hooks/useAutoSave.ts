/**
 * @package dashboard/components/prompts/hooks
 * Auto-save functionality hook for prompt editor
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PromptVariable } from '@team-dashboard/types'

interface PromptVersion {
  id: string
  content: string
  variables: PromptVariable[]
  timestamp: Date
  message?: string
}

interface UseAutoSaveProps {
  content: string
  variables: PromptVariable[]
  autoSaveDelay?: number
}

interface UseAutoSaveReturn {
  isDirty: boolean
  lastSaved: Date | null
  versions: PromptVersion[]
  handleContentChange: (value: string | undefined) => void
  handleVariableChange: (index: number, field: keyof PromptVariable, value: any) => void
  setVersions: React.Dispatch<React.SetStateAction<PromptVersion[]>>
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>
}

export function useAutoSave({ 
  content, 
  variables, 
  autoSaveDelay = 30000 
}: UseAutoSaveProps): UseAutoSaveReturn {
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  const handleAutoSave = useCallback(() => {
    if (content) {
      const newVersion: PromptVersion = {
        id: `v${Date.now()}`,
        content,
        variables: variables || [],
        timestamp: new Date(),
        message: 'Auto-save'
      }
      
      setVersions(prev => [newVersion, ...prev])
      setLastSaved(new Date())
      setIsDirty(false)
    }
  }, [content, variables])

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && content) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, autoSaveDelay)
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isDirty, content, autoSaveDelay, handleAutoSave])

  const handleContentChange = useCallback((value: string | undefined) => {
    setIsDirty(true)
  }, [])

  const handleVariableChange = useCallback((index: number, field: keyof PromptVariable, value: any) => {
    setIsDirty(true)
  }, [])

  return {
    isDirty,
    lastSaved,
    versions,
    handleContentChange,
    handleVariableChange,
    setVersions,
    setIsDirty
  }
}