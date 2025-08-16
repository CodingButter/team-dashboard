'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useOpenAI, type ChatMessage, type OpenAIConfig } from '../../hooks/use-openai'
import { AgentModel } from '@team-dashboard/types'

interface AgentTerminalProps {
  agentId: string
  agentName: string
  model: AgentModel
  systemPrompt?: string
  onCommand?: (command: string) => void
  className?: string
  openaiConfig?: OpenAIConfig
}

export function AgentTerminal({ 
  agentId, 
  agentName, 
  model,
  systemPrompt = '',
  onCommand,
  className = '',
  openaiConfig
}: AgentTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  // Only use OpenAI for OpenAI models
  const isOpenAIModel = model.startsWith('gpt-')
  const defaultOpenAIConfig: OpenAIConfig = {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    model: model as any,
    maxTokens: 4000,
    temperature: 0.1,
    stream: true
  }

  const openai = useOpenAI(openaiConfig || defaultOpenAIConfig)

  const writeToTerminal = useCallback((text: string, newline = true) => {
    if (xtermRef.current) {
      xtermRef.current.write(text + (newline ? '\r\n' : ''))
    }
  }, [])

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return

    writeToTerminal(`$ ${command}`)
    
    // Add command to conversation history
    const userMessage: ChatMessage = {
      role: 'user',
      content: command
    }

    const newHistory = [...conversationHistory, userMessage]
    setConversationHistory(newHistory)

    // Handle OpenAI models
    if (isOpenAIModel && openaiConfig?.apiKey) {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt || `You are ${agentName}, a helpful AI assistant. You are currently in a terminal environment. Provide clear, concise responses and when possible, suggest relevant commands or actions.`
        },
        ...newHistory
      ]

      let assistantResponse = ''
      writeToTerminal(`[${agentName}]: `, false)

      try {
        await openai.sendStreamingMessage(
          messages,
          (chunk: string) => {
            assistantResponse += chunk
            writeToTerminal(chunk, false)
          }
        )

        // Add assistant response to history
        setConversationHistory(prev => [
          ...prev,
          { role: 'assistant', content: assistantResponse }
        ])

        writeToTerminal('') // New line after response
      } catch (error) {
        writeToTerminal(`\r\n[Error]: Failed to get response from ${model}`)
        console.error('OpenAI error:', error)
      }
    } else {
      // Handle Claude models via WebSocket or fallback
      writeToTerminal(`[${agentName}]: Processing command via WebSocket...`)
      onCommand?.(command)
    }

    writeToTerminal(`\r\n[${agentId}]$ `, false)
  }, [
    conversationHistory, 
    isOpenAIModel, 
    openaiConfig, 
    systemPrompt, 
    agentName, 
    model, 
    openai, 
    writeToTerminal, 
    onCommand, 
    agentId
  ])

  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#264f78',
        black: '#000000',
        red: '#f14c4c',
        green: '#23d18b',
        yellow: '#f5f543',
        blue: '#3b8eea',
        magenta: '#d670d6',
        cyan: '#29b8db',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      rows: 24,
      cols: 80
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalRef.current)
    fitAddon.fit()

    // Welcome message
    terminal.writeln(`Welcome to ${agentName} Terminal`)
    terminal.writeln(`Model: ${model}`)
    terminal.writeln(`Agent ID: ${agentId}`)
    terminal.writeln('Type your commands below. Press Enter to execute.')
    terminal.writeln('')
    terminal.write(`[${agentId}]$ `)

    // Handle user input
    terminal.onData((data) => {
      switch (data) {
        case '\r': // Enter key
          executeCommand(currentInput)
          setCurrentInput('')
          break
        case '\u007F': // Backspace
          if (currentInput.length > 0) {
            terminal.write('\b \b')
            setCurrentInput(prev => prev.slice(0, -1))
          }
          break
        case '\u0003': // Ctrl+C
          terminal.writeln('^C')
          terminal.write(`[${agentId}]$ `)
          setCurrentInput('')
          break
        default:
          if (data >= ' ' && data <= '~') { // Printable characters
            terminal.write(data)
            setCurrentInput(prev => prev + data)
          }
          break
      }
    })

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon
    setIsConnected(true)

    return () => {
      terminal.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      setIsConnected(false)
    }
  }, [agentId, agentName, model, executeCommand, currentInput])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialize terminal on mount
  useEffect(() => {
    const cleanup = initializeTerminal()
    return cleanup
  }, [initializeTerminal])

  return (
    <div className={`relative ${className}`}>
      {/* Terminal Status */}
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span>Model: {model}</span>
          {isOpenAIModel && (
            <span className="text-blue-400">OpenAI SDK</span>
          )}
          {openai.isLoading && (
            <span className="text-yellow-400">Processing...</span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {openai.error && (
        <div className="mb-2 p-2 bg-red-900/20 border border-red-500/20 rounded text-red-400 text-sm">
          Error: {openai.error}
          <button 
            onClick={openai.clearError}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Terminal Container */}
      <div 
        ref={terminalRef}
        className="bg-black border border-border rounded-lg p-2 min-h-[400px] font-mono"
        style={{ height: '400px' }}
      />

      {/* Quick Actions */}
      <div className="mt-2 flex items-center space-x-2">
        <button
          onClick={() => executeCommand('help')}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Help
        </button>
        <button
          onClick={() => executeCommand('status')}
          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
        >
          Status
        </button>
        <button
          onClick={() => {
            if (xtermRef.current) {
              xtermRef.current.clear()
              xtermRef.current.write(`[${agentId}]$ `)
            }
          }}
          className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Clear
        </button>
        {openai.isLoading && (
          <button
            onClick={openai.abortRequest}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Abort
          </button>
        )}
      </div>
    </div>
  )
}