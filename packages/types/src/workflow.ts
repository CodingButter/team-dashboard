/**
 * Workflow types for Team Dashboard
 */

export enum WorkflowState {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export enum WorkflowTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  REVIEW = 'REVIEW',
  CANCELLED = 'CANCELLED',
}

export interface WorkflowTask {
  id: string;
  name: string;
  description?: string;
  state: WorkflowState;
  status: WorkflowTaskStatus;
  assignedAgent?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  taskId: string;
  workflowId: string;
  agentId?: string;
  timestamp: Date;
  reason?: string;
}

export interface Workflow {
  id: string;
  name: string;
  tasks: Map<string, WorkflowTask>;
  currentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'paused';
}

export interface WorkflowStatus {
  workflow: Workflow;
  completedTasks: number;
  totalTasks: number;
  blockedTasks: string[];
  currentAgent?: string;
  progress: number;
}