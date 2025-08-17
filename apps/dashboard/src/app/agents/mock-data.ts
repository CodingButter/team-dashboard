/**
 * Mock data for agents page
 * This file contains sample agent data for development and testing
 */

import { SystemPrompt, MCPServer } from '@team-dashboard/types'

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

export const mockSystemPrompts: SystemPrompt[] = [
  {
    id: 'frontend-expert',
    name: 'Frontend Expert',
    content: `You are a Senior Frontend Developer with expertise in React, TypeScript, and modern web technologies. You excel at:
- Building responsive, accessible user interfaces
- Optimizing for performance and Core Web Vitals
- Following React best practices and hooks patterns
- Implementing modern CSS techniques and Tailwind CSS
- Testing with Jest, React Testing Library, and Playwright

Always write clean, maintainable code and consider user experience in your solutions.`,
    version: 1,
    description: 'Expert frontend developer specialized in React and TypeScript',
    tags: ['frontend', 'react', 'typescript', 'ui'],
    isDefault: false,
    maxTokens: 4000,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 43200000,
    createdBy: 'system',
    usage: {
      timesUsed: 25,
      lastUsed: Date.now() - 3600000,
      averageRating: 4.8
    }
  },
  {
    id: 'backend-expert',
    name: 'Backend Expert',
    content: `You are a Senior Backend Developer with deep expertise in Node.js, databases, and API design. You specialize in:
- Building scalable RESTful and GraphQL APIs
- Database design and optimization
- Microservices architecture
- Security best practices
- Performance monitoring and optimization

Focus on writing secure, efficient, and well-documented backend solutions.`,
    version: 1,
    description: 'Expert backend developer for APIs and server-side development',
    tags: ['backend', 'nodejs', 'api', 'database'],
    isDefault: false,
    maxTokens: 4000,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 86400000,
    createdBy: 'system',
    usage: {
      timesUsed: 18,
      lastUsed: Date.now() - 7200000,
      averageRating: 4.6
    }
  },
  {
    id: 'devops-specialist',
    name: 'DevOps Specialist',
    content: `You are a DevOps Engineer with expertise in cloud infrastructure, CI/CD, and automation. You excel at:
- Container orchestration with Docker and Kubernetes
- Infrastructure as Code (Terraform, CloudFormation)
- CI/CD pipeline design and implementation
- Monitoring and observability setup
- Security and compliance automation

Always prioritize automation, reliability, and security in your solutions.`,
    version: 1,
    description: 'DevOps specialist for infrastructure and deployment automation',
    tags: ['devops', 'kubernetes', 'ci-cd', 'monitoring'],
    isDefault: false,
    maxTokens: 4000,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 129600000,
    createdBy: 'system',
    usage: {
      timesUsed: 12,
      lastUsed: Date.now() - 14400000,
      averageRating: 4.9
    }
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    content: `You are a helpful AI assistant capable of assisting with various programming and development tasks. You can:
- Write and review code in multiple languages
- Help with debugging and troubleshooting
- Provide explanations and documentation
- Assist with project planning and architecture decisions

Always strive to be helpful, accurate, and provide clear explanations.`,
    version: 1,
    description: 'General-purpose programming assistant',
    tags: ['general', 'assistant', 'programming'],
    isDefault: true,
    maxTokens: 4000,
    createdAt: Date.now() - 345600000,
    updatedAt: Date.now() - 172800000,
    createdBy: 'system',
    usage: {
      timesUsed: 45,
      lastUsed: Date.now() - 1800000,
      averageRating: 4.5
    }
  }
]

export const mockMCPServers: MCPServer[] = [
  {
    id: 'filesystem-server',
    name: 'Filesystem Server',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/home/user'],
    status: 'connected',
    version: '0.4.0',
    description: 'Provides secure file system operations with read/write permissions',
    capabilities: {
      tools: [
        {
          name: 'read_file',
          description: 'Read the contents of a file',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path']
          },
          category: 'file_operations'
        },
        {
          name: 'write_file',
          description: 'Write content to a file',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' }, content: { type: 'string' } },
            required: ['path', 'content']
          },
          dangerous: true,
          requiresApproval: true,
          category: 'file_operations'
        },
        {
          name: 'list_directory',
          description: 'List files and directories',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path']
          },
          category: 'file_operations'
        }
      ]
    },
    lastConnected: Date.now() - 300000
  },
  {
    id: 'git-server',
    name: 'Git Server',
    command: 'npx',
    args: ['@modelcontextprotocol/server-git'],
    status: 'connected',
    version: '0.3.0',
    description: 'Git repository operations and version control management',
    capabilities: {
      tools: [
        {
          name: 'git_status',
          description: 'Get repository status',
          inputSchema: {
            type: 'object',
            properties: { repo_path: { type: 'string' } }
          },
          category: 'version_control'
        },
        {
          name: 'git_commit',
          description: 'Create a git commit',
          inputSchema: {
            type: 'object',
            properties: { 
              message: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } }
            },
            required: ['message']
          },
          requiresApproval: true,
          category: 'version_control'
        },
        {
          name: 'git_diff',
          description: 'Show git diff',
          inputSchema: {
            type: 'object',
            properties: { file_path: { type: 'string' } }
          },
          category: 'version_control'
        }
      ]
    },
    lastConnected: Date.now() - 150000
  },
  {
    id: 'shell-server',
    name: 'Shell Server',
    command: 'npx',
    args: ['@modelcontextprotocol/server-shell'],
    status: 'connected',
    version: '0.2.0',
    description: 'Execute shell commands with safety controls',
    capabilities: {
      tools: [
        {
          name: 'run_command',
          description: 'Execute a shell command',
          inputSchema: {
            type: 'object',
            properties: { 
              command: { type: 'string' },
              args: { type: 'array', items: { type: 'string' } }
            },
            required: ['command']
          },
          dangerous: true,
          requiresApproval: true,
          category: 'system_commands'
        }
      ]
    },
    lastConnected: Date.now() - 600000
  },
  {
    id: 'web-server',
    name: 'Web Scraping Server',
    command: 'npx',
    args: ['@modelcontextprotocol/server-puppeteer'],
    status: 'disconnected',
    version: '0.5.0',
    description: 'Web scraping and browser automation capabilities',
    capabilities: {
      tools: [
        {
          name: 'screenshot',
          description: 'Take a screenshot of a webpage',
          inputSchema: {
            type: 'object',
            properties: { url: { type: 'string' } },
            required: ['url']
          },
          category: 'network_requests'
        },
        {
          name: 'scrape_page',
          description: 'Extract content from a webpage',
          inputSchema: {
            type: 'object',
            properties: { 
              url: { type: 'string' },
              selector: { type: 'string' }
            },
            required: ['url']
          },
          category: 'network_requests'
        }
      ]
    },
    lastConnected: Date.now() - 3600000,
    errorMessage: 'Connection timeout'
  },
  {
    id: 'npm-server',
    name: 'NPM Package Manager',
    command: 'npx',
    args: ['@modelcontextprotocol/server-npm'],
    status: 'connecting',
    version: '0.1.0',
    description: 'Package management and dependency operations',
    capabilities: {
      tools: [
        {
          name: 'install_package',
          description: 'Install an npm package',
          inputSchema: {
            type: 'object',
            properties: { 
              package: { type: 'string' },
              dev: { type: 'boolean' }
            },
            required: ['package']
          },
          requiresApproval: true,
          category: 'package_management'
        },
        {
          name: 'search_packages',
          description: 'Search for npm packages',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query']
          },
          category: 'package_management'
        }
      ]
    }
  }
]