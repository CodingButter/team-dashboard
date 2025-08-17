/**
 * Core Workflow and Task Type Definitions
 * Consolidated from services/agent-manager/src/workflow/types.ts
 * 
 * This is the single source of truth for Workflow types.
 */

/**
 * Workflow State Enumeration
 */
export enum WorkflowState {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

/**
 * Task Priority Levels
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Task Definition
 */
export interface Task {
  id: string;
  name: string;
  description?: string;
  state: WorkflowState;
  priority: TaskPriority;
  assignedAgent?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Workflow Definition
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tasks: Map<string, Task>;
  currentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: WorkflowStatus;
  metadata?: Record<string, any>;
  estimatedCompletion?: Date;
}

/**
 * Workflow Status
 */
export type WorkflowStatus = 'active' | 'completed' | 'paused' | 'cancelled' | 'failed';

/**
 * State Transition Event
 */
export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  taskId: string;
  workflowId: string;
  agentId?: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow Progress Information
 */
export interface WorkflowProgress {
  workflow: Workflow;
  completedTasks: number;
  totalTasks: number;
  blockedTasks: string[];
  currentAgent?: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // minutes
}

/**
 * Task Assignment Request
 */
export interface TaskAssignmentRequest {
  taskId: string;
  agentId: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow Creation Request
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
  metadata?: Record<string, any>;
}

/**
 * Task Update Request
 */
export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  state?: WorkflowState;
  priority?: TaskPriority;
  assignedAgent?: string;
  metadata?: Record<string, any>;
}