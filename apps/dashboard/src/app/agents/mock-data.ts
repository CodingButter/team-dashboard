/**
 * Mock data for agents page
 * This file contains sample agent data for development and testing
 */

export interface Agent {
  id: string
  name: string
  model: 'claude-3-opus' | 'claude-3-sonnet'
  status: 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'crashed'
  workspace: string
  uptime?: number
  lastActivity?: number
  cpu?: number
  memory?: number
}

export const mockAgents: Agent[] = [
  {
    id: 'agent-demo-001',
    name: 'Frontend Developer',
    model: 'claude-3-sonnet',
    status: 'running',
    workspace: '/home/user/projects/frontend',
    uptime: 3600,
    lastActivity: Date.now() - 30000,
    cpu: 12.5,
    memory: 256 * 1024 * 1024,
  },
  {
    id: 'agent-demo-002',
    name: 'Backend Engineer',
    model: 'claude-3-opus',
    status: 'paused',
    workspace: '/home/user/projects/backend',
    uptime: 7200,
    lastActivity: Date.now() - 300000,
    cpu: 8.2,
    memory: 512 * 1024 * 1024,
  },
  {
    id: 'agent-demo-003',
    name: 'DevOps Specialist',
    model: 'claude-3-sonnet',
    status: 'running',
    workspace: '/home/user/projects/infra',
    uptime: 1800,
    lastActivity: Date.now() - 60000,
    cpu: 15.8,
    memory: 384 * 1024 * 1024,
  },
  {
    id: 'agent-demo-004',
    name: 'Data Scientist',
    model: 'claude-3-opus',
    status: 'stopped',
    workspace: '/home/user/projects/ml',
    uptime: 0,
    lastActivity: Date.now() - 3600000,
    cpu: 0,
    memory: 0,
  },
  {
    id: 'agent-demo-005',
    name: 'Security Auditor',
    model: 'claude-3-sonnet',
    status: 'crashed',
    workspace: '/home/user/projects/security',
    uptime: 900,
    lastActivity: Date.now() - 1800000,
    cpu: 0,
    memory: 128 * 1024 * 1024,
  },
]