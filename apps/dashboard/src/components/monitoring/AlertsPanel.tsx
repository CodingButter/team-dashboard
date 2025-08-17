'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '../ui-components'
import { Button } from '../ui-components'
import { Badge } from '../ui-components'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle,
  CheckCircle,
  Bell,
  BellOff
} from 'lucide-react'
import { SystemAlert } from '../SystemMonitor'

interface AlertsPanelProps {
  alerts: SystemAlert[]
  onAcknowledge: (alertId: string) => void
  maxVisible?: number
}

export function AlertsPanel({ 
  alerts, 
  onAcknowledge,
  maxVisible = 5 
}: AlertsPanelProps) {
  
  const getAlertIcon = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-400" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getAlertVariant = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const visibleAlerts = alerts.slice(0, maxVisible)
  const hiddenCount = alerts.length - maxVisible

  if (alerts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle>All Systems Operational</AlertTitle>
        <AlertDescription>
          No active alerts. All metrics are within normal thresholds.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Active Alerts
          <Badge variant="destructive" className="ml-2">
            {alerts.length}
          </Badge>
        </h3>
        {alerts.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => alerts.forEach(a => onAcknowledge(a.id))}
          >
            <BellOff className="h-4 w-4 mr-2" />
            Acknowledge All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visibleAlerts.map(alert => (
          <Alert 
            key={alert.id} 
            variant={getAlertVariant(alert.severity)}
            className="flex items-start justify-between"
          >
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.severity)}
              <div className="flex-1">
                <AlertTitle className="flex items-center gap-2">
                  <Badge 
                    variant={
                      alert.severity === 'critical' ? 'destructive' :
                      alert.severity === 'error' ? 'destructive' :
                      alert.severity === 'warning' ? 'secondary' :
                      'default'
                    }
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span>{alert.component}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </AlertTitle>
                <AlertDescription className="mt-1">
                  {alert.message}
                  {alert.threshold && alert.currentValue && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">Threshold: </span>
                      <span className="font-mono">{alert.threshold}</span>
                      <span className="text-muted-foreground mx-2">|</span>
                      <span className="text-muted-foreground">Current: </span>
                      <span className="font-mono font-semibold">
                        {alert.currentValue.toFixed(1)}
                      </span>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAcknowledge(alert.id)}
              className="ml-4"
            >
              Acknowledge
            </Button>
          </Alert>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          And {hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}...
        </div>
      )}
    </div>
  )
}