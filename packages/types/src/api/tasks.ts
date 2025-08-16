/**
 * Task Management API Contracts
 * Types for task creation, assignment, and tracking
 */

import { ApiResponse } from './common';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedAgent?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  dependencies?: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  output?: any;
  error?: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  assignedAgent?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  dependencies?: string[];
  deadline?: string;
  autoStart?: boolean;
}

export interface TaskUpdate {
  status?: Task['status'];
  assignedAgent?: string;
  priority?: Task['priority'];
  output?: any;
  error?: string;
}

// Task Management API Endpoints
export interface TaskApiEndpoints {
  'GET /api/tasks': () => Promise<ApiResponse<Task[]>>;
  'POST /api/tasks': (body: CreateTaskRequest) => Promise<ApiResponse<Task>>;
  'PATCH /api/tasks/:id': (id: string, body: TaskUpdate) => Promise<ApiResponse<Task>>;
  'DELETE /api/tasks/:id': (id: string) => Promise<ApiResponse<void>>;
}