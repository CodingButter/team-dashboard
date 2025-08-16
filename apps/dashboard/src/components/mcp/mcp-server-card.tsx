'use client'

import React from 'react'
import { McpServer, McpServerStatus } from '@team-dashboard/types'

interface McpServerCardProps {
  server: McpServer
  status?: McpServerStatus
  onConnect?: (serverId: string) => void
  onDisconnect?: (serverId: string) => void
  onEdit?: (serverId: string) => void
  onDelete?: (serverId: string) => void
  onTest?: (serverId: string) => void
}

export function McpServerCard({ 
  server, 
  status, 
  onConnect, 
  onDisconnect, 
  onEdit, 
  onDelete, 
  onTest 
}: McpServerCardProps) {
  const getStatusColor = (serverStatus?: string) => {
    switch (serverStatus) {
      case 'connected': return 'text-green-400 bg-green-400/10'
      case 'connecting': return 'text-blue-400 bg-blue-400/10'
      case 'disconnected': return 'text-gray-400 bg-gray-400/10'
      case 'error': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getTransportBadgeColor = (transport: string) => {
    return transport === 'stdio' 
      ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      : 'text-purple-400 bg-purple-400/10 border-purple-400/20'
  }

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A'
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatLastConnected = (lastConnected?: Date) => {
    if (!lastConnected) return 'Never'
    return new Date(lastConnected).toLocaleString()
  }

  const isConnected = status?.status === 'connected'
  const isConnecting = status?.status === 'connecting'
  const canConnect = server.enabled && !isConnected && !isConnecting

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-foreground">
              {server.name}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full border ${getTransportBadgeColor(server.transport)}`}>
              {server.transport.toUpperCase()}
            </span>
            {!server.enabled && (
              <span className="px-2 py-1 text-xs rounded-full text-gray-400 bg-gray-400/10">
                DISABLED
              </span>
            )}
          </div>
          {server.description && (
            <p className="text-sm text-muted-foreground">
              {server.description}
            </p>
          )}
          {server.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {server.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status?.status)}`}>
            {status?.status || 'unknown'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Uptime</div>
          <div className="text-foreground font-medium">{formatUptime(status?.uptime)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Requests</div>
          <div className="text-foreground font-medium">{status?.requestCount || 0}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Errors</div>
          <div className="text-foreground font-medium">{status?.errorCount || 0}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Last Connected</div>
          <div className="text-foreground font-medium text-xs">{formatLastConnected(status?.lastConnected)}</div>
        </div>
      </div>

      {/* Capabilities */}
      {status?.capabilities && status.capabilities.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Capabilities</div>
          <div className="flex flex-wrap gap-2">
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

      {/* Error Display */}
      {status?.lastError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="text-sm font-medium text-red-800 dark:text-red-400">Last Error</div>
          <div className="text-sm text-red-700 dark:text-red-300 font-mono">{status.lastError}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex space-x-2">
          {canConnect && (
            <button
              onClick={() => onConnect?.(server.id)}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Connect
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => onDisconnect?.(server.id)}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={() => onTest?.(server.id)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Test
          </button>
          <button
            onClick={() => onEdit?.(server.id)}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete?.(server.id)}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          ID: {server.id.slice(-8)}
        </div>
      </div>
    </div>
  )
}