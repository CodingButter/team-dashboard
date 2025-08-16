'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui-components'
import { Badge } from '../ui-components'
import { Progress } from '../ui-components'
import { 
  Activity,
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  User
} from 'lucide-react'
import { AgentMetric } from '../SystemMonitor'

interface AgentMetricsProps {
  metrics: AgentMetric[]
}

export function AgentMetrics({ metrics }: AgentMetricsProps) {
  const getStatusIcon = (status: AgentMetric['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="h-4 w-4 text-green-500" />
      case 'idle':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'stopped':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: AgentMetric['status']) => {
    const variants = {
      active: 'default' as const,
      idle: 'secondary' as const,
      error: 'destructive' as const,
      stopped: 'outline' as const
    }
    
    return (
      <Badge variant={variants[status]} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    )
  }

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cost)
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTokenUsage = (tokens: number) => {
    if (tokens < 1000) return tokens.toString()
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
    return `${(tokens / 1000000).toFixed(2)}M`
  }

  const totalCost = metrics.reduce((sum, agent) => sum + agent.cost, 0)
  const activeAgents = metrics.filter(a => a.status === 'active').length
  const avgResponseTime = metrics.reduce((sum, a) => sum + a.responseTime, 0) / metrics.length
  const totalTokens = metrics.reduce((sum, a) => sum + a.tokenUsage, 0)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAgents}/{metrics.length}</div>
            <Progress 
              value={(activeAgents / metrics.length) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(totalCost)}</div>
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span>Last 24 hours</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseTime(avgResponseTime)}</div>
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 mr-1 text-yellow-500" />
              <span>All agents</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokenUsage(totalTokens)}</div>
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 mr-1 text-blue-500" />
              <span>Total consumed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-sm text-muted-foreground">
                    Agent
                  </th>
                  <th className="text-left p-2 font-medium text-sm text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right p-2 font-medium text-sm text-muted-foreground">
                    Tokens
                  </th>
                  <th className="text-right p-2 font-medium text-sm text-muted-foreground">
                    Response
                  </th>
                  <th className="text-right p-2 font-medium text-sm text-muted-foreground">
                    Error Rate
                  </th>
                  <th className="text-right p-2 font-medium text-sm text-muted-foreground">
                    Completion
                  </th>
                  <th className="text-right p-2 font-medium text-sm text-muted-foreground">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(agent => (
                  <tr key={agent.agentId} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      {getStatusBadge(agent.status)}
                    </td>
                    <td className="p-2 text-right font-mono text-sm">
                      {formatTokenUsage(agent.tokenUsage)}
                    </td>
                    <td className="p-2 text-right font-mono text-sm">
                      {formatResponseTime(agent.responseTime)}
                    </td>
                    <td className="p-2 text-right">
                      <span className={`font-mono text-sm ${
                        agent.errorRate > 5 ? 'text-red-500' :
                        agent.errorRate > 2 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {agent.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress 
                          value={agent.taskCompletionRate} 
                          className="w-16 h-2"
                        />
                        <span className="text-sm font-mono">
                          {agent.taskCompletionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-right font-mono text-sm">
                      {formatCost(agent.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="p-2">Total</td>
                  <td className="p-2">
                    <Badge variant="outline">
                      {metrics.length} agents
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatTokenUsage(totalTokens)}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatResponseTime(avgResponseTime)}
                  </td>
                  <td className="p-2 text-right font-mono">
                    {(metrics.reduce((sum, a) => sum + a.errorRate, 0) / metrics.length).toFixed(1)}%
                  </td>
                  <td className="p-2 text-right font-mono">
                    {(metrics.reduce((sum, a) => sum + a.taskCompletionRate, 0) / metrics.length).toFixed(0)}%
                  </td>
                  <td className="p-2 text-right font-mono">
                    {formatCost(totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}