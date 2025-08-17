/**
 * @package agent-manager/src/lifecycle/monitoring
 * Resource data collection utilities
 */

import * as os from 'os'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { AgentProcess } from '@team-dashboard/types'
import type { ResourceSample } from './types.js'

export class ResourceCollector {
  private static instance: ResourceCollector
  private cpuCache = new Map<number, { user: number; system: number; timestamp: number }>()

  static getInstance(): ResourceCollector {
    if (!ResourceCollector.instance) {
      ResourceCollector.instance = new ResourceCollector()
    }
    return ResourceCollector.instance
  }

  async gatherResourceSample(process: AgentProcess): Promise<ResourceSample> {
    const timestamp = Date.now()
    
    const [cpu, memory, io, network, handles] = await Promise.all([
      this.getCpuUsage(process.pid),
      this.getMemoryUsage(process.pid),
      this.getIOUsage(process.pid),
      this.getNetworkUsage(process.pid),
      this.getHandleUsage(process.pid)
    ])

    return {
      timestamp,
      cpu,
      memory,
      io,
      network,
      handles
    }
  }

  private async getCpuUsage(pid: number): Promise<{ percent: number; system: number; user: number }> {
    try {
      if (process.platform === 'linux') {
        return await this.getLinuxCpuUsage(pid)
      } else if (process.platform === 'darwin') {
        return await this.getMacCpuUsage(pid)
      } else {
        return await this.getGenericCpuUsage()
      }
    } catch (error) {
      return { percent: 0, system: 0, user: 0 }
    }
  }

  private async getLinuxCpuUsage(pid: number): Promise<{ percent: number; system: number; user: number }> {
    const statPath = `/proc/${pid}/stat`
    const statContent = await fs.readFile(statPath, 'utf-8')
    const stats = statContent.split(' ')
    
    const utime = parseInt(stats[13], 10)
    const stime = parseInt(stats[14], 10)
    const totalTime = utime + stime
    
    const cached = this.cpuCache.get(pid)
    const currentTime = Date.now()
    
    if (cached) {
      const timeDiff = currentTime - cached.timestamp
      const cpuDiff = totalTime - (cached.user + cached.system)
      const percent = (cpuDiff / (timeDiff / 1000) / os.cpus().length) * 100
      
      this.cpuCache.set(pid, { user: utime, system: stime, timestamp: currentTime })
      return { percent: Math.min(percent, 100), system: stime, user: utime }
    } else {
      this.cpuCache.set(pid, { user: utime, system: stime, timestamp: currentTime })
      return { percent: 0, system: stime, user: utime }
    }
  }

  private async getMacCpuUsage(pid: number): Promise<{ percent: number; system: number; user: number }> {
    // Simplified macOS implementation
    return { percent: 0, system: 0, user: 0 }
  }

  private async getGenericCpuUsage(): Promise<{ percent: number; system: number; user: number }> {
    const cpus = os.cpus()
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0)
    const totalTick = cpus.reduce((acc, cpu) => 
      acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0)
    
    const idle = totalIdle / cpus.length
    const total = totalTick / cpus.length
    const percent = 100 - (100 * idle / total)
    
    return { percent, system: 0, user: 0 }
  }

  private async getMemoryUsage(pid: number): Promise<{ rss: number; heap: number; external: number; usage: number }> {
    try {
      if (process.platform === 'linux') {
        const statmPath = `/proc/${pid}/statm`
        const statmContent = await fs.readFile(statmPath, 'utf-8')
        const [, rss] = statmContent.split(' ').map(Number)
        const rssBytes = rss * 4096 // Page size is typically 4KB
        
        const totalMemory = os.totalmem()
        const usage = (rssBytes / totalMemory) * 100
        
        return { rss: rssBytes, heap: 0, external: 0, usage }
      } else {
        // Fallback for other platforms
        const memUsage = process.memoryUsage()
        const totalMemory = os.totalmem()
        const usage = (memUsage.rss / totalMemory) * 100
        
        return {
          rss: memUsage.rss,
          heap: memUsage.heapUsed,
          external: memUsage.external,
          usage
        }
      }
    } catch (error) {
      return { rss: 0, heap: 0, external: 0, usage: 0 }
    }
  }

  private async getIOUsage(pid: number): Promise<{ readBytes: number; writeBytes: number; readOps: number; writeOps: number }> {
    try {
      if (process.platform === 'linux') {
        const ioPath = `/proc/${pid}/io`
        const ioContent = await fs.readFile(ioPath, 'utf-8')
        const lines = ioContent.split('\n')
        
        let readBytes = 0, writeBytes = 0, readOps = 0, writeOps = 0
        
        for (const line of lines) {
          if (line.startsWith('read_bytes:')) readBytes = parseInt(line.split(':')[1].trim(), 10)
          if (line.startsWith('write_bytes:')) writeBytes = parseInt(line.split(':')[1].trim(), 10)
          if (line.startsWith('syscr:')) readOps = parseInt(line.split(':')[1].trim(), 10)
          if (line.startsWith('syscw:')) writeOps = parseInt(line.split(':')[1].trim(), 10)
        }
        
        return { readBytes, writeBytes, readOps, writeOps }
      }
    } catch (error) {
      // Ignore errors and return zeros
    }
    
    return { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 }
  }

  private async getNetworkUsage(pid: number): Promise<{ rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> {
    // Network usage per process is complex to track accurately
    // Return zeros for now - could be implemented with netstat parsing
    return { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 }
  }

  private async getHandleUsage(pid: number): Promise<{ open: number; peak: number }> {
    try {
      if (process.platform === 'linux') {
        const fdDir = `/proc/${pid}/fd`
        const files = await fs.readdir(fdDir)
        return { open: files.length, peak: files.length }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return { open: 0, peak: 0 }
  }
}