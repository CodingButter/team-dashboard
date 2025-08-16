/**
 * @package types/mcp
 * MCP API contracts and request/response types
 */

import { McpServer, McpServerStatus, McpHealthCheck } from './base';
import { McpServerTemplate } from './templates';
import { ApiResponse, PaginatedResponse } from '../api/common';

/** Create MCP server request */
export interface CreateMcpServerRequest {
  templateId?: string;
  name: string;
  description?: string;
  transport: 'stdio' | 'http+sse';
  config: Record<string, any>;
  environment: Array<{
    key: string;
    value: string;
    encrypted?: boolean;
  }>;
  enabled?: boolean;
  autoConnect?: boolean;
  tags?: string[];
}

/** Update MCP server request */
export interface UpdateMcpServerRequest {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  environment?: Array<{
    key: string;
    value: string;
    encrypted?: boolean;
  }>;
  enabled?: boolean;
  autoConnect?: boolean;
  tags?: string[];
}

/** MCP server list filters */
export interface McpServerFilters {
  enabled?: boolean;
  transport?: 'stdio' | 'http+sse';
  status?: 'connected' | 'disconnected' | 'error';
  category?: string;
  tags?: string[];
  search?: string;
}

/** MCP server connection request */
export interface McpServerConnectionRequest {
  serverId: string;
  force?: boolean;
}

/** MCP server test connection request */
export interface McpServerTestRequest {
  config: Record<string, any>;
  environment: Array<{
    key: string;
    value: string;
  }>;
  timeout?: number;
}

/** MCP server health check response */
export interface McpServerHealthResponse extends ApiResponse {
  data: McpHealthCheck;
}

/** MCP server list response */
export interface McpServerListResponse extends PaginatedResponse<McpServer> {
}

/** MCP server detail response */
export interface McpServerDetailResponse extends ApiResponse<McpServer & {
    status: McpServerStatus;
    health?: McpHealthCheck;
}> {}

/** MCP server status response */
export interface McpServerStatusResponse extends ApiResponse {
  data: McpServerStatus[];
}

/** MCP server templates response */
export interface McpServerTemplatesResponse extends ApiResponse {
  data: McpServerTemplate[];
}

/** MCP server test connection response */
export interface McpServerTestResponse extends ApiResponse {
  data: {
    success: boolean;
    capabilities?: string[];
    tools?: string[];
    resources?: string[];
    error?: string;
    latency?: number;
  };
}

/** MCP API endpoints interface */
export interface McpApiEndpoints {
  // Server management
  'GET /api/mcp/servers': {
    query?: McpServerFilters & { page?: number; limit?: number };
    response: McpServerListResponse;
  };
  
  'POST /api/mcp/servers': {
    body: CreateMcpServerRequest;
    response: McpServerDetailResponse;
  };
  
  'GET /api/mcp/servers/:id': {
    response: McpServerDetailResponse;
  };
  
  'PUT /api/mcp/servers/:id': {
    body: UpdateMcpServerRequest;
    response: McpServerDetailResponse;
  };
  
  'DELETE /api/mcp/servers/:id': {
    response: ApiResponse;
  };

  // Server operations
  'POST /api/mcp/servers/:id/connect': {
    body?: McpServerConnectionRequest;
    response: ApiResponse;
  };
  
  'POST /api/mcp/servers/:id/disconnect': {
    response: ApiResponse;
  };
  
  'POST /api/mcp/servers/:id/test': {
    body: McpServerTestRequest;
    response: McpServerTestResponse;
  };
  
  'GET /api/mcp/servers/:id/health': {
    response: McpServerHealthResponse;
  };

  // Templates and discovery
  'GET /api/mcp/templates': {
    query?: { category?: string; search?: string };
    response: McpServerTemplatesResponse;
  };
  
  'GET /api/mcp/status': {
    response: McpServerStatusResponse;
  };
}