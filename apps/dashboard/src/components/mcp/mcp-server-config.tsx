'use client'

import React, { useState, useCallback } from 'react'
import { MCPServer, MCPCredentials, MCPTool } from '@team-dashboard/types'

interface MCPServerConfigProps {
  server?: MCPServer
  onSave: (server: MCPServer) => void
  onCancel: () => void
  onTest?: (server: MCPServer) => Promise<boolean>
  isEditing?: boolean
}

export function MCPServerConfig({ 
  server, 
  onSave, 
  onCancel, 
  onTest,
  isEditing = false 
}: MCPServerConfigProps) {
  const [formData, setFormData] = useState<Partial<MCPServer>>({
    id: server?.id || '',
    name: server?.name || '',
    command: server?.command || '',
    args: server?.args || [],
    env: server?.env || {},
    description: server?.description || '',
    credentials: server?.credentials || { type: 'none' },
    status: server?.status || 'disconnected'
  })

  const [argsInput, setArgsInput] = useState(server?.args?.join(' ') || '')
  const [envInput, setEnvInput] = useState(
    Object.entries(server?.env || {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
  )
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleInputChange = useCallback((field: keyof MCPServer, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCredentialsChange = useCallback((credentials: Partial<MCPCredentials>) => {
    setFormData(prev => ({
      ...prev,
      credentials: { ...prev.credentials, ...credentials } as MCPCredentials
    }))
  }, [])

  const parseArgs = useCallback((input: string): string[] => {
    return input.trim().split(/\s+/).filter(arg => arg.length > 0)
  }, [])

  const parseEnv = useCallback((input: string): Record<string, string> => {
    const env: Record<string, string> = {}
    input.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        env[key.trim()] = valueParts.join('=').trim()
      }
    })
    return env
  }, [])

  const handleTest = useCallback(async () => {
    if (!onTest) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const testServer: MCPServer = {
        ...formData,
        id: formData.id || `test-${Date.now()}`,
        name: formData.name || 'Test Server',
        command: formData.command || '',
        args: parseArgs(argsInput),
        env: parseEnv(envInput),
        status: 'connecting'
      } as MCPServer

      const success = await onTest(testServer)
      setTestResult({
        success,
        message: success ? 'Connection successful!' : 'Connection failed - check configuration'
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsTesting(false)
    }
  }, [formData, argsInput, envInput, onTest, parseArgs, parseEnv])

  const handleSave = useCallback(() => {
    const serverToSave: MCPServer = {
      ...formData,
      id: formData.id || `server-${Date.now()}`,
      name: formData.name || 'Unnamed Server',
      command: formData.command || '',
      args: parseArgs(argsInput),
      env: parseEnv(envInput),
      status: formData.status || 'disconnected'
    } as MCPServer

    onSave(serverToSave)
  }, [formData, argsInput, envInput, onSave, parseArgs, parseEnv])

  const renderCredentialsForm = () => {
    const { credentials } = formData

    switch (credentials?.type) {
      case 'api_key':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                API Key
              </label>
              <input
                type="password"
                value={credentials.apiKey || ''}
                onChange={(e) => handleCredentialsChange({ apiKey: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Enter your API key"
              />
            </div>
          </div>
        )

      case 'basic_auth':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Username
              </label>
              <input
                type="text"
                value={credentials.username || ''}
                onChange={(e) => handleCredentialsChange({ username: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                value={credentials.password || ''}
                onChange={(e) => handleCredentialsChange({ password: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Password"
              />
            </div>
          </div>
        )

      case 'oauth':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={credentials.clientId || ''}
                onChange={(e) => handleCredentialsChange({ clientId: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Client ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={credentials.clientSecret || ''}
                onChange={(e) => handleCredentialsChange({ clientSecret: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Client Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Token URL
              </label>
              <input
                type="url"
                value={credentials.tokenUrl || ''}
                onChange={(e) => handleCredentialsChange({ tokenUrl: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="https://api.example.com/oauth/token"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No credentials required for this server
          </div>
        )
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
        </h3>
        <div className="flex space-x-2">
          {onTest && (
            <button
              onClick={handleTest}
              disabled={isTesting || !formData.command}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded transition-colors"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!formData.name || !formData.command}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 rounded-md ${
          testResult.success 
            ? 'bg-green-900/20 border border-green-500/20 text-green-400'
            : 'bg-red-900/20 border border-red-500/20 text-red-400'
        }`}>
          {testResult.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Basic Configuration</h4>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Server Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="My MCP Server"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Command *
            </label>
            <input
              type="text"
              value={formData.command || ''}
              onChange={(e) => handleInputChange('command', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground font-mono"
              placeholder="npx @modelcontextprotocol/server-example"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Arguments
            </label>
            <input
              type="text"
              value={argsInput}
              onChange={(e) => setArgsInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground font-mono"
              placeholder="--port 3000 --verbose"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Space-separated command line arguments
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              rows={3}
              placeholder="Brief description of what this server provides"
            />
          </div>
        </div>

        {/* Advanced Configuration */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Advanced Configuration</h4>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Environment Variables
            </label>
            <textarea
              value={envInput}
              onChange={(e) => setEnvInput(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground font-mono"
              rows={4}
              placeholder={`API_KEY=your-key\nDEBUG=true\nPORT=3001`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              One environment variable per line in KEY=value format
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Authentication Type
            </label>
            <select
              value={formData.credentials?.type || 'none'}
              onChange={(e) => handleCredentialsChange({ 
                type: e.target.value as MCPCredentials['type'] 
              })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="none">No Authentication</option>
              <option value="api_key">API Key</option>
              <option value="basic_auth">Basic Auth</option>
              <option value="oauth">OAuth 2.0</option>
            </select>
          </div>

          {renderCredentialsForm()}
        </div>
      </div>

      {/* Server Status */}
      {isEditing && server && (
        <div className="border-t border-border pt-4">
          <h4 className="text-md font-medium text-foreground mb-3">Server Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className={`font-medium ${
                server.status === 'connected' ? 'text-green-400' :
                server.status === 'connecting' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {server.status}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Version</div>
              <div className="font-medium">{server.version || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Tools</div>
              <div className="font-medium">{server.capabilities?.tools?.length || 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Connected</div>
              <div className="font-medium">
                {server.lastConnected 
                  ? new Date(server.lastConnected).toLocaleTimeString()
                  : 'Never'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}