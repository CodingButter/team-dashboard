/**
 * @package types/mcp
 * MCP (Model Context Protocol) server configuration types
 */

// Base types and interfaces
export * from './base';

// Server templates and catalog
export * from './templates';

// API contracts
export * from './api';

// Re-export commonly used types for convenience
export type {
  McpServer,
  McpServerConfig,
  McpStdioConfig,
  McpHttpConfig,
  McpServerStatus as McpStatus,
  McpServerTemplate,
  McpCategory
} from './base';

export type {
  CreateMcpServerRequest,
  UpdateMcpServerRequest,
  McpServerFilters,
  McpApiEndpoints
} from './api';