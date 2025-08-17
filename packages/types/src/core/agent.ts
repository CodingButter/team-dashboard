/**
 * Core Agent Type Definitions
 * Unified interface for all agent-related types across the platform
 * 
 * This is the single source of truth for Agent types.
 * All services MUST import Agent types from this module.
 */

import { AgentModel, AgentStatus } from '../api/common';

/**
 * Core Agent Interface - Single Source of Truth
 * Consolidates all Agent interface variations found across the codebase
 */
export interface Agent {
  id: string;
  name: string;
  model: AgentModel;
  status: AgentStatus;
  workspace: string;
  pid?: number;
  createdAt: string;
  startedAt?: string;
  stoppedAt?: string;
  lastActivity?: string;
  resourceLimits?: ResourceLimits;
  metrics?: AgentMetrics;
  tags?: string[];
  // Dashboard-specific fields (from mock-data.ts)
  description?: string;
  avatar?: string;
  // Terminal-specific fields
  terminalId?: string;
}

/**
 * Agent Resource Limits
 */
export interface ResourceLimits {
  memory: number; // MB
  cpu: number;    // Cores
  timeout?: number; // Seconds
}

/**
 * Agent Performance Metrics
 */
export interface AgentMetrics {
  cpu: number;          // Percentage
  memory: number;       // MB
  threads: number;
  handles?: number;
  uptime: number;       // Seconds
  apiCalls: number;
  tokensUsed: number;
  totalCost?: number;   // USD
}

/**
 * Agent Creation Request
 */
export interface CreateAgentRequest {
  name: string;
  model: AgentModel;
  workspace: string;
  description?: string;
  environment?: Record<string, string>;
  resourceLimits?: Partial<ResourceLimits>;
  tags?: string[];
  autoStart?: boolean;
}

/**
 * Agent Command Execution
 */
export interface AgentCommand {
  command: string;
  interactive?: boolean;
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

/**
 * Agent Command Response
 */
export interface AgentCommandResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timedOut: boolean;
  timestamp: string;
}

/**
 * Agent List Query Options
 */
export interface AgentListOptions {
  status?: AgentStatus;
  model?: AgentModel;
  workspace?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Agent Update Request
 */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  resourceLimits?: Partial<ResourceLimits>;
  tags?: string[];
}