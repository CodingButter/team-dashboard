/**
 * @service mcp-manager/routes
 * Routes for MCP server status and monitoring
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { McpService } from '../service/mcp-service'

export async function statusRoutes(fastify: FastifyInstance) {
  const mcpService = fastify.mcpService as McpService

  // Get status for all servers
  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await mcpService.getAllServers()
      const statuses = await Promise.all(
        servers.map(async (server) => {
          try {
            const status = await mcpService.storage.getServerStatus(server.id)
            return status || {
              serverId: server.id,
              status: 'disconnected' as const,
              uptime: 0,
              requestCount: 0,
              errorCount: 0
            }
          } catch (error) {
            return {
              serverId: server.id,
              status: 'error' as const,
              lastError: 'Failed to retrieve status',
              uptime: 0,
              requestCount: 0,
              errorCount: 0
            }
          }
        })
      )

      return {
        success: true,
        data: statuses
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve server statuses'
      })
    }
  })

  // Get comprehensive status overview
  fastify.get('/overview', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await mcpService.getAllServers()
      const statuses = await Promise.all(
        servers.map(server => mcpService.storage.getServerStatus(server.id))
      )

      const overview = {
        totalServers: servers.length,
        enabledServers: servers.filter(s => s.enabled).length,
        connectedServers: statuses.filter(s => s?.status === 'connected').length,
        errorServers: statuses.filter(s => s?.status === 'error').length,
        disconnectedServers: statuses.filter(s => !s || s.status === 'disconnected').length,
        totalRequests: statuses.reduce((sum, s) => sum + (s?.requestCount || 0), 0),
        totalErrors: statuses.reduce((sum, s) => sum + (s?.errorCount || 0), 0),
        avgUptime: statuses.length > 0 
          ? statuses.reduce((sum, s) => sum + (s?.uptime || 0), 0) / statuses.length 
          : 0,
        transportBreakdown: {
          stdio: servers.filter(s => s.transport === 'stdio').length,
          'http+sse': servers.filter(s => s.transport === 'http+sse').length
        },
        categories: servers.reduce((acc, server) => {
          server.tags.forEach(tag => {
            acc[tag] = (acc[tag] || 0) + 1
          })
          return acc
        }, {} as Record<string, number>)
      }

      return {
        success: true,
        data: overview
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate status overview'
      })
    }
  })

  // Get health metrics for monitoring
  fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const servers = await mcpService.getAllServers()
      const enabledServers = servers.filter(s => s.enabled)
      const connectedCount = 0 // Will be populated by actual status checks
      
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          mcpManager: 'healthy',
          redis: 'healthy', // Should check actual Redis connection
          servers: enabledServers.length > 0 && connectedCount > 0 ? 'healthy' : 'degraded'
        },
        metrics: {
          configuredServers: servers.length,
          enabledServers: enabledServers.length,
          connectedServers: connectedCount,
          uptime: process.uptime()
        }
      }

      return healthStatus
    } catch (error) {
      fastify.log.error(error)
      return reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      })
    }
  })
}