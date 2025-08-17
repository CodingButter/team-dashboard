'use client'

import React, { useState, useEffect } from 'react'
import { McpServer, McpServerStatus, McpServerTemplate } from '@team-dashboard/types'
import { 
  McpServerCard, 
  McpServerForm, 
  McpMarketplace
} from '@/components/mcp'

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [serverStatuses, setServerStatuses] = useState<Record<string, McpServerStatus>>({})
  const [activeTab, setActiveTab] = useState<'servers' | 'marketplace'>('servers')
  const [showForm, setShowForm] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock data for development - replace with actual API calls
  useEffect(() => {
    // Load initial data
    loadServers()
    loadServerStatuses()
    
    // Set up status polling
    const statusInterval = setInterval(loadServerStatuses, 5000)
    return () => clearInterval(statusInterval)
  }, [])

  const loadServers = async () => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch('/api/mcp/servers')
      // const data = await response.json()
      // setServers(data.data)
      
      // Mock data for now
      setServers([])
    } catch (error) {
      console.error('Failed to load servers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadServerStatuses = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/mcp/status')
      // const data = await response.json()
      // const statusMap = data.data.reduce((acc: any, status: McpServerStatus) => {
      //   acc[status.serverId] = status
      //   return acc
      // }, {})
      // setServerStatuses(statusMap)
    } catch (error) {
      console.error('Failed to load server statuses:', error)
    }
  }

  const handleCreateServer = async (serverData: Partial<McpServer>) => {
    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch('/api/mcp/servers', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(serverData)
      // })
      // const data = await response.json()
      // setServers(prev => [...prev, data.data])
      
      // Mock for now
      const newServer: McpServer = {
        id: `mcp_${Date.now()}`,
        name: serverData.name!,
        description: serverData.description,
        transport: serverData.transport!,
        enabled: serverData.enabled ?? true,
        autoConnect: serverData.autoConnect ?? false,
        environment: serverData.environment || [],
        tags: serverData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...serverData
      } as McpServer
      
      setServers(prev => [...prev, newServer])
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create server:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateServer = async (serverData: Partial<McpServer>) => {
    if (!editingServer) return

    try {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/mcp/servers/${editingServer.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(serverData)
      // })
      // const data = await response.json()
      
      // Mock for now
      const updatedServer: McpServer = { ...editingServer, ...serverData, updatedAt: new Date() } as McpServer
      setServers(prev => prev.map(s => s.id === editingServer.id ? updatedServer : s))
      setEditingServer(null)
      setShowForm(false)
    } catch (error) {
      console.error('Failed to update server:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' })
      
      setServers(prev => prev.filter(s => s.id !== serverId))
      delete serverStatuses[serverId]
      setServerStatuses({ ...serverStatuses })
    } catch (error) {
      console.error('Failed to delete server:', error)
    }
  }

  const handleConnectServer = async (serverId: string) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/mcp/servers/${serverId}/connect`, { method: 'POST' })
      
      // Mock status update
      setServerStatuses(prev => ({
        ...prev,
        [serverId]: {
          serverId,
          status: 'connecting',
          lastConnected: new Date()
        }
      }))
    } catch (error) {
      console.error('Failed to connect server:', error)
    }
  }

  const handleDisconnectServer = async (serverId: string) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/mcp/servers/${serverId}/disconnect`, { method: 'POST' })
      
      // Mock status update
      setServerStatuses(prev => ({
        ...prev,
        [serverId]: {
          ...prev[serverId],
          status: 'disconnected'
        }
      }))
    } catch (error) {
      console.error('Failed to disconnect server:', error)
    }
  }

  const handleTestServer = async (_serverId: string) => {
    try {
      // TODO: Replace with actual API call
      alert('Test connection feature will be implemented with the backend API')
    } catch (error) {
      console.error('Failed to test server:', error)
    }
  }

  const handleInstallTemplate = (_template: McpServerTemplate) => {
    setEditingServer(null)
    setActiveTab('servers')
    setShowForm(true)
    
    // Pre-populate form with template data
    // This will be handled by the McpServerForm component
  }

  const connectedCount = Object.values(serverStatuses).filter(s => s.status === 'connected').length
  const errorCount = Object.values(serverStatuses).filter(s => s.status === 'error').length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">MCP Server Management</h1>
            <p className="text-muted-foreground mt-1">
              Configure and manage Model Context Protocol servers for your agents
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Status Summary */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{connectedCount} Connected</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span>{errorCount} Errors</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>{servers.length} Total</span>
              </div>
            </div>
            
            {activeTab === 'servers' && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Add Server
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('servers')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'servers'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Servers ({servers.length})
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'marketplace'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Marketplace
          </button>
        </div>

        {/* Content */}
        {showForm ? (
          <McpServerForm
            server={editingServer || undefined}
            onSave={editingServer ? handleUpdateServer : handleCreateServer}
            onCancel={() => {
              setShowForm(false)
              setEditingServer(null)
            }}
            isLoading={isLoading}
          />
        ) : activeTab === 'servers' ? (
          <div className="space-y-6">
            {servers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  No MCP servers configured yet.
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Add Your First Server
                  </button>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    Browse Marketplace
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {servers.map((server) => (
                  <McpServerCard
                    key={server.id}
                    server={server}
                    status={serverStatuses[server.id]}
                    onConnect={handleConnectServer}
                    onDisconnect={handleDisconnectServer}
                    onEdit={(id: string) => {
                      setEditingServer(servers.find(s => s.id === id) || null)
                      setShowForm(true)
                    }}
                    onDelete={handleDeleteServer}
                    onTest={handleTestServer}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <McpMarketplace onInstall={handleInstallTemplate} />
        )}
      </div>
    </div>
  )
}