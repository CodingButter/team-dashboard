/**
 * @package types
 * Core type definitions for Team Dashboard
 * 
 * This package now uses a modular organization:
 * - api/: REST API contracts organized by domain
 * - models/: Domain models and classes organized by area
 * - websocket/: WebSocket message types organized by purpose
 */

// Export essential models that are needed immediately
export { AgentConnection, OutputBuffer } from './models/agent-connection';
export type { CommandHistoryEntry, OutputLine } from './models/agent-connection';
export { DashboardSession } from './models/session-management';

// Export agent process types
export type { 
  AgentSpawnConfig, 
  AgentProcess, 
  ResourceUsage, 
  PtyOptions,
  ResourceLimits,
  HealthCheckConfig,
  AgentHealthStatus,
  HealthCheck,
  AgentProcessEventData
} from './agent-process';

// Export essential API types
export type { AgentModel, AgentStatus, LogLevel, UserRole } from './api/common';

// Export MCP types
export type { 
  MCPServer, 
  MCPCapabilities, 
  MCPTool, 
  MCPResource, 
  MCPPrompt, 
  MCPCredentials,
  ToolExecution,
  ToolApprovalRequest,
  SystemPrompt as MCPSystemPrompt,
  AgentConfiguration
} from './api/mcp';

// Export WebSocket types
export * from './websocket';

// Export error codes
export { ErrorCode, DashboardError } from './error-codes';

// Export MCP types
export * from './mcp';

// Export communication types
export * from './communication';

// Export Prompts types
export * from './prompts';

// Export validation pipeline for agent message security
export * from './validation';
