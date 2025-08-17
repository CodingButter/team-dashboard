import { FastifyInstance } from 'fastify'
import { Server } from 'socket.io'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import * as fs from 'fs/promises'

const execAsync = promisify(exec)

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature?: number
    perCore?: number[]
  }
  memory: {
    total: number
    used: number
    available: number
    percent: number
    swap?: { total: number; used: number; percent: number }
  }
  disk: {
    total: number
    used: number
    percent: number
    readRate?: number
    writeRate?: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
    throughput?: { in: number; out: number }
  }
  gpu?: {
    usage: number
    memory: number
    temperature?: number
  }
}

let previousNetworkStats = {
  bytesIn: 0,
  bytesOut: 0,
  packetsIn: 0,
  packetsOut: 0,
  timestamp: Date.now()
}

let previousDiskStats = {
  readBytes: 0,
  writeBytes: 0,
  timestamp: Date.now()
}

async function getCPUUsage(): Promise<number> {
  const cpus = os.cpus()
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0)
  const totalTick = cpus.reduce((acc, cpu) => 
    acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0)
  
  const idle = totalIdle / cpus.length
  const total = totalTick / cpus.length
  const usage = 100 - ~~(100 * idle / total)
  
  return Math.min(100, Math.max(0, usage))
}

async function getCPUTemperature(): Promise<number | undefined> {
  try {
    // Try to read from thermal zone (Linux)
    const temp = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf-8')
    return parseInt(temp) / 1000
  } catch {
    // Temperature not available
    return undefined
  }
}

async function getNetworkStats() {
  try {
    const netStats = await fs.readFile('/proc/net/dev', 'utf-8')
    const lines = netStats.split('\n').slice(2) // Skip headers
    
    let totalBytesIn = 0
    let totalBytesOut = 0
    let totalPacketsIn = 0
    let totalPacketsOut = 0
    
    for (const line of lines) {
      if (line.trim() && !line.includes('lo:')) { // Skip loopback
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 16) {
          totalBytesIn += parseInt(parts[1] || '0')
          totalPacketsIn += parseInt(parts[2] || '0')
          totalBytesOut += parseInt(parts[9] || '0')
          totalPacketsOut += parseInt(parts[10] || '0')
        }
      }
    }
    
    const now = Date.now()
    const timeDiff = (now - previousNetworkStats.timestamp) / 1000
    
    const throughput = timeDiff > 0 ? {
      in: (totalBytesIn - previousNetworkStats.bytesIn) / timeDiff,
      out: (totalBytesOut - previousNetworkStats.bytesOut) / timeDiff
    } : { in: 0, out: 0 }
    
    previousNetworkStats = {
      bytesIn: totalBytesIn,
      bytesOut: totalBytesOut,
      packetsIn: totalPacketsIn,
      packetsOut: totalPacketsOut,
      timestamp: now
    }
    
    return {
      bytesIn: totalBytesIn,
      bytesOut: totalBytesOut,
      packetsIn: totalPacketsIn,
      packetsOut: totalPacketsOut,
      throughput
    }
  } catch {
    return {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
      throughput: { in: 0, out: 0 }
    }
  }
}

async function getDiskStats() {
  try {
    const { stdout } = await execAsync('df -B1 /')
    const lines = stdout.split('\n')
    const diskLine = lines[1]?.split(/\s+/)
    
    if (diskLine && diskLine.length >= 5) {
      const total = parseInt(diskLine[1])
      const used = parseInt(diskLine[2])
      const percent = parseInt(diskLine[4])
      
      // Try to get I/O stats
      let readRate = 0
      let writeRate = 0
      
      try {
        const ioStats = await fs.readFile('/proc/diskstats', 'utf-8')
        const lines = ioStats.split('\n')
        
        for (const line of lines) {
          if (line.includes('sda') || line.includes('nvme')) {
            const parts = line.trim().split(/\s+/)
            if (parts.length >= 10) {
              const readBytes = parseInt(parts[5] || '0') * 512
              const writeBytes = parseInt(parts[9] || '0') * 512
              
              const now = Date.now()
              const timeDiff = (now - previousDiskStats.timestamp) / 1000
              
              if (timeDiff > 0) {
                readRate = (readBytes - previousDiskStats.readBytes) / timeDiff
                writeRate = (writeBytes - previousDiskStats.writeBytes) / timeDiff
              }
              
              previousDiskStats = {
                readBytes,
                writeBytes,
                timestamp: now
              }
              
              break
            }
          }
        }
      } catch {
        // I/O stats not available
      }
      
      return { total, used, percent, readRate, writeRate }
    }
  } catch {
    // Fallback values
  }
  
  return { total: 0, used: 0, percent: 0, readRate: 0, writeRate: 0 }
}

