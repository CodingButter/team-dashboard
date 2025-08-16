/**
 * Common API Types and Responses
 * Shared types used across all API endpoints
 */

export type AgentModel = 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
export type AgentStatus = 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'crashed';
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
    duration: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}