import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { McpService } from './mcp-service'

// Mock the dependencies
vi.mock('../storage/redis-storage', () => ({
  McpRedisStorage: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    saveServer: vi.fn().mockResolvedValue(undefined),
    getServer: vi.fn().mockResolvedValue(null),
    deleteServer: vi.fn().mockResolvedValue(undefined),
    listServers: vi.fn().mockResolvedValue([]),
  })),
}))

vi.mock('../security/encryption', () => ({
  McpEncryption: vi.fn().mockImplementation(() => ({
    encrypt: vi.fn().mockImplementation((data) => `encrypted_${data}`),
    decrypt: vi.fn().mockImplementation((data) => data.replace('encrypted_', '')),
    encryptEnvironmentVariables: vi.fn().mockImplementation((variables) => 
      variables.map((v: any) => ({ ...v, encrypted: false, required: false }))
    ),
    decryptEnvironmentVariables: vi.fn().mockImplementation((variables) => 
      variables.reduce((acc: any, v: any) => ({ ...acc, [v.key]: v.value }), {})
    ),
  })),
}))

vi.mock('../transport/stdio-transport', () => ({
  StdioTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(false),
  })),
}))

vi.mock('../transport/http-transport', () => ({
  HttpTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(false),
  })),
}))

vi.mock('../config', () => ({
  config: {
    redis: {
      host: 'localhost',
      port: 6379,
    },
    healthCheck: {
      interval: 30000,
    },
  },
}))

describe('McpService', () => {
  let service: McpService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new McpService()
  })

  afterEach(async () => {
    await service.shutdown()
  })

  describe('initialization', () => {
    it('creates a new service instance', () => {
      expect(service).toBeInstanceOf(McpService)
    })

    it('initializes storage and starts health check routine', async () => {
      await service.initialize()
      
      // Verify storage connection was called
      const mockStorage = (service as any).storage
      expect(mockStorage.connect).toHaveBeenCalledOnce()
    })

    it('can be shut down cleanly', async () => {
      await service.initialize()
      await service.shutdown()
      
      const mockStorage = (service as any).storage
      expect(mockStorage.disconnect).toHaveBeenCalledOnce()
    })
  })

  describe('server management', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('can create a new server', async () => {
      const serverData = {
        name: 'Test Server',
        description: 'A test MCP server',
        transport: 'stdio' as const,
        config: {
          command: 'node',
          args: ['test-server.js'],
        },
        environment: []
      }

      const result = await service.createServer(serverData)
      
      expect(result).toMatchObject({
        name: 'Test Server',
        description: 'A test MCP server',
        enabled: true,
        transport: 'stdio',
      })
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
    })

    it('generates unique IDs for servers', async () => {
      const serverData1 = {
        name: 'Server 1',
        transport: 'stdio' as const,
        config: { command: 'node', args: ['server1.js'] },
        environment: []
      }
      
      const serverData2 = {
        name: 'Server 2', 
        transport: 'stdio' as const,
        config: { command: 'node', args: ['server2.js'] },
        environment: []
      }

      const server1 = await service.createServer(serverData1)
      const server2 = await service.createServer(serverData2)
      
      expect(server1.id).not.toBe(server2.id)
    })

    it('auto-generates ID when creating server', async () => {
      const serverData = {
        name: 'Custom Server',
        transport: 'stdio' as const,
        config: { command: 'node', args: ['custom.js'] },
        environment: []
      }

      const result = await service.createServer(serverData)
      expect(result.id).toBeDefined()
      expect(result.id).toBeTruthy()
    })

    it('defaults enabled to true when not specified', async () => {
      const serverData = {
        name: 'Default Enabled Server',
        transport: 'stdio' as const,
        config: { command: 'node', args: ['default.js'] },
        environment: []
      }

      const result = await service.createServer(serverData)
      expect(result.enabled).toBe(true)
    })

    it('respects enabled value when provided', async () => {
      const serverData = {
        name: 'Disabled Server',
        enabled: false,
        transport: 'stdio' as const,
        config: { command: 'node', args: ['disabled.js'] },
        environment: []
      }

      const result = await service.createServer(serverData)
      expect(result.enabled).toBe(false)
    })
  })

  describe('error handling', () => {
    it('handles storage connection errors gracefully', async () => {
      const mockStorage = (service as any).storage
      mockStorage.connect.mockRejectedValueOnce(new Error('Connection failed'))

      await expect(service.initialize()).rejects.toThrow('Connection failed')
    })

    it('handles missing required fields when creating server', async () => {
      await service.initialize()
      
      const invalidServerData = {
        description: 'Missing name and transport',
      }

      await expect(service.createServer(invalidServerData as any)).rejects.toThrow()
    })
  })
})