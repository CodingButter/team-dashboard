'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  AgentConfiguration, 
  MCPSystemPrompt as SystemPrompt, 
  MCPServer, 
  ToolApprovalRequest,
  ToolExecution,
  AgentModel,
  AgentStatus
} from '@team-dashboard/types'

export interface AgentInstance {
  id: string
  name: string
  model: AgentModel
  status: AgentStatus
  configuration: AgentConfiguration
  workspace: string
  uptime?: number
  lastActivity?: number
  cpu?: number
  memory?: number
  systemPrompt?: string
  logs: AgentLogEntry[]
  pendingApprovals: ToolApprovalRequest[]
  executionHistory: ToolExecution[]
  createdAt: number
  updatedAt: number
}

export interface AgentLogEntry {
  id: string
  agentId: string
  timestamp: number
  level: 'debug' | 'info' | 'warning' | 'error'
  message: string
  context?: any
}

export interface AgentStoreState {
  agents: Map<string, AgentInstance>
  systemPrompts: Map<string, SystemPrompt>
  mcpServers: Map<string, MCPServer>
  pendingApprovals: ToolApprovalRequest[]
  isLoading: boolean
  error: string | null
}

export interface AgentStoreActions {
  // Agent Management
  createAgent: (config: AgentConfiguration) => Promise<string>
  updateAgent: (agentId: string, updates: Partial<AgentInstance>) => void
  deleteAgent: (agentId: string) => Promise<void>
  startAgent: (agentId: string) => Promise<void>
  stopAgent: (agentId: string) => Promise<void>
  pauseAgent: (agentId: string) => Promise<void>
  resumeAgent: (agentId: string) => Promise<void>
  
  // System Prompt Management
  createSystemPrompt: (prompt: SystemPrompt) => void
  updateSystemPrompt: (promptId: string, updates: Partial<SystemPrompt>) => void
  deleteSystemPrompt: (promptId: string) => void
  
  // MCP Server Management
  addMCPServer: (server: MCPServer) => void
  updateMCPServer: (serverId: string, updates: Partial<MCPServer>) => void
  removeMCPServer: (serverId: string) => void
  testMCPServer: (server: MCPServer) => Promise<boolean>
  
  // Tool Approval Management
  approveToolExecution: (requestId: string, reasoning?: string) => Promise<void>
  denyToolExecution: (requestId: string, reasoning?: string) => Promise<void>
  
  // Logging
  addLog: (agentId: string, level: AgentLogEntry['level'], message: string, context?: any) => void
  clearLogs: (agentId: string) => void
  
  // Coordination
  assignTaskToAgent: (agentId: string, task: string) => Promise<void>
  handoffTask: (fromAgentId: string, toAgentId: string, context: any) => Promise<void>
  
  // State Management
  clearError: () => void
  refreshData: () => Promise<void>
}

