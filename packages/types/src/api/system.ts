/**
 * System Monitoring API Contracts
 * Types for system metrics and monitoring data
 */

import { AgentMetrics } from './agents';
import { ApiResponse } from './common';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: [number, number, number];
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    percent: number;
    swap?: {
      total: number;
      used: number;
      percent: number;
    };
  };
  disk: {
    devices: Array<{
      device: string;
      mountPoint: string;
      total: number;
      used: number;
      free: number;
      percent: number;
    }>;
  };
  network: {
    interfaces: Array<{
      name: string;
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
      errorsIn: number;
      errorsOut: number;
    }>;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
  };
}

export interface MetricsQuery {
  startTime?: string;
  endTime?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
  metrics?: string[];
  agentId?: string;
}

export interface MetricsHistoryResponse {
  metrics: SystemMetrics[];
  aggregations?: {
    cpu: { min: number; max: number; avg: number };
    memory: { min: number; max: number; avg: number };
  };
}

// System Monitoring API Endpoints
export interface SystemApiEndpoints {
  'GET /api/metrics/system': () => Promise<ApiResponse<SystemMetrics>>;
  'GET /api/metrics/agents': () => Promise<ApiResponse<AgentMetrics[]>>;
  'GET /api/metrics/history': (query: MetricsQuery) => Promise<ApiResponse<MetricsHistoryResponse>>;
}