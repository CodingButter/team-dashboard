/**
 * @package types
 * Core type definitions for Team Dashboard
 * 
 * CENTRALIZED TYPE MANAGEMENT (Issue #79)
 * This package is the single source of truth for all types:
 * - core/: Core domain types (Agent, Workflow, etc.)
 * - api/: REST API contracts organized by domain
 * - models/: Domain models and classes organized by area
 * - websocket/: WebSocket message types organized by purpose
 * - services/: Service-specific type definitions
 * - testing/: Type-safe mocks and test utilities
 */

// ===== CORE TYPES (Single Source of Truth) =====
// These are the canonical type definitions that all services MUST use

// Core Agent Types (replaces scattered Agent interfaces)
export type {
  Agent,
  AgentMetrics,
  ResourceLimits,
  CreateAgentRequest,
  AgentCommand,
  AgentCommandResponse,
  AgentListOptions,
  UpdateAgentRequest
} from './core/agent';

// Core Workflow Types (consolidates workflow types)
export {
  WorkflowState,
  TaskPriority
} from './core/workflow';
export type {
  Task,
  Workflow,
  WorkflowStatus,
  StateTransition,
  WorkflowProgress,
  TaskAssignmentRequest,
  CreateWorkflowRequest,
  UpdateTaskRequest
} from './core/workflow';

// ===== EXISTING MODELS (Maintained for backward compatibility) =====
export { AgentConnection, OutputBuffer } from './models/agent-connection';
export type { CommandHistoryEntry, OutputLine } from './models/agent-connection';
export { DashboardSession } from './models/session-management';

// Export agent process types
export type { 
  AgentSpawnConfig, 
  AgentProcess, 
  ResourceUsage, 
  PtyOptions,
  HealthCheckConfig,
  AgentHealthStatus,
  HealthCheck,
  AgentProcessEventData
} from './agent-process';

// ===== API TYPES =====
// Essential API types (shared across all services)
export type { AgentModel, AgentStatus, LogLevel, UserRole } from './api/common';

// Agent API endpoints (canonical API contracts)
export type { AgentApiEndpoints } from './api/agents';

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

// ===== WEBSOCKET & COMMUNICATION =====
export * from './websocket';
export * from './communication';

// ===== ERROR HANDLING =====
export { ErrorCode, DashboardError } from './error-codes';

// ===== SPECIALIZED TYPES =====
export * from './mcp';
export * from './prompts';

// ===== SERVICE-SPECIFIC EXPORTS =====
// Import these explicitly when needed by specific services
// Example: import type { OpenAIConfig } from '@team-dashboard/types/services/openai-service'

// ===== TESTING UTILITIES =====
// Import these for tests: import type { MockAgent } from '@team-dashboard/types/testing'

// Note: Service-specific and testing types are not exported from main index
// to prevent accidental usage across service boundaries