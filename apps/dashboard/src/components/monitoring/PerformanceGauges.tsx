'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui-components'
import { SystemMetricsData } from '../SystemMonitor'
import { Cpu, MemoryStick, HardDrive, Network, Gauge } from 'lucide-react'

interface PerformanceGaugesProps {
  metrics: SystemMetricsData
}

export function PerformanceGauges({ metrics }: PerformanceGaugesProps) {
  const createGauge = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    
    const getColor = () => {
      if (percentage < 50) return '#10b981' // green
      if (percentage < 80) return '#f59e0b' // yellow
      return '#ef4444' // red
    }

    return (
      <svg width="120" height="120" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={getColor()}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        {/* Center text */}
        <g transform="rotate(90 60 60)">
          <text
            x="60"
            y="60"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-2xl font-bold"
          >
            {value.toFixed(0)}%
          </text>
        </g>
      </svg>
    )
  }

  const gauges = [
    {
      title: 'CPU Usage',
      icon: Cpu,
      value: metrics.cpu.usage,
      subtitle: `${metrics.cpu.cores} cores`,
      color: 'text-blue-500'
    },
    {
      title: 'Memory',
      icon: MemoryStick,
      value: metrics.memory.percent,
      subtitle: `${(metrics.memory.used / (1024 * 1024 * 1024)).toFixed(1)}GB used`,
      color: 'text-purple-500'
    },
    {
      title: 'Disk',
      icon: HardDrive,
      value: metrics.disk.percent,
      subtitle: `${(metrics.disk.used / (1024 * 1024 * 1024)).toFixed(1)}GB used`,
      color: 'text-orange-500'
    },
    {
      title: 'Network Load',
      icon: Network,
      value: Math.min(
        ((metrics.network.bytesIn + metrics.network.bytesOut) / (100 * 1024 * 1024)) * 100,
        100
      ), // Assuming 100MB/s as max
      subtitle: 'Traffic',
      color: 'text-green-500'
    }
  ]

  if (metrics.gpu) {
    gauges.push({
      title: 'GPU Usage',
      icon: Gauge,
      value: metrics.gpu.usage,
      subtitle: `Memory: ${metrics.gpu.memory}%`,
      color: 'text-red-500'
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {gauges.map((gauge, index) => {
        const Icon = gauge.icon
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className={`h-4 w-4 ${gauge.color}`} />
                {gauge.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {createGauge(gauge.value)}
              <p className="mt-2 text-xs text-muted-foreground">
                {gauge.subtitle}
              </p>
            </CardContent>
            {/* Animated background gradient */}
            <div 
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${50 + gauge.value / 2}% 50%, 
                  ${gauge.value > 80 ? 'rgba(239, 68, 68, 0.3)' : 
                    gauge.value > 50 ? 'rgba(245, 158, 11, 0.3)' : 
                    'rgba(16, 185, 129, 0.3)'} 0%, 
                  transparent 70%)`
              }}
            />
          </Card>
        )
      })}
    </div>
  )
}