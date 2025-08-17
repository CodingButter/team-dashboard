import React from 'react'
import { AgentConfiguration, MCPServer } from '@team-dashboard/types'

interface McpServerStepProps {
  config: Partial<AgentConfiguration>
  onUpdateConfig: (updates: Partial<AgentConfiguration>) => void
  mcpServers: MCPServer[]
}

export function McpServerStep({ config, onUpdateConfig, mcpServers }: McpServerStepProps) {
  const handleServerToggle = (serverId: string) => {
    const currentServers = config.mcpServers || []
    const isSelected = currentServers.includes(serverId)
    
    const updatedServers = isSelected
      ? currentServers.filter(id => id !== serverId)
      : [...currentServers, serverId]
    
    onUpdateConfig({ mcpServers: updatedServers })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">MCP Servers</h3>
        <p className="text-muted-foreground mb-6">
          Select the MCP servers that your agent will have access to. Each server provides different tools and capabilities.
        </p>
      </div>

      <div className="space-y-3">
        {mcpServers.map((server) => (
          <div
            key={server.id}
            className={`p-4 border rounded-md cursor-pointer transition-colors ${
              config.mcpServers?.includes(server.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-border hover:border-blue-300'
            }`}
            onClick={() => handleServerToggle(server.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium text-foreground">{server.name}</h5>
                  <span className={`px-2 py-1 text-xs rounded ${
                    server.status === 'connected' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {server.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{server.description}</p>
                
                {server.tools && server.tools.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Available Tools:</p>
                    <div className="flex flex-wrap gap-1">
                      {server.tools.slice(0, 5).map((tool, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded"
                        >
                          {tool.name}
                        </span>
                      ))}
                      {server.tools.length > 5 && (
                        <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                          +{server.tools.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <input
                type="checkbox"
                checked={config.mcpServers?.includes(server.id) || false}
                onChange={() => handleServerToggle(server.id)}
                className="w-4 h-4 text-blue-600"
              />
            </div>
          </div>
        ))}
        
        {mcpServers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No MCP servers available.</p>
            <p className="text-sm mt-1">You can add MCP servers from the MCP configuration page.</p>
          </div>
        )}
      </div>
    </div>
  )
}