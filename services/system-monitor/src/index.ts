import Fastify from 'fastify'
// import fastifyWebsocket from '@fastify/websocket'
import fastifyCors from '@fastify/cors'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { setupMetricsWebSocket } from './websocket'
import * as os from 'os'
// import * as fs from 'fs/promises'

const fastify = Fastify({
  logger: true
})

// Register plugins
fastify.register(fastifyCors, {
  origin: true,
  credentials: true
})

// Create HTTP server for Socket.io
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  path: '/socket.io'
})

// System metrics endpoint
fastify.get('/metrics', async (_request, _reply) => {
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  
  const metrics = {
    cpu: {
      usage: Math.round(Math.random() * 100), // Mock for now
      cores: cpus.length,
      model: cpus[0].model
    },
    memory: {
      total: totalMem,
      used: usedMem,
      available: freeMem,
      percent: (usedMem / totalMem) * 100
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname()
  }
  
  return metrics
})

// Health check endpoint
fastify.get('/health', async (_request, _reply) => {
  return { 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }
})

// Alert thresholds configuration
fastify.get('/config/thresholds', async (_request, _reply) => {
  return {
    cpu: {
      warning: 80,
      critical: 90
    },
    memory: {
      warning: 85,
      critical: 95
    },
    disk: {
      warning: 80,
      critical: 90
    },
    network: {
      maxBandwidth: 100 * 1024 * 1024 // 100 MB/s
    }
  }
})

// Update alert thresholds
fastify.post('/config/thresholds', async (request, _reply) => {
  const thresholds = request.body
  // Store thresholds (in production, this would be persisted)
  return { success: true, thresholds }
})

// Agent metrics endpoint
fastify.get('/agents/metrics', async (_request, _reply) => {
  // Mock agent metrics for now
  return [
    {
      agentId: 'agent-1',
      name: 'Frontend Expert',
      status: 'active',
      tokenUsage: 45000,
      responseTime: 1200,
      errorRate: 2.5,
      taskCompletionRate: 95,
      cost: 3.45,
      lastActive: Date.now()
    },
    {
      agentId: 'agent-2',
      name: 'Backend Specialist',
      status: 'idle',
      tokenUsage: 67000,
      responseTime: 800,
      errorRate: 1.2,
      taskCompletionRate: 98,
      cost: 5.12,
      lastActive: Date.now() - 300000
    }
  ]
})

// Historical metrics endpoint
fastify.get('/metrics/history', async (request, _reply) => {
  const { hours = 24, interval = 'minute' } = request.query as any
  
  // Mock historical data
  const dataPoints = []
  const now = Date.now()
  const intervalMs = interval === 'minute' ? 60000 : interval === 'hour' ? 3600000 : 1000
  const numPoints = Math.min((hours * 3600000) / intervalMs, 1000)
  
  for (let i = 0; i < numPoints; i++) {
    dataPoints.push({
      timestamp: now - (i * intervalMs),
      cpu: {
        usage: 30 + Math.random() * 50,
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        used: os.totalmem() * (0.4 + Math.random() * 0.4),
        percent: 40 + Math.random() * 40
      },
      disk: {
        total: 500 * 1024 * 1024 * 1024,
        used: 200 * 1024 * 1024 * 1024 + Math.random() * 100 * 1024 * 1024 * 1024,
        percent: 40 + Math.random() * 20
      },
      network: {
        bytesIn: Math.floor(Math.random() * 10 * 1024 * 1024),
        bytesOut: Math.floor(Math.random() * 5 * 1024 * 1024),
        packetsIn: Math.floor(Math.random() * 10000),
        packetsOut: Math.floor(Math.random() * 5000)
      }
    })
  }
  
  return {
    data: dataPoints,
    interval,
    hours
  }
})

// Export metrics data
fastify.get('/metrics/export', async (request, reply) => {
  const { format = 'json', hours = 24 } = request.query as any
  
  const data = {
    exportedAt: new Date().toISOString(),
    period: `${hours} hours`,
    metrics: [] // Would fetch from database in production
  }
  
  if (format === 'csv') {
    reply.type('text/csv')
    reply.header('Content-Disposition', `attachment; filename="metrics-${Date.now()}.csv"`)
    
    // Convert to CSV format
    const csv = 'timestamp,cpu_usage,memory_usage,disk_usage,network_in,network_out\n'
    return csv
  }
  
  reply.header('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`)
  return data
})

// Setup WebSocket for real-time metrics
setupMetricsWebSocket(fastify, io)

// Start servers
const start = async () => {
  try {
    // Start Fastify HTTP server
    await fastify.listen({ 
      port: parseInt(process.env.PORT || '3002'),
      host: '0.0.0.0'
    })
    
    // Start Socket.io server
    httpServer.listen(parseInt(process.env.WS_PORT || '3003'), () => {
      console.log(`WebSocket server listening on port ${process.env.WS_PORT || '3003'}`)
    })
    
    console.log(`System monitor service running on port ${process.env.PORT || '3002'}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()