'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ToolApprovalRequest } from '@team-dashboard/types'
import { useWebSocket } from '../../hooks/use-websocket'

interface ToolApprovalNotification {
  id: string
  request: ToolApprovalRequest
  timestamp: number
  acknowledged: boolean
}

interface ToolApprovalNotificationsProps {
  onRequestClick?: (request: ToolApprovalRequest) => void
  onNotificationDismiss?: (notificationId: string) => void
  maxNotifications?: number
}

export function ToolApprovalNotifications({
  onRequestClick,
  onNotificationDismiss,
  maxNotifications = 5
}: ToolApprovalNotificationsProps) {
  const [notifications, setNotifications] = useState<ToolApprovalNotification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const websocket = useWebSocket()

  // Play notification sound for critical requests
  const playNotificationSound = useCallback((riskLevel: string) => {
    if (!soundEnabled) return

    try {
      // Create a simple beep sound based on risk level
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different risk levels
      const frequencies = {
        critical: 800,
        high: 600,
        medium: 400,
        low: 300
      }

      oscillator.frequency.setValueAtTime(frequencies[riskLevel as keyof typeof frequencies] || 400, audioContext.currentTime)
      oscillator.type = 'sine'

      // Different durations for different risk levels
      const durations = {
        critical: 0.5,
        high: 0.3,
        medium: 0.2,
        low: 0.1
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + (durations[riskLevel as keyof typeof durations] || 0.2))
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }, [soundEnabled])

  // Add new notification
  const addNotification = useCallback((request: ToolApprovalRequest) => {
    const notification: ToolApprovalNotification = {
      id: `notification-${request.id}-${Date.now()}`,
      request,
      timestamp: Date.now(),
      acknowledged: false
    }

    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications)
      return updated
    })

    // Play sound for high-risk requests
    if (request.riskLevel === 'critical' || request.riskLevel === 'high') {
      playNotificationSound(request.riskLevel)
    }

    // Auto-dismiss low-risk notifications after 10 seconds
    if (request.riskLevel === 'low') {
      setTimeout(() => {
        dismissNotification(notification.id)
      }, 10000)
    }
  }, [maxNotifications, playNotificationSound])

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    onNotificationDismiss?.(notificationId)
  }, [onNotificationDismiss])

  // Acknowledge notification (mark as seen but keep visible)
  const acknowledgeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, acknowledged: true } : n
    ))
  }, [])

  // Handle notification click
  const handleNotificationClick = useCallback((notification: ToolApprovalNotification) => {
    acknowledgeNotification(notification.id)
    onRequestClick?.(notification.request)
  }, [acknowledgeNotification, onRequestClick])

  // Set up WebSocket listener for new tool approval requests
  useEffect(() => {
    const handleNewRequest = (message: any) => {
      if (message.type === 'tool:approval_required') {
        addNotification(message.payload)
      }
    }

    // In a real implementation, you'd register this with the WebSocket
    // websocket.addMessageHandler('tool:approval_required', handleNewRequest)

    return () => {
      // Clean up
      // websocket.removeMessageHandler('tool:approval_required', handleNewRequest)
    }
  }, [addNotification, websocket])

  // Request notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Show browser notifications for critical requests
  useEffect(() => {
    notifications.forEach(notification => {
      if (!notification.acknowledged && 
          (notification.request.riskLevel === 'critical' || notification.request.riskLevel === 'high') &&
          'Notification' in window && 
          Notification.permission === 'granted') {
        
        const browserNotification = new Notification(
          `Tool Approval Required - ${notification.request.riskLevel.toUpperCase()} Risk`,
          {
            body: `${notification.request.agentName} wants to use ${notification.request.toolName}`,
            icon: '/favicon.ico',
            tag: notification.id,
            requireInteraction: notification.request.riskLevel === 'critical'
          }
        )

        browserNotification.onclick = () => {
          window.focus()
          handleNotificationClick(notification)
          browserNotification.close()
        }

        // Auto-close after 10 seconds unless critical
        if (notification.request.riskLevel !== 'critical') {
          setTimeout(() => browserNotification.close(), 10000)
        }
      }
    })
  }, [notifications, handleNotificationClick])

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'border-green-400 bg-green-50 dark:bg-green-950/20'
      case 'medium': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
      case 'high': return 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
      case 'critical': return 'border-red-400 bg-red-50 dark:bg-red-950/20 animate-pulse'
      default: return 'border-gray-400 bg-gray-50 dark:bg-gray-950/20'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Settings Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            soundEnabled 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
          }`}
          title={`Sound notifications ${soundEnabled ? 'enabled' : 'disabled'}`}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Notifications */}
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`border-2 rounded-lg p-4 shadow-lg cursor-pointer transition-all hover:shadow-xl ${
            getRiskColor(notification.request.riskLevel)
          } ${notification.acknowledged ? 'opacity-75' : ''}`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getRiskIcon(notification.request.riskLevel)}</span>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                Tool Approval Required
              </span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                dismissNotification(notification.id)
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1 text-sm">
            <div className="text-gray-800 dark:text-gray-200">
              <span className="font-medium">{notification.request.agentName}</span> wants to use{' '}
              <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1 rounded">
                {notification.request.toolName}
              </span>
            </div>
            
            <div className="text-gray-600 dark:text-gray-400 text-xs">
              {notification.request.riskLevel.toUpperCase()} risk • {formatTimeAgo(notification.timestamp)}
            </div>
            
            {notification.request.riskFactors.length > 0 && (
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-2">
                <div className="font-medium">Risk factors:</div>
                <ul className="list-disc list-inside">
                  {notification.request.riskFactors.slice(0, 2).map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                  {notification.request.riskFactors.length > 2 && (
                    <li>... and {notification.request.riskFactors.length - 2} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            Click to review and approve
          </div>
        </div>
      ))}

      {/* Clear all button */}
      {notifications.length > 1 && (
        <button
          onClick={() => setNotifications([])}
          className="w-full px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
        >
          Clear all notifications
        </button>
      )}
    </div>
  )
}

// Export hook for easy integration
export function useToolApprovalNotifications() {
  const [hasUnacknowledged, setHasUnacknowledged] = useState(false)
  const [count, setCount] = useState(0)

  // This would typically be connected to the notification state
  const markAllAsAcknowledged = useCallback(() => {
    setHasUnacknowledged(false)
  }, [])

  const getNotificationBadge = () => {
    if (!hasUnacknowledged || count === 0) return null
    
    return (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    )
  }

  return {
    hasUnacknowledged,
    count,
    markAllAsAcknowledged,
    getNotificationBadge
  }
}