/**
 * @package types/mcp
 * Base MCP server types and interfaces
 */

// Re-export template types for convenience
export type { McpServerTemplate, McpCategory } from './templates';

/** Transport protocols supported by MCP servers */
export type McpTransport = 'stdio' | 'http+sse';

/** Status of an MCP server */
export type McpStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Environment variable configuration */
export interface McpEnvironmentVariable {
  key: string;
  value: string;
  encrypted: boolean;
  required: boolean;
}

/** Base MCP server configuration */
export interface McpServerConfig {
  id: string;
  name: string;
  description?: string;
  transport: McpTransport;
  enabled: boolean;
  autoConnect: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  environment: McpEnvironmentVariable[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** STDIO transport specific configuration */
export interface McpStdioConfig extends McpServerConfig {
  transport: 'stdio';
  command: string;
  args: string[];
  workingDirectory?: string;
}

/** HTTP+SSE transport specific configuration */
export interface McpHttpConfig extends McpServerConfig {
  transport: 'http+sse';
  baseUrl: string;
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key';
    credentials: Record<string, string>;
  };
}

/** Union type for all MCP server configurations */
export type McpServer = McpStdioConfig | McpHttpConfig;

/** Runtime status information for an MCP server */
export interface McpServerStatus {
  serverId: string;
  status: McpStatus;
  lastConnected?: Date;
  lastError?: string;
  capabilities?: string[];
  tools?: string[];
  resources?: string[];
  prompts?: string[];
  uptime?: number;
  requestCount?: number;
  errorCount?: number;
}

/** MCP server health check result */
export interface McpHealthCheck {
  serverId: string;
  healthy: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}