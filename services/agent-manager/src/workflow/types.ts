export enum WorkflowState {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  state: WorkflowState;
  assignedAgent?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workflow {
  id: string;
  name: string;
  tasks: Map<string, Task>;
  currentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'paused';
}

export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  taskId: string;
  workflowId: string;
  agentId?: string;
  timestamp: Date;
  reason?: string;
}

export interface WorkflowStatus {
  workflow: Workflow;
  completedTasks: number;
  totalTasks: number;
  blockedTasks: string[];
  currentAgent?: string;
  progress: number;
}