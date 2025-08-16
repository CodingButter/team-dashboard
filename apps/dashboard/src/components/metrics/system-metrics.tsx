'use client'

import React from 'react'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature?: number
  }
  memory: {
    total: number
    used: number
    available: number
    percent: number
  }
  disk: {
    total: number
    used: number
    percent: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
  }
}

interface SystemMetricsProps {
  metrics?: SystemMetrics
  className?: string
}

export function SystemMetrics({ metrics, className = '' }: SystemMetricsProps) {
  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getUsageColor = (percent: number) => {
    if (percent < 50) return 'text-green-400'
    if (percent < 80) return 'text-yellow-400'
    return 'text-red-400'
  }

  const ProgressBar = ({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) => {
    const percentage = (value / max) * 100
    
    return (
      <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            percentage < 50 ? 'bg-green-400' :
            percentage < 80 ? 'bg-yellow-400' : 'bg-red-400'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-foreground mb-4">System Metrics</h3>
        <div className="text-center text-muted-foreground py-8">
          <div className="animate-pulse">Loading system metrics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-foreground mb-6">System Metrics</h3>
      
      <div className="space-y-6">
        {/* CPU Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-foreground">CPU Usage</span>
              <span className="text-xs text-muted-foreground">({metrics.cpu.cores} cores)</span>
            </div>
            <span className={`text-sm font-medium ${getUsageColor(metrics.cpu.usage)}`}>
              {metrics.cpu.usage.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={metrics.cpu.usage} />
          {metrics.cpu.temperature && (
            <div className="text-xs text-muted-foreground">
              Temperature: {metrics.cpu.temperature}°C
            </div>
          )}
        </div>

        {/* Memory Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Memory Usage</span>
            <span className={`text-sm font-medium ${getUsageColor(metrics.memory.percent)}`}>
              {metrics.memory.percent.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={metrics.memory.percent} />
          <div className="text-xs text-muted-foreground">
            {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)} 
            ({formatBytes(metrics.memory.available)} available)
          </div>
        </div>

        {/* Disk Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Disk Usage</span>
            <span className={`text-sm font-medium ${getUsageColor(metrics.disk.percent)}`}>
              {metrics.disk.percent.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={metrics.disk.percent} />
          <div className="text-xs text-muted-foreground">
            {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
          </div>
        </div>

        {/* Network Metrics */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Network Activity</span>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Incoming</div>
              <div className="text-foreground font-medium">{formatBytes(metrics.network.bytesIn)}</div>
              <div className="text-muted-foreground">{metrics.network.packetsIn.toLocaleString()} packets</div>
            </div>
            <div>
              <div className="text-muted-foreground">Outgoing</div>
              <div className="text-foreground font-medium">{formatBytes(metrics.network.bytesOut)}</div>
              <div className="text-muted-foreground">{metrics.network.packetsOut.toLocaleString()} packets</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}