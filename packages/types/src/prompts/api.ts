import { SystemPrompt, PromptTemplate } from './base';

// API Request/Response types for prompt management

export interface CreatePromptRequest {
  name: string;
  description: string;
  content: string;
  category: string;
  variables: Array<{
    name: string;
    type: string;
    description: string;
    defaultValue?: any;
    required: boolean;
  }>;
  isPublic?: boolean;
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
  version?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  basePrompt: string;
  category: string;
  variables: Array<{
    name: string;
    type: string;
    description: string;
    defaultValue?: any;
    required: boolean;
  }>;
  tags: string[];
  isPublic?: boolean;
}

export interface ExecutePromptRequest {
  promptId: string;
  agentId: string;
  variables: Record<string, any>;
  modelSettings?: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface PromptExecutionResponse {
  id: string;
  generatedPrompt: string;
  tokensUsed: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface ListPromptsRequest {
  category?: string;
  search?: string;
  tags?: string[];
  author?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ListPromptsResponse {
  prompts: SystemPrompt[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListTemplatesRequest {
  category?: string;
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ListTemplatesResponse {
  templates: PromptTemplate[];
  total: number;
  limit: number;
  offset: number;
}

export interface PromptAnalyticsRequest {
  promptId?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface PromptAnalyticsResponse {
  totalExecutions: number;
  successRate: number;
  averageTokens: number;
  averageResponseTime: number;
  costAnalysis: {
    totalCost: number;
    costPerExecution: number;
    costTrend: Array<{
      date: string;
      cost: number;
      executions: number;
    }>;
  };
  popularPrompts: Array<{
    id: string;
    name: string;
    usageCount: number;
    successRate: number;
  }>;
  performanceMetrics: Array<{
    date: string;
    executions: number;
    successRate: number;
    averageTokens: number;
    averageResponseTime: number;
  }>;
}

export interface CreateLibraryRequest {
  name: string;
  description: string;
  promptIds: string[];
  isPublic?: boolean;
}

export interface UpdateLibraryRequest extends Partial<CreateLibraryRequest> {
  id: string;
}

export interface ImportPromptsRequest {
  source: 'claude_code' | 'file' | 'url';
  data: string | File;
  overwrite?: boolean;
  library?: string;
}

export interface ImportPromptsResponse {
  imported: number;
  skipped: number;
  errors: Array<{
    prompt: string;
    error: string;
  }>;
  prompts: SystemPrompt[];
}

export interface ExportPromptsRequest {
  promptIds?: string[];
  libraryId?: string;
  format: 'json' | 'yaml' | 'csv';
  includeMetadata?: boolean;
}

export interface ExportPromptsResponse {
  data: string | Blob;
  filename: string;
  contentType: string;
}

// WebSocket events for real-time prompt updates
export interface PromptWebSocketEvents {
  // Client to server
  'prompt:subscribe': { promptId: string };
  'prompt:unsubscribe': { promptId: string };
  'execution:start': ExecutePromptRequest;
  'execution:cancel': { executionId: string };

  // Server to client
  'prompt:updated': SystemPrompt;
  'prompt:deleted': { id: string };
  'execution:progress': {
    executionId: string;
    stage: 'validating' | 'generating' | 'executing' | 'completed';
    progress: number;
    message?: string;
  };
  'execution:completed': PromptExecutionResponse;
  'execution:error': {
    executionId: string;
    error: string;
  };
  'analytics:updated': {
    promptId: string;
    metrics: {
      usageCount: number;
      successRate: number;
      averageTokens: number;
    };
  };
}

// REST API endpoints
export const PROMPT_API_ENDPOINTS = {
  // Prompts
  GET_PROMPTS: '/api/prompts',
  GET_PROMPT: '/api/prompts/:id',
  CREATE_PROMPT: '/api/prompts',
  UPDATE_PROMPT: '/api/prompts/:id',
  DELETE_PROMPT: '/api/prompts/:id',
  DUPLICATE_PROMPT: '/api/prompts/:id/duplicate',

  // Templates
  GET_TEMPLATES: '/api/prompts/templates',
  GET_TEMPLATE: '/api/prompts/templates/:id',
  CREATE_TEMPLATE: '/api/prompts/templates',
  UPDATE_TEMPLATE: '/api/prompts/templates/:id',
  DELETE_TEMPLATE: '/api/prompts/templates/:id',

  // Execution
  EXECUTE_PROMPT: '/api/prompts/:id/execute',
  GET_EXECUTIONS: '/api/prompts/:id/executions',
  GET_EXECUTION: '/api/executions/:id',
  CANCEL_EXECUTION: '/api/executions/:id/cancel',

  // Analytics
  GET_ANALYTICS: '/api/prompts/analytics',
  GET_PROMPT_ANALYTICS: '/api/prompts/:id/analytics',

  // Libraries
  GET_LIBRARIES: '/api/prompts/libraries',
  GET_LIBRARY: '/api/prompts/libraries/:id',
  CREATE_LIBRARY: '/api/prompts/libraries',
  UPDATE_LIBRARY: '/api/prompts/libraries/:id',
  DELETE_LIBRARY: '/api/prompts/libraries/:id',

  // Import/Export
  IMPORT_PROMPTS: '/api/prompts/import',
  EXPORT_PROMPTS: '/api/prompts/export',

  // Validation
  VALIDATE_PROMPT: '/api/prompts/validate',
  PREVIEW_PROMPT: '/api/prompts/preview'
} as const;