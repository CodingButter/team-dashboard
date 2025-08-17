'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  WSMessage, 
  MessageType, 
  AuthMessage,
  AgentStatusMessage,
  AgentOutputMessage,
  MetricsUpdateMessage,
  MessageFactory
} from '@team-dashboard/types'

interface WebSocketState {
  connected: boolean
  error: string | null
  reconnecting: boolean
}

interface UseWebSocketReturn {
  state: WebSocketState
  sendMessage: (message: WSMessage) => void
  subscribeToAgent: (agentId: string) => void
  subscribeToMetrics: () => void
  createAgent: (name: string, model: 'claude-3-opus' | 'claude-3-sonnet', workspace: string) => void
  sendCommand: (agentId: string, command: string) => void
}

export function useWebSocket(): UseWebSocketReturn {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    error: null,
    reconnecting: false
  })
  
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const messageHandlersRef = useRef<Map<MessageType, (msg: WSMessage) => void>>(new Map())
  
  // Exponential backoff state for intelligent reconnection
  const reconnectAttempts = useRef<number>(0)
  const maxReconnectAttempts = useRef<number>(10)
  const baseReconnectDelay = useRef<number>(1000) // Start with 1 second
  const maxReconnectDelay = useRef<number>(60000) // Cap at 1 minute

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    setState(prev => ({ ...prev, reconnecting: true, error: null }))

    try {
      const socket = io('ws://localhost:3001', {
        transports: ['websocket'],
        timeout: 5000,
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setState(prev => ({ ...prev, connected: true, reconnecting: false, error: null }))
        
        // Reset reconnection attempts on successful connection
        reconnectAttempts.current = 0
        
        // Send authentication message
        const authMessage = MessageFactory.createAuth('dummy-jwt-token', `client-${Date.now()}`)
        socket.emit('message', authMessage)
      })

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        setState(prev => ({ ...prev, connected: false }))
        
        // Attempt to reconnect
        if (reason !== 'io client disconnect') {
          scheduleReconnect()
        }
      })

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setState(prev => ({ ...prev, connected: false, error: error.message, reconnecting: false }))
        scheduleReconnect()
      })

      socket.on('message', (data: WSMessage) => {
        const handler = messageHandlersRef.current.get(data.type)
        if (handler) {
          handler(data)
        } else {
          console.log('Received message:', data)
        }
      })

      socketRef.current = socket
    } catch (error) {
      console.error('Failed to create socket:', error)
      setState(prev => ({ ...prev, error: 'Connection failed', reconnecting: false }))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    // Reset reconnection attempts on manual disconnect
    reconnectAttempts.current = 0
    setState(prev => ({ ...prev, connected: false, reconnecting: false }))
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return
    
    // Check if we've exceeded max attempts
    if (reconnectAttempts.current >= maxReconnectAttempts.current) {
      console.warn('Max reconnection attempts reached, stopping reconnection')
      setState(prev => ({ ...prev, reconnecting: false, error: 'Connection failed after maximum attempts' }))
      return
    }
    
    setState(prev => ({ ...prev, reconnecting: true }))
    
    // Calculate exponential backoff delay: min(baseDelay * 2^attempts, maxDelay)
    const delay = Math.min(
      baseReconnectDelay.current * Math.pow(2, reconnectAttempts.current),
      maxReconnectDelay.current
    )
    
    // Add jitter to prevent thundering herd: ±25% random variance
    const jitter = delay * 0.25 * (Math.random() * 2 - 1)
    const finalDelay = Math.max(1000, delay + jitter) // Minimum 1 second
    
    console.log(`WebSocket reconnecting in ${Math.round(finalDelay/1000)}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts.current})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = undefined
      reconnectAttempts.current++
      connect()
    }, finalDelay)
  }, [connect])

  const sendMessage = useCallback((message: WSMessage) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', message)
    } else {
      console.warn('Cannot send message - WebSocket not connected')
    }
  }, [])

  const subscribeToAgent = useCallback((agentId: string) => {
    const message = MessageFactory.createSubscribe('agent', agentId)
    sendMessage(message)
  }, [sendMessage])

  const subscribeToMetrics = useCallback(() => {
    const message = MessageFactory.createSubscribe('metrics')
    sendMessage(message)
  }, [sendMessage])

  const createAgent = useCallback((name: string, model: 'claude-3-opus' | 'claude-3-sonnet', workspace: string) => {
    const message: WSMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'agent:create',
      timestamp: Date.now(),
      payload: { name, model, workspace }
    }
    sendMessage(message)
  }, [sendMessage])

  const sendCommand = useCallback((agentId: string, command: string) => {
    const message = MessageFactory.createAgentCommand(agentId, command)
    sendMessage(message)
  }, [sendMessage])

  // Set up message handlers
  useEffect(() => {
    messageHandlersRef.current.set('agent:status', (msg: AgentStatusMessage) => {
      console.log('Agent status update:', msg.payload)
    })

    messageHandlersRef.current.set('agent:output', (msg: AgentOutputMessage) => {
      console.log('Agent output:', msg.payload)
    })

    messageHandlersRef.current.set('metrics:update', (msg: MetricsUpdateMessage) => {
      console.log('System metrics update:', msg.payload)
    })
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    state,
    sendMessage,
    subscribeToAgent,
    subscribeToMetrics,
    createAgent,
    sendCommand
  }
}