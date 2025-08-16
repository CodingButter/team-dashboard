/**
 * Logs & Events API Contracts
 * Types for system logging and event tracking
 */

import { LogLevel } from './common';
import { ApiResponse, PaginatedResponse } from './common';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, any>;
  agentId?: string;
  userId?: string;
  requestId?: string;
}

export interface LogQuery {
  startTime?: string;
  endTime?: string;
  levels?: LogLevel[];
  sources?: string[];
  agentId?: string;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SystemEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Logs & Events API Endpoints
export interface LogsApiEndpoints {
  'GET /api/logs': (query: LogQuery) => Promise<PaginatedResponse<LogEntry>>;
  'GET /api/events': () => Promise<ApiResponse<SystemEvent[]>>;
}