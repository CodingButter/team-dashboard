/**
 * @service mcp-manager/routes
 * REST API routes for MCP server management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { McpService } from '../service/mcp-service'
import { 
  CreateMcpServerRequest, 
  UpdateMcpServerRequest, 
  McpServerFilters,
  McpServerTestRequest 
} from '@team-dashboard/types'

export async function serverRoutes(fastify: FastifyInstance) {
  const mcpService = fastify.mcpService as McpService

  // Get all servers with optional filtering
  fastify.get('/servers', async (request: FastifyRequest<{
    Querystring: McpServerFilters & { page?: number; limit?: number }
  }>, reply: FastifyReply) => {
    try {
      const { page = 1, limit = 20, ...filters } = request.query

      let servers = await mcpService.getAllServers()
      
      // Apply filters
      if (filters.enabled !== undefined) {
        servers = servers.filter(s => s.enabled === filters.enabled)
      }
      
      if (filters.transport) {
        servers = servers.filter(s => s.transport === filters.transport)
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        servers = servers.filter(s => 
          s.name.toLowerCase().includes(searchTerm) ||
          s.description?.toLowerCase().includes(searchTerm) ||
          s.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }

      if (filters.tags && filters.tags.length > 0) {
        servers = servers.filter(s => 
          filters.tags!.some(tag => s.tags.includes(tag))
        )
      }

      // Pagination
      const total = servers.length
      const offset = (page - 1) * limit
      const paginatedServers = servers.slice(offset, offset + limit)

      return {
        success: true,
        data: paginatedServers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve servers'
      })
    }
  })

  // Create new server
  fastify.post('/servers', async (request: FastifyRequest<{
    Body: CreateMcpServerRequest
  }>, reply: FastifyReply) => {
    try {
      const server = await mcpService.createServer(request.body)
      
      return reply.code(201).send({
        success: true,
        data: server
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create server'
      })
    }
  })

  // Get server by ID
  fastify.get('/servers/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const server = await mcpService.getServer(request.params.id)
      
      if (!server) {
        return reply.code(404).send({
          success: false,
          error: 'Server not found'
        })
      }

      return {
        success: true,
        data: server
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve server'
      })
    }
  })

  // Update server
  fastify.put('/servers/:id', async (request: FastifyRequest<{
    Params: { id: string }
    Body: UpdateMcpServerRequest
  }>, reply: FastifyReply) => {
    try {
      const server = await mcpService.updateServer(request.params.id, request.body)
      
      return {
        success: true,
        data: server
      }
    } catch (error) {
      fastify.log.error(error)
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400
      return reply.code(statusCode).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update server'
      })
    }
  })

  // Delete server
  fastify.delete('/servers/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const deleted = await mcpService.deleteServer(request.params.id)
      
      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: 'Server not found'
        })
      }

      return {
        success: true,
        message: 'Server deleted successfully'
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete server'
      })
    }
  })

  // Connect server
  fastify.post('/servers/:id/connect', async (request: FastifyRequest<{
    Params: { id: string }
    Body?: { force?: boolean }
  }>, reply: FastifyReply) => {
    try {
      await mcpService.connectServer(request.params.id, request.body?.force)
      
      return {
        success: true,
        message: 'Server connection initiated'
      }
    } catch (error) {
      fastify.log.error(error)
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400
      return reply.code(statusCode).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect server'
      })
    }
  })

  // Disconnect server
  fastify.post('/servers/:id/disconnect', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      await mcpService.disconnectServer(request.params.id)
      
      return {
        success: true,
        message: 'Server disconnected'
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to disconnect server'
      })
    }
  })

  // Test server connection
  fastify.post('/servers/:id/test', async (_request: FastifyRequest<{
    Params: { id: string }
    Body: McpServerTestRequest
  }>, reply: FastifyReply) => {
    try {
      // TODO: Implement test connection logic
      // This would temporarily create a transport with the provided config
      // and attempt to connect/initialize to validate the configuration
      
      return {
        success: true,
        data: {
          success: true,
          latency: 150,
          capabilities: ['tools', 'resources'],
          tools: ['example_tool'],
          resources: ['file://']
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Test connection failed'
      })
    }
  })

  // Get server health
  fastify.get('/servers/:id/health', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const health = await mcpService.performHealthCheck(request.params.id)
      
      return {
        success: true,
        data: health
      }
    } catch (error) {
      fastify.log.error(error)
      const statusCode = error instanceof Error && error.message.includes('not connected') ? 400 : 500
      return reply.code(statusCode).send({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      })
    }
  })
}