export function useAgentStore(): AgentStoreState & AgentStoreActions {
  const [state, setState] = useState<AgentStoreState>({
    agents: new Map(),
    systemPrompts: new Map(),
    mcpServers: new Map(),
    pendingApprovals: [],
    isLoading: false,
    error: null
  })

  const agentCounterRef = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)

  // Mock data initialization
  useEffect(() => {
    const mockSystemPrompts = new Map([
      ['prompt-1', {
        id: 'prompt-1',
        name: 'General Assistant',
        content: 'You are a helpful AI assistant...',
        description: 'General purpose assistant prompt',
        tags: ['general', 'assistant'],
        isDefault: true,
        maxTokens: 4000,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        usage: { timesUsed: 0 }
      } as SystemPrompt]
    ])

    const mockMCPServers = new Map([
      ['server-1', {
        id: 'server-1',
        name: 'File System',
        command: 'npx @modelcontextprotocol/server-filesystem',
        args: ['/home/user'],
        env: {},
        status: 'connected',
        description: 'Provides file system access',
        capabilities: {
          tools: [
            {
              name: 'read_file',
              description: 'Read a file from the filesystem',
              inputSchema: {},
              dangerous: false
            },
            {
              name: 'write_file',
              description: 'Write a file to the filesystem',
              inputSchema: {},
              dangerous: true,
              requiresApproval: true
            }
          ]
        },
        credentials: { type: 'none' }
      } as MCPServer]
    ])

    setState(prev => ({
      ...prev,
      systemPrompts: mockSystemPrompts,
      mcpServers: mockMCPServers
    }))
  }, [])

  const updateState = useCallback((updater: (state: AgentStoreState) => AgentStoreState) => {
    setState(updater)
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    updateState(state => ({ ...state, isLoading: loading }))
  }, [updateState])

  const setError = useCallback((error: string | null) => {
    updateState(state => ({ ...state, error }))
  }, [updateState])

  // Agent Management
  const createAgent = useCallback(async (config: AgentConfiguration): Promise<string> => {
    setLoading(true)
    setError(null)

    try {
      const agentId = config.id || `agent-${++agentCounterRef.current}`
      
      const newAgent: AgentInstance = {
        id: agentId,
        name: config.name,
        model: config.model as AgentModel,
        status: 'stopped',
        configuration: config,
        workspace: config.workingDirectory || '/home/agent',
        logs: [],
        pendingApprovals: [],
        executionHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      updateState(state => ({
        ...state,
        agents: new Map(state.agents).set(agentId, newAgent)
      }))

      // Start the agent immediately
      await startAgent(agentId)
      
      return agentId
    } catch (error) {
      setError(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    } finally {
      setLoading(false)
    }
  }, [updateState, setLoading, setError])

  const updateAgent = useCallback((agentId: string, updates: Partial<AgentInstance>) => {
    updateState(state => {
      const agents = new Map(state.agents)
      const agent = agents.get(agentId)
      if (agent) {
        agents.set(agentId, { 
          ...agent, 
          ...updates, 
          updatedAt: Date.now() 
        })
      }
      return { ...state, agents }
    })
  }, [updateState])

  const deleteAgent = useCallback(async (agentId: string) => {
    setLoading(true)
    try {
      // Stop agent first
      await stopAgent(agentId)
      
      updateState(state => {
        const agents = new Map(state.agents)
        agents.delete(agentId)
        return { ...state, agents }
      })
    } catch (error) {
      setError(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [updateState, setLoading, setError])

  const startAgent = useCallback(async (agentId: string) => {
    updateAgent(agentId, { status: 'starting' })
    
    // Simulate startup delay
    setTimeout(() => {
      updateAgent(agentId, { 
        status: 'running',
        uptime: 0,
        lastActivity: Date.now()
      })
      addLog(agentId, 'info', 'Agent started successfully')
    }, 1000)
  }, [updateAgent])

  const stopAgent = useCallback(async (agentId: string) => {
    updateAgent(agentId, { status: 'stopping' })
    
    // Simulate shutdown delay
    setTimeout(() => {
      updateAgent(agentId, { 
        status: 'stopped',
        uptime: undefined,
        cpu: undefined,
        memory: undefined
      })
      addLog(agentId, 'info', 'Agent stopped')
    }, 500)
  }, [updateAgent])

  const pauseAgent = useCallback(async (agentId: string) => {
    updateAgent(agentId, { status: 'paused' })
    addLog(agentId, 'info', 'Agent paused')
  }, [updateAgent])

  const resumeAgent = useCallback(async (agentId: string) => {
    updateAgent(agentId, { 
      status: 'running',
      lastActivity: Date.now()
    })
    addLog(agentId, 'info', 'Agent resumed')
  }, [updateAgent])

  // System Prompt Management
  const createSystemPrompt = useCallback((prompt: SystemPrompt) => {
    updateState(state => ({
      ...state,
      systemPrompts: new Map(state.systemPrompts).set(prompt.id, prompt)
    }))
  }, [updateState])

  const updateSystemPrompt = useCallback((promptId: string, updates: Partial<SystemPrompt>) => {
    updateState(state => {
      const prompts = new Map(state.systemPrompts)
      const prompt = prompts.get(promptId)
      if (prompt) {
        prompts.set(promptId, { 
          ...prompt, 
          ...updates, 
          updatedAt: Date.now(),
          version: prompt.version + 1
        })
      }
      return { ...state, systemPrompts: prompts }
    })
  }, [updateState])

  const deleteSystemPrompt = useCallback((promptId: string) => {
    updateState(state => {
      const prompts = new Map(state.systemPrompts)
      prompts.delete(promptId)
      return { ...state, systemPrompts: prompts }
    })
  }, [updateState])

  // MCP Server Management
  const addMCPServer = useCallback((server: MCPServer) => {
    updateState(state => ({
      ...state,
      mcpServers: new Map(state.mcpServers).set(server.id, server)
    }))
  }, [updateState])

  const updateMCPServer = useCallback((serverId: string, updates: Partial<MCPServer>) => {
    updateState(state => {
      const servers = new Map(state.mcpServers)
      const server = servers.get(serverId)
      if (server) {
        servers.set(serverId, { ...server, ...updates })
      }
      return { ...state, mcpServers: servers }
    })
  }, [updateState])

  const removeMCPServer = useCallback((serverId: string) => {
    updateState(state => {
      const servers = new Map(state.mcpServers)
      servers.delete(serverId)
      return { ...state, mcpServers: servers }
    })
  }, [updateState])

  const testMCPServer = useCallback(async (server: MCPServer): Promise<boolean> => {
    // Simulate server test
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.3 // 70% success rate
        resolve(success)
      }, 2000)
    })
  }, [])

  // Tool Approval Management
  const approveToolExecution = useCallback(async (requestId: string, reasoning?: string) => {
    updateState(state => ({
      ...state,
      pendingApprovals: state.pendingApprovals.filter(req => req.id !== requestId)
    }))
    
    // Find the agent and add to execution history
    const request = state.pendingApprovals.find(req => req.id === requestId)
    if (request) {
      const execution: ToolExecution = {
        id: `exec-${Date.now()}`,
        toolName: request.toolName,
        serverId: request.serverId,
        agentId: request.agentId,
        input: request.input,
        status: 'approved',
        requestedAt: request.requestedAt,
        approvedAt: Date.now(),
        riskLevel: request.riskLevel,
        requiresApproval: true
      }
      
      updateAgent(request.agentId, {
        executionHistory: [...(state.agents.get(request.agentId)?.executionHistory || []), execution]
      })
      
      addLog(request.agentId, 'info', `Tool execution approved: ${request.toolName}`, { reasoning })
    }
  }, [updateState, updateAgent, state.pendingApprovals, state.agents])

  const denyToolExecution = useCallback(async (requestId: string, reasoning?: string) => {
    updateState(state => ({
      ...state,
      pendingApprovals: state.pendingApprovals.filter(req => req.id !== requestId)
    }))
    
    const request = state.pendingApprovals.find(req => req.id === requestId)
    if (request) {
      addLog(request.agentId, 'warning', `Tool execution denied: ${request.toolName}`, { reasoning })
    }
  }, [updateState, state.pendingApprovals])

  // Logging
  const addLog = useCallback((agentId: string, level: AgentLogEntry['level'], message: string, context?: any) => {
    const logEntry: AgentLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      timestamp: Date.now(),
      level,
      message,
      context
    }

    updateAgent(agentId, {
      logs: [...(state.agents.get(agentId)?.logs || []), logEntry].slice(-100) // Keep last 100 logs
    })
  }, [updateAgent, state.agents])

  const clearLogs = useCallback((agentId: string) => {
    updateAgent(agentId, { logs: [] })
  }, [updateAgent])

  // Coordination
  const assignTaskToAgent = useCallback(async (agentId: string, task: string) => {
    addLog(agentId, 'info', `Task assigned: ${task}`)
    updateAgent(agentId, { lastActivity: Date.now() })
  }, [addLog, updateAgent])

  const handoffTask = useCallback(async (fromAgentId: string, toAgentId: string, context: any) => {
    addLog(fromAgentId, 'info', `Task handed off to ${toAgentId}`, context)
    addLog(toAgentId, 'info', `Task received from ${fromAgentId}`, context)
    
    updateAgent(fromAgentId, { lastActivity: Date.now() })
    updateAgent(toAgentId, { lastActivity: Date.now() })
  }, [addLog, updateAgent])

  // State Management
  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      // Simulate data refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError])

  return {
    ...state,
    createAgent,
    updateAgent,
    deleteAgent,
    startAgent,
    stopAgent,
    pauseAgent,
    resumeAgent,
    createSystemPrompt,
    updateSystemPrompt,
    deleteSystemPrompt,
    addMCPServer,
    updateMCPServer,
    removeMCPServer,
    testMCPServer,
    approveToolExecution,
    denyToolExecution,
    addLog,
    clearLogs,
    assignTaskToAgent,
    handoffTask,
    clearError,
    refreshData
  }
}