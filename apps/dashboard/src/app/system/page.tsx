'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { SystemMetrics } from '../../components/metrics/system-metrics'

export default function SystemPage() {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: {
      usage: 45.2,
      cores: 8,
      temperature: 62,
    },
    memory: {
      total: 16 * 1024 * 1024 * 1024,
      used: 8.5 * 1024 * 1024 * 1024,
      available: 7.5 * 1024 * 1024 * 1024,
      percent: 53.1,
    },
    disk: {
      total: 1 * 1024 * 1024 * 1024 * 1024,
      used: 650 * 1024 * 1024 * 1024,
      percent: 65.0,
    },
    network: {
      bytesIn: 1250000000,
      bytesOut: 890000000,
      packetsIn: 125000,
      packetsOut: 89000,
    },
  })

  const [alerts] = useState([
    {
      id: 1,
      level: 'warning' as const,
      category: 'resource' as const,
      message: 'CPU usage has been above 80% for 5 minutes',
      timestamp: Date.now() - 300000,
    },
    {
      id: 2,
      level: 'info' as const,
      category: 'agent' as const,
      message: 'Agent "Frontend Developer" completed task successfully',
      timestamp: Date.now() - 120000,
    },
    {
      id: 3,
      level: 'error' as const,
      category: 'performance' as const,
      message: 'Memory usage critical - 95% utilized',
      timestamp: Date.now() - 60000,
    },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage: Math.max(0, Math.min(100, prev.cpu.usage + (Math.random() - 0.5) * 10)),
        },
        memory: {
          ...prev.memory,
          percent: Math.max(0, Math.min(100, prev.memory.percent + (Math.random() - 0.5) * 5)),
        }
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'error': return '🔴'
      case 'warning': return '🟡'
      case 'info': return '🔵'
      default: return '⚪'
    }
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20'
      case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'info': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Monitor</h1>
          <p className="text-muted-foreground">
            Real-time system metrics and performance monitoring
          </p>
        </div>

        {/* System Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemMetrics metrics={systemMetrics} />
          
          {/* Process List */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Running Processes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-muted-foreground">1234</span>
                  <span className="text-foreground">claude-agent-frontend</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground">12.5% CPU</span>
                  <span className="text-muted-foreground">256MB RAM</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-muted-foreground">1235</span>
                  <span className="text-foreground">claude-agent-backend</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground">8.2% CPU</span>
                  <span className="text-muted-foreground">512MB RAM</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-muted-foreground">1236</span>
                  <span className="text-foreground">claude-agent-devops</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground">25.8% CPU</span>
                  <span className="text-muted-foreground">128MB RAM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Alerts</h3>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded border ${getAlertColor(alert.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getAlertIcon(alert.level)}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium capitalize">{alert.level}</span>
                        <span className="text-xs text-muted-foreground">
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Charts Placeholder */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Performance Charts</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div>Performance charts will be implemented with Chart.js/D3</div>
              <div className="text-sm mt-2">Real-time CPU, Memory, and Network graphs</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}