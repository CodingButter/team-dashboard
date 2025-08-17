/**
 * Type-Safe Mock Definitions
 * Ensures test mocks match production types exactly
 * 
 * Import mock types from @team-dashboard/types/testing
 */

import { Agent, AgentMetrics, CreateAgentRequest } from '../core/agent';
import { Task, Workflow, WorkflowState, TaskPriority } from '../core/workflow';
import { OpenAIConfig, ConversationMemory } from '../services/openai-service';

/**
 * Mock Agent Factory
 */
export interface MockAgentOptions {
  id?: string;
  name?: string;
  status?: Agent['status'];
  model?: Agent['model'];
  withMetrics?: boolean;
  withTerminal?: boolean;
}

/**
 * Mock Agent Generator
 */
export type MockAgent = (options?: MockAgentOptions) => Agent;

/**
 * Standard Mock Agent Data
 */
export const DEFAULT_MOCK_AGENT: Agent = {
  id: 'test-agent-1',
  name: 'Test Agent',
  model: 'claude-3-sonnet',
  status: 'running',
  workspace: '/tmp/test-workspace',
  createdAt: new Date().toISOString(),
  description: 'A test agent for development',
  tags: ['test', 'development']
};

/**
 * Mock Agent Metrics
 */
export const DEFAULT_MOCK_METRICS: AgentMetrics = {
  cpu: 25.5,
  memory: 512,
  threads: 4,
  handles: 128,
  uptime: 3600,
  apiCalls: 42,
  tokensUsed: 1500,
  totalCost: 0.05
};

/**
 * Mock Task Factory
 */
export interface MockTaskOptions {
  id?: string;
  state?: WorkflowState;
  priority?: TaskPriority;
  assignedAgent?: string;
}

/**
 * Standard Mock Task Data
 */
export const DEFAULT_MOCK_TASK: Task = {
  id: 'test-task-1',
  name: 'Test Task',
  description: 'A test task for development',
  state: WorkflowState.PENDING,
  priority: TaskPriority.MEDIUM,
  metadata: { testData: true },
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Mock Workflow Factory
 */
export interface MockWorkflowOptions {
  id?: string;
  taskCount?: number;
  status?: Workflow['status'];
}

/**
 * Mock OpenAI Configuration
 */
export const DEFAULT_MOCK_OPENAI_CONFIG: OpenAIConfig = {
  apiKey: 'test-api-key',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
  retries: 3
};

/**
 * Mock Conversation Memory
 */
export const DEFAULT_MOCK_CONVERSATION: ConversationMemory = {
  sessionId: 'test-session-1',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there! How can I help you today?' }
  ],
  totalTokens: 50,
  totalCost: 0.001,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

/**
 * Mock Data Validation
 * Ensures mocks conform to production types
 */
export interface MockValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates mock data against production schemas
 */
export type ValidateMock = <T>(mockData: T, schema: any) => MockValidationResult;

/**
 * Test Helper Types
 */
export interface TestContext {
  agents: Agent[];
  workflows: Workflow[];
  tasks: Task[];
  cleanup: () => Promise<void>;
}

/**
 * Integration Test Configuration
 */
export interface IntegrationTestConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  mockServices: string[];
  realServices: string[];
}

/**
 * Performance Test Thresholds
 */
export interface PerformanceThresholds {
  maxResponseTime: number; // ms
  maxMemoryUsage: number; // MB
  minThroughput: number; // operations/second
  maxErrorRate: number; // percentage
}