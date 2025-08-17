import React, { memo } from 'react'
import { AgentStatus } from '@team-dashboard/types'

interface AgentActionsProps {
  agentId: string
  status: AgentStatus
  onStart?: () => void
  onStop?: () => void
  onPause?: (agentId: string) => void
  onResume?: (agentId: string) => void
  onEdit?: (agentId: string) => void
  onViewLogs?: (agentId: string) => void
  onDelete?: () => void
  onTerminate?: (agentId: string) => void
}

export const AgentActions = memo<AgentActionsProps>(({
  agentId,
  status,
  onStart,
  onStop,
  onPause,
  onResume,
  onEdit,
  onViewLogs,
  onDelete,
  onTerminate
}) => {
  return (
    <div className="flex space-x-2">
      {status === 'stopped' && onStart && (
        <button
          onClick={onStart}
          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
        >
          Start
        </button>
      )}
      
      {status === 'running' && (
        <>
          {onStop && (
            <button
              onClick={onStop}
              className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => onPause?.(agentId)}
            className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
          >
            Pause
          </button>
        </>
      )}
      
      {status === 'paused' && (
        <button
          onClick={() => onResume?.(agentId)}
          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
        >
          Resume
        </button>
      )}
      
      {onEdit && (
        <button
          onClick={() => onEdit(agentId)}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Configure
        </button>
      )}
      
      {onViewLogs && (
        <button
          onClick={() => onViewLogs(agentId)}
          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
        >
          Logs
        </button>
      )}
      
      {onDelete ? (
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Delete
        </button>
      ) : (
        <button
          onClick={() => onTerminate?.(agentId)}
          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Terminate
        </button>
      )}
    </div>
  )
})

AgentActions.displayName = 'AgentActions'