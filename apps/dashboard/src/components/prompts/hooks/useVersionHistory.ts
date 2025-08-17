/**
 * @package dashboard/components/prompts/hooks
 * Version history management hook for prompt editor
 */

import { useCallback, useState } from 'react'
import type { PromptVariable, SystemPrompt } from '@team-dashboard/types'

interface PromptVersion {
  id: string
  content: string
  variables: PromptVariable[]
  timestamp: Date
  message?: string
}

interface UseVersionHistoryReturn {
  showDiffViewer: boolean
  diffVersion: PromptVersion | null
  currentVersionIndex: number
  setShowDiffViewer: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentVersionIndex: React.Dispatch<React.SetStateAction<number>>
  revertToVersion: (version: PromptVersion) => void
  showDiff: (version: PromptVersion) => void
  initializeVersion: (prompt: SystemPrompt, versions: PromptVersion[]) => PromptVersion
}

interface UseVersionHistoryProps {
  onFormDataChange: (updater: (prev: Partial<SystemPrompt>) => Partial<SystemPrompt>) => void
  onDirtyChange: (dirty: boolean) => void
  onVersionHistoryToggle: (show: boolean) => void
  onPreviewGenerate: () => void
}

export function useVersionHistory({
  onFormDataChange,
  onDirtyChange,
  onVersionHistoryToggle,
  onPreviewGenerate
}: UseVersionHistoryProps): UseVersionHistoryReturn {
  const [showDiffViewer, setShowDiffViewer] = useState(false)
  const [diffVersion, setDiffVersion] = useState<PromptVersion | null>(null)
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)

  const revertToVersion = useCallback((version: PromptVersion) => {
    onFormDataChange(prev => ({
      ...prev,
      content: version.content,
      variables: version.variables
    }))
    onDirtyChange(true)
    onVersionHistoryToggle(false)
    onPreviewGenerate()
  }, [onFormDataChange, onDirtyChange, onVersionHistoryToggle, onPreviewGenerate])

  const showDiff = useCallback((version: PromptVersion) => {
    setDiffVersion(version)
    setShowDiffViewer(true)
  }, [])

  const initializeVersion = useCallback((prompt: SystemPrompt, versions: PromptVersion[]): PromptVersion => {
    if (versions.length === 0) {
      return {
        id: 'initial',
        content: prompt.content,
        variables: prompt.variables,
        timestamp: prompt.updatedAt || new Date(),
        message: 'Current version'
      }
    }
    return versions[0]
  }, [])

  return {
    showDiffViewer,
    diffVersion,
    currentVersionIndex,
    setShowDiffViewer,
    setCurrentVersionIndex,
    revertToVersion,
    showDiff,
    initializeVersion
  }
}