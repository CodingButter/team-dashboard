/**
 * Agent Management API Contracts
 * Types for agent lifecycle and command execution
 */

import { AgentModel, AgentStatus, ApiResponse } from './common';

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
  resourceLimits?: {
    memory: number; // MB
    cpu: number;    // Cores
  };
  metrics?: AgentMetrics;
  tags?: string[];
}

export interface AgentMetrics {
  cpu: number;          // Percentage
  memory: number;       // MB
  threads: number;
  handles?: number;
  uptime: number;       // Seconds
  apiCalls: number;
  tokensUsed: number;
}

export interface CreateAgentRequest {
  name: string;
  model: AgentModel;
  workspace: string;
  environment?: Record<string, string>;
  resourceLimits?: {
    memory?: number;
    cpu?: number;
  };
  tags?: string[];
  autoStart?: boolean;
}

export interface AgentCommand {
  command: string;
  interactive?: boolean;
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface AgentCommandResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timedOut: boolean;
}

// Agent API Endpoints
export interface AgentApiEndpoints {
  'GET /api/agents': () => Promise<ApiResponse<Agent[]>>;
  'GET /api/agents/:id': (id: string) => Promise<ApiResponse<Agent>>;
  'POST /api/agents': (body: CreateAgentRequest) => Promise<ApiResponse<Agent>>;
  'DELETE /api/agents/:id': (id: string) => Promise<ApiResponse<void>>;
  'POST /api/agents/:id/command': (id: string, body: AgentCommand) => Promise<ApiResponse<AgentCommandResponse>>;
  'POST /api/agents/:id/start': (id: string) => Promise<ApiResponse<void>>;
  'POST /api/agents/:id/stop': (id: string) => Promise<ApiResponse<void>>;
  'POST /api/agents/:id/restart': (id: string) => Promise<ApiResponse<void>>;
}