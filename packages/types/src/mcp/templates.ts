/**
 * @package types/mcp
 * MCP server templates and catalog definitions
 */

import { McpStdioConfig, McpHttpConfig, McpEnvironmentVariable } from './base';

/** Template for creating new MCP servers */
export interface McpServerTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  homepage?: string;
  documentation?: string;
  transport: 'stdio' | 'http+sse';
  installCommand?: string;
  defaultConfig: Partial<McpStdioConfig | McpHttpConfig>;
  requiredEnvironment: Omit<McpEnvironmentVariable, 'value'>[];
  optionalEnvironment: Omit<McpEnvironmentVariable, 'value'>[];
  capabilities: string[];
  tools: string[];
  resources: string[];
  prompts: string[];
  tags: string[];
  verified: boolean;
  popularity: number;
}

/** Popular MCP server templates */
export const MCP_SERVER_TEMPLATES: McpServerTemplate[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories, issues, PRs, and file operations',
    category: 'Development',
    version: '1.0.0',
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    transport: 'stdio',
    installCommand: 'npx -y @modelcontextprotocol/server-github',
    defaultConfig: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      autoConnect: true,
      timeout: 30000
    },
    requiredEnvironment: [
      { key: 'GITHUB_PERSONAL_ACCESS_TOKEN', encrypted: true, required: true }
    ],
    optionalEnvironment: [],
    capabilities: ['tools', 'resources'],
    tools: ['create_repository', 'search_repositories', 'create_or_update_file'],
    resources: ['file://'],
    prompts: [],
    tags: ['github', 'git', 'development', 'repositories'],
    verified: true,
    popularity: 95
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Database access, schema inspection, and SQL operations',
    category: 'Database',
    version: '1.0.0',
    author: 'Anthropic',
    transport: 'stdio',
    installCommand: 'npx -y @modelcontextprotocol/server-postgres',
    defaultConfig: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      autoConnect: false,
      timeout: 15000
    },
    requiredEnvironment: [
      { key: 'POSTGRES_CONNECTION_STRING', encrypted: true, required: true }
    ],
    optionalEnvironment: [],
    capabilities: ['tools', 'resources'],
    tools: ['query', 'schema_inspect', 'list_tables'],
    resources: ['schema://'],
    prompts: [],
    tags: ['postgresql', 'database', 'sql'],
    verified: true,
    popularity: 85
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation, web scraping, and screenshot capture',
    category: 'Automation',
    version: '1.0.0',
    author: 'Anthropic',
    transport: 'stdio',
    installCommand: 'npx -y @modelcontextprotocol/server-puppeteer',
    defaultConfig: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      autoConnect: false,
      timeout: 45000
    },
    requiredEnvironment: [],
    optionalEnvironment: [
      { key: 'PUPPETEER_EXECUTABLE_PATH', encrypted: false, required: false }
    ],
    capabilities: ['tools'],
    tools: ['navigate', 'screenshot', 'click_element', 'fill_form'],
    resources: [],
    prompts: [],
    tags: ['puppeteer', 'browser', 'automation', 'scraping'],
    verified: true,
    popularity: 78
  }
];

/** MCP server categories */
export const MCP_CATEGORIES = [
  'Development',
  'Database', 
  'Automation',
  'Communication',
  'Cloud',
  'Analytics',
  'Security',
  'Other'
] as const;

export type McpCategory = typeof MCP_CATEGORIES[number];