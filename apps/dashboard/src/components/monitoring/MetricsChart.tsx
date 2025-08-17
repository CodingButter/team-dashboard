'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui-components'
import { 
  LineChart, 
  Line, 
  Area,
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { SystemMetricsData } from '../SystemMonitor'

interface MetricsChartProps {
  data: SystemMetricsData[]
  metric: 'cpu' | 'memory' | 'network' | 'disk'
  title: string
  color?: string
  height?: number
}

export function MetricsChart({ 
  data, 
  metric, 
  title, 
  color = 'hsl(var(--primary))',
  height = 300 
}: MetricsChartProps) {
  
  const chartData = useMemo(() => {
    return data.map(item => {
      const time = new Date(item.timestamp).toLocaleTimeString()
      
      switch (metric) {
        case 'cpu':
          return {
            time,
            value: item.cpu.usage,
            temperature: item.cpu.temperature
          }
        case 'memory':
          return {
            time,
            value: item.memory.percent,
            used: item.memory.used / (1024 * 1024 * 1024), // Convert to GB
            available: item.memory.available / (1024 * 1024 * 1024)
          }
        case 'network':
          return {
            time,
            inbound: item.network.bytesIn / 1024 / 1024, // Convert to MB
            outbound: item.network.bytesOut / 1024 / 1024
          }
        case 'disk':
          return {
            time,
            usage: item.disk.percent,
            readRate: item.disk.readRate || 0,
            writeRate: item.disk.writeRate || 0
          }
        default:
          return { time, value: 0 }
      }
    })
  }, [data, metric])

  const formatYAxis = (value: number) => {
    if (metric === 'memory') return `${value.toFixed(0)}GB`
    if (metric === 'network') return `${value.toFixed(0)}MB`
    if (metric === 'cpu' || metric === 'disk') return `${value}%`
    return value.toString()
  }

  const getTooltipContent = (value: number, name: string) => {
    if (metric === 'memory' && name !== 'value') return `${value.toFixed(2)} GB`
    if (metric === 'network') return `${value.toFixed(2)} MB`
    if (name === 'value' || name === 'usage') return `${value.toFixed(1)}%`
    if (name === 'temperature') return `${value}°C`
    return value.toFixed(2)
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {data.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              Last {data.length} samples
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {metric === 'network' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={getTooltipContent}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="inbound" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorInbound)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="outbound" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorOutbound)" 
                strokeWidth={2}
              />
            </AreaChart>
          ) : metric === 'disk' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={getTooltipContent}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="usage" 
                stroke={color} 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="readRate" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="writeRate" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatYAxis}
                domain={metric === 'cpu' || metric === 'memory' ? [0, 100] : undefined}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={getTooltipContent}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fillOpacity={1} 
                fill={`url(#color${metric})`} 
                strokeWidth={2}
              />
              {metric === 'cpu' && chartData[0]?.temperature && (
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  yAxisId="temp"
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}