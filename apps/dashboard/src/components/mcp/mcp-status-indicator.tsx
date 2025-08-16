'use client'

import React from 'react'
import { McpServerStatus } from '@team-dashboard/types'

interface McpStatusIndicatorProps {
  status: McpServerStatus
  showDetails?: boolean
  className?: string
}

export function McpStatusIndicator({ status, showDetails = false, className = '' }: McpStatusIndicatorProps) {
  const getStatusConfig = (serverStatus: string) => {
    switch (serverStatus) {
      case 'connected':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/20',
          icon: '●',
          label: 'Connected'
        }
      case 'connecting':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/20',
          icon: '○',
          label: 'Connecting'
        }
      case 'disconnected':
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          borderColor: 'border-gray-400/20',
          icon: '○',
          label: 'Disconnected'
        }
      case 'error':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/20',
          icon: '●',
          label: 'Error'
        }
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          borderColor: 'border-gray-400/20',
          icon: '?',
          label: 'Unknown'
        }
    }
  }

  const config = getStatusConfig(status.status)

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        <span className={`${config.color} text-lg leading-none`}>{config.icon}</span>
        <span className={`text-sm ${config.color}`}>{config.label}</span>
      </div>
    )
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-3 ${className}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`${config.color} text-lg leading-none`}>{config.icon}</span>
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Server ID: {status.serverId.slice(-8)}
        </div>
      </div>

      {/* Connection Info */}
      {status.lastConnected && (
        <div className="text-sm">
          <span className="text-muted-foreground">Last connected: </span>
          <span className="text-foreground">
            {new Date(status.lastConnected).toLocaleString()}
          </span>
        </div>
      )}

      {/* Performance Metrics */}
      {status.status === 'connected' && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Uptime</div>
            <div className="text-foreground font-medium">
              {status.uptime ? `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Requests</div>
            <div className="text-foreground font-medium">{status.requestCount || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Errors</div>
            <div className="text-foreground font-medium">{status.errorCount || 0}</div>
          </div>
        </div>
      )}

      {/* Capabilities */}
      {status.capabilities && status.capabilities.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Capabilities</div>
          <div className="flex flex-wrap gap-1">
            {status.capabilities.map((capability) => (
              <span 
                key={capability}
                className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available Tools */}
      {status.tools && status.tools.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            Available Tools ({status.tools.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {status.tools.slice(0, 5).map((tool) => (
              <span 
                key={tool}
                className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              >
                {tool}
              </span>
            ))}
            {status.tools.length > 5 && (
              <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
                +{status.tools.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resources */}
      {status.resources && status.resources.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            Resources ({status.resources.length})
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {status.resources.slice(0, 3).join(', ')}
            {status.resources.length > 3 && ` +${status.resources.length - 3} more`}
          </div>
        </div>
      )}

      {/* Error Display */}
      {status.lastError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
            Error
          </div>
          <div className="text-sm text-red-700 dark:text-red-300 font-mono">
            {status.lastError}
          </div>
        </div>
      )}

      {/* Health Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Status updated: {new Date().toLocaleTimeString()}
        </div>
        {status.status === 'connected' && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Live</span>
          </div>
        )}
      </div>
    </div>
  )
}