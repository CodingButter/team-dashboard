/**
 * @package agent-manager/tests/lifecycle
 * Shared test utilities and mocks for lifecycle tests
 */

import { vi } from 'vitest'
import { 
  AgentProcess, 
  AgentSpawnConfig, 
  AgentStatus 
} from '@team-dashboard/types'

export const createMockAgentProcess = (id: string, status: AgentStatus = 'starting'): AgentProcess => ({
  id,
  pid: Math.floor(Math.random() * 10000) + 1000,
  status,
  startTime: Date.now(),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn()
})

export const createMockSpawnConfig = (id: string): AgentSpawnConfig => ({
  id,
  name: `test-agent-${id}`,
  model: 'claude-3-sonnet',
  workspace: '/tmp/test-workspace',
  environment: { TEST_MODE: 'true' },
  resourceLimits: {
    memory: 512,
    cpu: 50
  }
})

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

export const mockHealthMetrics = {
  cpu: 25.5,
  memory: 256,
  uptime: 300000,
  responseTime: 150,
  status: 'healthy' as const
}

export const mockResourceMetrics = {
  memoryUsage: 128,
  cpuUsage: 15.2,
  diskUsage: 1024,
  networkIO: { in: 50, out: 25 },
  timestamp: Date.now()
}