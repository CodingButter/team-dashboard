'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Alert, AlertDescription, Badge, ScrollArea } from './ui-components'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Gauge,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { SystemMetrics } from './metrics/system-metrics'
import { MetricsChart } from './monitoring/MetricsChart'
import { AlertsPanel } from './monitoring/AlertsPanel'
import { AgentMetrics } from './monitoring/AgentMetrics'
import { PerformanceGauges } from './monitoring/PerformanceGauges'

export interface SystemMetricsData {
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
  timestamp: number
}

export interface SystemAlert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  component: string
  message: string
  timestamp: number
  acknowledged: boolean
  threshold?: number
  currentValue?: number
}

export interface AgentMetric {
  agentId: string
  name: string
  status: 'active' | 'idle' | 'error' | 'stopped'
  tokenUsage: number
  responseTime: number
  errorRate: number
  taskCompletionRate: number
  cost: number
  lastActive: number
}

interface SystemMonitorProps {
  refreshRate?: number
  retentionHours?: number
  className?: string
}

export function SystemMonitor({ 
  refreshRate = 1000, 
  retentionHours = 24,
  className = ''
}: SystemMonitorProps) {
  const [metrics, setMetrics] = useState<SystemMetricsData | null>(null)
  const [historicalData, setHistoricalData] = useState<SystemMetricsData[]>([])
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())
  const wsRef = useRef<WebSocket | null>(null)

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002/metrics')
        
        ws.onopen = () => {
          console.log('Connected to metrics WebSocket')
          setIsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'metrics') {
              const newMetrics: SystemMetricsData = {
                ...data.payload,
                timestamp: Date.now()
              }
              setMetrics(newMetrics)
              setLastUpdate(Date.now())
              
              // Update historical data
              setHistoricalData(prev => {
                const cutoff = Date.now() - (retentionHours * 60 * 60 * 1000)
                const filtered = prev.filter(m => m.timestamp > cutoff)
                return [...filtered, newMetrics].slice(-1000) // Keep max 1000 points
              })
              
              // Check for alerts
              checkThresholds(newMetrics)
            } else if (data.type === 'alert') {
              setAlerts(prev => [data.payload, ...prev].slice(0, 100))
            } else if (data.type === 'agent-metrics') {
              setAgentMetrics(data.payload)
            }
          } catch (error) {
            console.error('Error parsing metrics:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
        }

        ws.onclose = () => {
          console.log('WebSocket closed, reconnecting...')
          setIsConnected(false)
          setTimeout(connectWebSocket, 5000)
        }

        wsRef.current = ws
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        setTimeout(connectWebSocket, 5000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [retentionHours])

  const checkThresholds = useCallback((metrics: SystemMetricsData) => {
    const newAlerts: SystemAlert[] = []

    // CPU threshold
    if (metrics.cpu.usage > 90) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        severity: 'critical',
        component: 'CPU',
        message: `CPU usage critical: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        threshold: 90,
        currentValue: metrics.cpu.usage
      })
    } else if (metrics.cpu.usage > 80) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        severity: 'warning',
        component: 'CPU',
        message: `CPU usage high: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        threshold: 80,
        currentValue: metrics.cpu.usage
      })
    }

    // Memory threshold
    if (metrics.memory.percent > 95) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        severity: 'critical',
        component: 'Memory',
        message: `Memory usage critical: ${metrics.memory.percent.toFixed(1)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        threshold: 95,
        currentValue: metrics.memory.percent
      })
    } else if (metrics.memory.percent > 85) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        severity: 'warning',
        component: 'Memory',
        message: `Memory usage high: ${metrics.memory.percent.toFixed(1)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        threshold: 85,
        currentValue: metrics.memory.percent
      })
    }

    // Disk threshold
    if (metrics.disk.percent > 90) {
      newAlerts.push({
        id: `disk-${Date.now()}`,
        severity: 'error',
        component: 'Disk',
        message: `Disk usage high: ${metrics.disk.percent.toFixed(1)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        threshold: 90,
        currentValue: metrics.disk.percent
      })
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 100))
    }
  }, [])

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    )
  }, [])

  const exportData = useCallback(() => {
    const exportData = {
      metrics: historicalData,
      alerts: alerts,
      agentMetrics: agentMetrics,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-metrics-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [historicalData, alerts, agentMetrics])

  const getConnectionStatus = () => {
    if (!isConnected) return { text: 'Disconnected', color: 'text-red-500' }
    const timeSinceUpdate = Date.now() - lastUpdate
    if (timeSinceUpdate < 2000) return { text: 'Live', color: 'text-green-500' }
    if (timeSinceUpdate < 5000) return { text: 'Delayed', color: 'text-yellow-500' }
    return { text: 'Stale', color: 'text-orange-500' }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6" />
                System Monitoring Dashboard
              </CardTitle>
              <CardDescription>
                Real-time system metrics and performance monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`} />
                <span className={`text-sm font-medium ${connectionStatus.color}`}>
                  {connectionStatus.text}
                </span>
              </div>
              <Button 
                onClick={exportData}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts Panel */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <AlertsPanel 
          alerts={alerts.filter(a => !a.acknowledged)} 
          onAcknowledge={acknowledgeAlert}
        />
      )}

      {/* Performance Gauges */}
      {metrics && (
        <PerformanceGauges metrics={metrics} />
      )}

      {/* Main Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SystemMetrics metrics={metrics} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MetricsChart 
          data={historicalData}
          metric="cpu"
          title="CPU Usage"
          color="hsl(var(--chart-1))"
        />
        <MetricsChart 
          data={historicalData}
          metric="memory"
          title="Memory Usage"
          color="hsl(var(--chart-2))"
        />
        <MetricsChart 
          data={historicalData}
          metric="network"
          title="Network Traffic"
          color="hsl(var(--chart-3))"
        />
        <MetricsChart 
          data={historicalData}
          metric="disk"
          title="Disk I/O"
          color="hsl(var(--chart-4))"
        />
      </div>

      {/* Agent Metrics */}
      {agentMetrics.length > 0 && (
        <AgentMetrics metrics={agentMetrics} />
      )}

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>
            Recent system alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {alerts.map(alert => (
                <Alert 
                  key={alert.id}
                  className={`${
                    alert.acknowledged ? 'opacity-50' : ''
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <Badge 
                        variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'error' ? 'destructive' :
                          alert.severity === 'warning' ? 'secondary' :
                          'default'
                        }
                        className="mr-2"
                      >
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.component}:</span>
                      <span className="ml-2">{alert.message}</span>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}