/**
 * API Contracts Index
 * Consolidated exports of all API contract modules
 */

// Re-export all common types
export * from './common';

// Re-export domain-specific contracts
export * from './agents';
export * from './system';
export * from './graph';
export * from './auth';
export * from './tasks';
export * from './github';
export * from './logs';
export * from './alerts';
export * from './csv';

// Import endpoint interfaces for consolidated API client
import { AgentApiEndpoints } from './agents';
import { SystemApiEndpoints } from './system';
import { GraphApiEndpoints } from './graph';
import { AuthApiEndpoints, SessionApiEndpoints } from './auth';
import { TaskApiEndpoints } from './tasks';
import { LogsApiEndpoints } from './logs';
import { AlertsApiEndpoints } from './alerts';
import { McpApiEndpoints } from '../mcp/api';

// Combined API client interface
export interface ApiEndpoints extends
  AgentApiEndpoints,
  SystemApiEndpoints,
  GraphApiEndpoints,
  AuthApiEndpoints,
  SessionApiEndpoints,
  TaskApiEndpoints,
  LogsApiEndpoints,
  AlertsApiEndpoints,
  McpApiEndpoints {}

// Export type-safe API client interface
export type ApiClient = ApiEndpoints;