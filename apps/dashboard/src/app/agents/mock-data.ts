/**
 * Mock data for agents page
 * This file contains sample agent data for development and testing
 */

import { Agent } from '@team-dashboard/types';

export const mockAgents: Agent[] = [
  {
    id: 'agent-demo-001',
    name: 'Frontend Developer',
    model: 'claude-3-sonnet',
    status: 'running',
    workspace: '/home/user/projects/frontend',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    lastActivity: new Date(Date.now() - 30000).toISOString(),
    metrics: {
      cpu: 12.5,
      memory: 256,
      threads: 4,
      uptime: 3600,
      apiCalls: 145,
      tokensUsed: 12450
    }
  },
  {
    id: 'agent-demo-002',
    name: 'Backend Engineer',
    model: 'claude-3-opus',
    status: 'paused',
    workspace: '/home/user/projects/backend',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    lastActivity: new Date(Date.now() - 300000).toISOString(),
    metrics: {
      cpu: 8.2,
      memory: 512,
      threads: 6,
      uptime: 7200,
      apiCalls: 89,
      tokensUsed: 23100
    }
  },
  {
    id: 'agent-demo-003',
    name: 'DevOps Specialist',
    model: 'claude-3-sonnet',
    status: 'running',
    workspace: '/home/user/projects/infra',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    lastActivity: new Date(Date.now() - 60000).toISOString(),
    metrics: {
      cpu: 15.8,
      memory: 384,
      threads: 8,
      uptime: 1800,
      apiCalls: 67,
      tokensUsed: 8900
    }
  },
  {
    id: 'agent-demo-004',
    name: 'Data Scientist',
    model: 'claude-3-opus',
    status: 'stopped',
    workspace: '/home/user/projects/ml',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    stoppedAt: new Date(Date.now() - 3600000).toISOString(),
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    metrics: {
      cpu: 0,
      memory: 0,
      threads: 0,
      uptime: 0,
      apiCalls: 234,
      tokensUsed: 45600
    }
  },
  {
    id: 'agent-demo-005',
    name: 'Security Auditor',
    model: 'claude-3-sonnet',
    status: 'crashed',
    workspace: '/home/user/projects/security',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    lastActivity: new Date(Date.now() - 1800000).toISOString(),
    metrics: {
      cpu: 0,
      memory: 128,
      threads: 2,
      uptime: 900,
      apiCalls: 23,
      tokensUsed: 3400
    }
  },
]