/**
 * MCP (Model Context Protocol) Server Configuration Types
 * Types for managing MCP servers, tools, and permissions
 */

export interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  status: 'connected' | 'disconnected' | 'error' | 'connecting'
  version?: string
  description?: string
  capabilities?: MCPCapabilities
  credentials?: MCPCredentials
  lastConnected?: number
  errorMessage?: string
}

export interface MCPCapabilities {
  tools?: MCPTool[]
  resources?: MCPResource[]
  prompts?: MCPPrompt[]
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: any // JSON Schema
  dangerous?: boolean
  requiresApproval?: boolean
  category?: string
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPPrompt {
  name: string
  description: string
  arguments?: MCPPromptArgument[]
}

export interface MCPPromptArgument {
  name: string
  description: string
  required?: boolean
}

export interface MCPCredentials {
  type: 'api_key' | 'oauth' | 'basic_auth' | 'none'
  apiKey?: string
  username?: string
  password?: string
  tokenUrl?: string
  clientId?: string
  clientSecret?: string
}

export interface ToolExecution {
  id: string
  toolName: string
  serverId: string
  agentId: string
  input: any
  output?: any
  status: 'pending' | 'approved' | 'denied' | 'executing' | 'completed' | 'failed'
  requestedAt: number
  approvedAt?: number
  completedAt?: number
  approvedBy?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresApproval: boolean
  errorMessage?: string
}

export interface ToolApprovalRequest {
  id: string
  toolName: string
  serverId: string
  agentId: string
  agentName: string
  input: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  requestedAt: number
  context?: string
  workingDirectory?: string
}

export interface SystemPrompt {
  id: string
  name: string
  content: string
  version: number
  description?: string
  tags: string[]
  category?: string
  variables?: Record<string, any>
  metadata?: Record<string, any>
  isDefault: boolean
  maxTokens: number
  createdAt: number
  updatedAt: number
  createdBy: string
  usage: {
    timesUsed: number
    lastUsed?: number
    averageRating?: number
  }
}

export interface AgentConfiguration {
  id: string
  name: string
  model: string
  systemPromptId: string
  mcpServers: string[]
  toolPermissions: Record<string, 'always_allow' | 'always_deny' | 'require_approval'>
  maxTokens?: number
  temperature?: number
  workingDirectory?: string
  environment?: Record<string, string>
  resourceLimits?: {
    maxMemory?: number
    maxCpu?: number
    timeout?: number
  }
}