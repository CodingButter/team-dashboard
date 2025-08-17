import React from 'react'
import { AgentConfiguration, SystemPrompt, MCPServer } from '@team-dashboard/types'
import { AVAILABLE_MODELS } from '../constants/available-models'

interface ReviewStepProps {
  config: Partial<AgentConfiguration>
  systemPrompts: SystemPrompt[]
  mcpServers: MCPServer[]
  isCreating?: boolean
}

export function ReviewStep({ config, systemPrompts, mcpServers, isCreating }: ReviewStepProps) {
  const selectedModel = AVAILABLE_MODELS.find(m => m.model === config.model)
  const selectedPrompt = systemPrompts.find(p => p.id === config.systemPromptId)
  const selectedServers = mcpServers.filter(s => config.mcpServers?.includes(s.id))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Review Configuration</h3>
        <p className="text-muted-foreground mb-6">
          Review your agent configuration before creating it. Make sure all settings are correct.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <div className="border border-border rounded-md p-4">
          <h4 className="font-medium text-foreground mb-3">Basic Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="text-foreground">{config.name || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description:</span>
              <span className="text-foreground text-right max-w-xs truncate">
                {config.description || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Tokens:</span>
              <span className="text-foreground">{config.maxTokens || 1000}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperature:</span>
              <span className="text-foreground">{config.temperature || 0.7}</span>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="border border-border rounded-md p-4">
          <h4 className="font-medium text-foreground mb-3">AI Model</h4>
          {selectedModel ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="text-foreground">{selectedModel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <span className="text-foreground">{selectedModel.provider}</span>
              </div>
              <div className="text-muted-foreground text-xs">
                {selectedModel.description}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500">No model selected</p>
          )}
        </div>

        {/* System Prompt */}
        <div className="border border-border rounded-md p-4">
          <h4 className="font-medium text-foreground mb-3">System Prompt</h4>
          {selectedPrompt ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground">{selectedPrompt.name}</span>
              </div>
              <div className="text-muted-foreground text-xs">
                {selectedPrompt.description}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500">No system prompt selected</p>
          )}
        </div>

        {/* MCP Servers */}
        <div className="border border-border rounded-md p-4">
          <h4 className="font-medium text-foreground mb-3">MCP Servers</h4>
          {selectedServers.length > 0 ? (
            <div className="space-y-2">
              {selectedServers.map((server) => (
                <div key={server.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{server.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    server.status === 'connected' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {server.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No MCP servers selected</p>
          )}
        </div>

        {/* Permissions */}
        <div className="border border-border rounded-md p-4">
          <h4 className="font-medium text-foreground mb-3">Permissions</h4>
          {config.permissions ? (
            <div className="space-y-2 text-sm">
              {Object.entries(config.permissions).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span className={`text-sm ${value ? 'text-green-600' : 'text-red-600'}`}>
                    {value ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Default permissions</p>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            Creating your agent... This may take a few moments.
          </p>
        </div>
      )}
    </div>
  )
}