async function getGPUStats() {
  try {
    // Try nvidia-smi for NVIDIA GPUs
    const { stdout } = await execAsync('nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu --format=csv,noheader,nounits')
    const [usage, memory, temperature] = stdout.trim().split(', ').map(v => parseInt(v))
    
    return {
      usage,
      memory,
      temperature
    }
  } catch {
    // GPU not available or not NVIDIA
    return undefined
  }
}

async function getSystemMetrics(): Promise<SystemMetrics> {
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  
  const [cpuUsage, cpuTemp, networkStats, diskStats, gpuStats] = await Promise.all([
    getCPUUsage(),
    getCPUTemperature(),
    getNetworkStats(),
    getDiskStats(),
    getGPUStats()
  ])
  
  return {
    cpu: {
      usage: cpuUsage,
      cores: cpus.length,
      temperature: cpuTemp,
      perCore: cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
        const idle = cpu.times.idle
        return Math.round((1 - idle / total) * 100)
      })
    },
    memory: {
      total: totalMem,
      used: usedMem,
      available: freeMem,
      percent: (usedMem / totalMem) * 100
    },
    disk: diskStats,
    network: networkStats,
    gpu: gpuStats
  }
}

export function setupMetricsWebSocket(_app: FastifyInstance, io: Server) {
  const metricsNamespace = io.of('/metrics')
  
  metricsNamespace.on('connection', (socket) => {
    console.log('Client connected to metrics WebSocket')
    
    // Send initial metrics
    getSystemMetrics().then(metrics => {
      socket.emit('metrics', {
        type: 'metrics',
        payload: metrics
      })
    })
    
    // Set up interval to send metrics
    const interval = setInterval(async () => {
      try {
        const metrics = await getSystemMetrics()
        socket.emit('metrics', {
          type: 'metrics',
          payload: metrics
        })
      } catch (error) {
        console.error('Error getting metrics:', error)
      }
    }, 1000) // Send every second
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from metrics WebSocket')
      clearInterval(interval)
    })
  })
  
  // Mock agent metrics for demonstration
  setInterval(() => {
    const mockAgentMetrics = [
      {
        agentId: 'agent-1',
        name: 'Frontend Expert',
        status: Math.random() > 0.3 ? 'active' : 'idle',
        tokenUsage: Math.floor(Math.random() * 100000),
        responseTime: Math.floor(Math.random() * 5000),
        errorRate: Math.random() * 10,
        taskCompletionRate: Math.floor(Math.random() * 100),
        cost: Math.random() * 10,
        lastActive: Date.now()
      },
      {
        agentId: 'agent-2',
        name: 'Backend Specialist',
        status: Math.random() > 0.5 ? 'active' : 'idle',
        tokenUsage: Math.floor(Math.random() * 150000),
        responseTime: Math.floor(Math.random() * 3000),
        errorRate: Math.random() * 5,
        taskCompletionRate: Math.floor(Math.random() * 100),
        cost: Math.random() * 15,
        lastActive: Date.now()
      },
      {
        agentId: 'agent-3',
        name: 'DevOps Engineer',
        status: Math.random() > 0.7 ? 'active' : 'idle',
        tokenUsage: Math.floor(Math.random() * 80000),
        responseTime: Math.floor(Math.random() * 2000),
        errorRate: Math.random() * 3,
        taskCompletionRate: Math.floor(Math.random() * 100),
        cost: Math.random() * 8,
        lastActive: Date.now()
      }
    ]
    
    metricsNamespace.emit('metrics', {
      type: 'agent-metrics',
      payload: mockAgentMetrics
    })
  }, 5000) // Send agent metrics every 5 seconds
}