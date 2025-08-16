export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  version: string;
  category: PromptCategory;
  variables: PromptVariable[];
  metadata: PromptMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  variables: PromptVariable[];
  category: PromptCategory;
  tags: string[];
  usageCount: number;
  rating: number;
  isPublic: boolean;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  defaultValue?: any;
  required: boolean;
  validation?: PromptVariableValidation;
}

export interface PromptVariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
}

export interface PromptMetadata {
  author: string;
  license: string;
  source: 'user' | 'claude_code' | 'community' | 'official';
  performance: {
    successRate: number;
    averageTokens: number;
    averageResponseTime: number;
  };
  usage: {
    totalUses: number;
    lastUsed: Date;
    popularityScore: number;
  };
}

export type PromptCategory = 
  | 'system'
  | 'coding'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'testing'
  | 'documentation'
  | 'security'
  | 'custom';

export interface PromptExecution {
  id: string;
  promptId: string;
  agentId: string;
  variables: Record<string, any>;
  generatedPrompt: string;
  tokensUsed: number;
  executionTime: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}

export interface PromptLibrary {
  id: string;
  name: string;
  description: string;
  prompts: SystemPrompt[];
  isDefault: boolean;
  isPublic: boolean;
  owner: string;
}