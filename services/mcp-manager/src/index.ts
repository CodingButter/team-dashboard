/**
 * @service mcp-manager
 * Main entry point for MCP (Model Context Protocol) management service
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config'
import { McpService } from './service/mcp-service'
import { serverRoutes } from './routes/servers'
import { templateRoutes } from './routes/templates'
import { statusRoutes } from './routes/status'

// Declare module augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    mcpService: McpService
  }
}

async function createServer() {
  // Create Fastify instance
  const fastify = Fastify({
    logger: config.logging.pretty ? {
      level: config.logging.level,
      transport: {
        target: require.resolve('pino-pretty'),
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true
        }
      }
    } : {
      level: config.logging.level
    }
  })

  try {
    // Register CORS
    await fastify.register(cors, config.server.cors)

    // Initialize MCP service
    const mcpService = new McpService()
    await mcpService.initialize()
    
    // Register MCP service plugin
    fastify.decorate('mcpService', mcpService)

    // Health check endpoint
    fastify.get('/health', async () => {
      return { 
        status: 'healthy', 
        service: 'mcp-manager',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    })

    // API routes
    await fastify.register(async (fastify) => {
      await fastify.register(serverRoutes)
      await fastify.register(templateRoutes)
      await fastify.register(statusRoutes)
    }, { prefix: '/api/mcp' })

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`)
      
      try {
        await mcpService.shutdown()
        await fastify.close()
        process.exit(0)
      } catch (error) {
        fastify.log.error(`Error during shutdown: ${String(error)}`)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'))

    return fastify
  } catch (error) {
    fastify.log.error(`Failed to create server: ${String(error)}`)
    throw error
  }
}

async function start() {
  try {
    const server = await createServer()
    
    await server.listen({
      port: config.server.port,
      host: config.server.host
    })

    console.log(`🔌 MCP Manager service listening on ${config.server.host}:${config.server.port}`)
    console.log(`📊 Health check: http://${config.server.host}:${config.server.port}/health`)
    console.log(`🚀 API base: http://${config.server.host}:${config.server.port}/api/mcp`)
    
  } catch (error) {
    console.error('Failed to start MCP Manager service:', error)
    process.exit(1)
  }
}

// Start server if this is the main module
if (require.main === module) {
  start()
}

export { createServer, start }