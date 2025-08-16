/**
 * Application-wide constants
 */

export const API_ENDPOINTS = {
  AGENTS: '/api/agents',
  SYSTEM: '/api/system',
  WEBSOCKET: '/api/ws',
} as const

export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AGENT_STATUS: 'agent:status',
  SYSTEM_METRICS: 'system:metrics',
  TASK_UPDATE: 'task:update',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

export const POLLING_INTERVALS = {
  SYSTEM_METRICS: 5000, // 5 seconds
  AGENT_STATUS: 10000, // 10 seconds
  TASK_UPDATES: 15000, // 15 seconds
} as const