'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from './use-websocket'
import { AgentOutputMessage, WSMessage } from '@team-dashboard/types'

interface UseTerminalOutputOptions {
  agentId: string
  onOutput?: (output: string, type: 'stdout' | 'stderr') => void
  onError?: (error: string) => void
  onStatusChange?: (status: 'idle' | 'running' | 'error') => void
  bufferSize?: number
}

interface UseTerminalOutputReturn {
  sendCommand: (command: string) => void
  clearBuffer: () => void
  getBuffer: () => string[]
  isConnected: boolean
}

export function useTerminalOutput({
  agentId,
  onOutput,
  onError,
  onStatusChange,
  bufferSize = 1000
}: UseTerminalOutputOptions): UseTerminalOutputReturn {
  const { state, sendCommand: wsSendCommand, subscribeToAgent } = useWebSocket()
  const outputBufferRef = useRef<string[]>([])
  const messageHandlerRef = useRef<((msg: WSMessage) => void) | null>(null)

  // Handle agent output messages
  const handleAgentOutput = useCallback((message: AgentOutputMessage) => {
    if (message.payload.agentId !== agentId) return

    const { output, type, error } = message.payload
    
    if (error) {
      onError?.(error)
      onStatusChange?('error')
      return
    }

    if (output) {
      // Add to buffer
      outputBufferRef.current.push(output)
      
      // Trim buffer if it exceeds size limit
      if (outputBufferRef.current.length > bufferSize) {
        outputBufferRef.current = outputBufferRef.current.slice(-bufferSize)
      }
      
      // Call output callback
      onOutput?.(output, type || 'stdout')
      
      // Update status
      onStatusChange?.('idle')
    }
  }, [agentId, onOutput, onError, onStatusChange, bufferSize])

  // Set up message handler for agent output
  useEffect(() => {
    if (!state.connected) return

    // Subscribe to agent outputs
    subscribeToAgent(agentId)

    // Store message handler reference for cleanup
    messageHandlerRef.current = (message: WSMessage) => {
      if (message.type === 'agent:output') {
        handleAgentOutput(message as AgentOutputMessage)
      }
    }

    return () => {
      messageHandlerRef.current = null
    }
  }, [state.connected, agentId, subscribeToAgent, handleAgentOutput])

  const sendCommand = useCallback((command: string) => {
    if (!state.connected) {
      onError?.('WebSocket not connected')
      return
    }

    onStatusChange?.('running')
    wsSendCommand(agentId, command)
  }, [state.connected, agentId, wsSendCommand, onError, onStatusChange])

  const clearBuffer = useCallback(() => {
    outputBufferRef.current = []
  }, [])

  const getBuffer = useCallback(() => {
    return [...outputBufferRef.current]
  }, [])

  return {
    sendCommand,
    clearBuffer,
    getBuffer,
    isConnected: state.connected
  }
}