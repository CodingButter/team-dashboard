/**
 * Alerts & Notifications API Contracts
 * Types for system alerts and notification rules
 */

import { ApiResponse } from './common';

export interface Alert {
  id: string;
  type: 'resource' | 'performance' | 'security' | 'agent' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration?: number; // seconds
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'log';
    config: Record<string, any>;
  }>;
}

// Alerts API Endpoints
export interface AlertsApiEndpoints {
  'GET /api/alerts': () => Promise<ApiResponse<Alert[]>>;
  'POST /api/alerts/:id/acknowledge': (id: string) => Promise<ApiResponse<void>>;
  'POST /api/alerts/:id/resolve': (id: string) => Promise<ApiResponse<void>>;
  'GET /api/alerts/rules': () => Promise<ApiResponse<AlertRule[]>>;
  'POST /api/alerts/rules': (body: AlertRule) => Promise<ApiResponse<AlertRule>>;
}