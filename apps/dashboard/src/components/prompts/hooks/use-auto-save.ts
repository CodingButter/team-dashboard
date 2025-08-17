import { useState, useEffect, useRef, useCallback } from 'react'
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
  autoSaveInterval?: number
}

export function useAutoSave({ content, variables, autoSaveInterval = 30000 }: UseAutoSaveProps) {
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  const handleAutoSave = useCallback(() => {
    if (content) {
      const newVersion: PromptVersion = {
        id: `v${Date.now()}`,
        content,
        variables,
        timestamp: new Date(),
        message: 'Auto-save'
      }
      
      setVersions(prev => [newVersion, ...prev])
      setLastSaved(new Date())
      setIsDirty(false)
    }
  }, [content, variables])

  const saveVersion = useCallback((message?: string) => {
    if (content) {
      const newVersion: PromptVersion = {
        id: `v${Date.now()}`,
        content,
        variables,
        timestamp: new Date(),
        message: message || 'Manual save'
      }
      
      setVersions(prev => [newVersion, ...prev])
      setLastSaved(new Date())
      setIsDirty(false)
    }
  }, [content, variables])

  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && content) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, autoSaveInterval)
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isDirty, content, autoSaveInterval, handleAutoSave])

  return {
    isDirty,
    lastSaved,
    versions,
    setVersions,
    saveVersion,
    markDirty,
    handleAutoSave
  }
}