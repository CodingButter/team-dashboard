import { useCallback, useEffect, useRef, useState } from 'react'
import type { PromptVariable } from '@team-dashboard/types'
import type { PromptVersion } from './prompt-version-history'

interface UsePromptAutoSaveProps {
  content: string
  variables: PromptVariable[]
  isDirty: boolean
  onDirtyChange: (dirty: boolean) => void
  onVersionCreate: (version: PromptVersion) => void
}

export function usePromptAutoSave({
  content,
  variables,
  isDirty,
  onDirtyChange,
  onVersionCreate
}: UsePromptAutoSaveProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
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
      
      onVersionCreate(newVersion)
      setLastSaved(new Date())
      onDirtyChange(false)
    }
  }, [content, variables, onVersionCreate, onDirtyChange])

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && content) {
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
  }, [isDirty, content, handleAutoSave])

  return {
    lastSaved,
    handleAutoSave
  }
}