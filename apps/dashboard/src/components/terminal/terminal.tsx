'use client'

import React, { useEffect, useRef, useState } from 'react'

interface TerminalProps {
  agentId: string
  className?: string
  onCommand?: (command: string) => void
}

export function Terminal({ agentId, className = '', onCommand }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!terminalRef.current) return

    const initTerminal = async () => {
      try {
        // Dynamic import for client-side only
        const { Terminal: XTerm } = await import('xterm')
        const { FitAddon } = await import('@xterm/addon-fit')
        
        // Import xterm CSS
        await import('xterm/css/xterm.css')

        // Initialize xterm.js
        const terminal = new XTerm({
          theme: {
            background: '#1e1e2e',
            foreground: '#cdd6f4',
            cursor: '#f5e0dc',
            selection: '#313244',
            black: '#45475a',
            red: '#f38ba8',
            green: '#a6e3a1',
            yellow: '#f9e2af',
            blue: '#89b4fa',
            magenta: '#cba6f7',
            cyan: '#94e2d5',
            white: '#bac2de',
            brightBlack: '#585b70',
            brightRed: '#f38ba8',
            brightGreen: '#a6e3a1',
            brightYellow: '#f9e2af',
            brightBlue: '#89b4fa',
            brightMagenta: '#cba6f7',
            brightCyan: '#94e2d5',
            brightWhite: '#a6adc8',
          },
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          cursorBlink: true,
          cols: 80,
          rows: 24,
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)

        terminal.open(terminalRef.current!)
        fitAddon.fit()

        // Welcome message
        terminal.writeln(`Welcome to Agent Terminal [${agentId}]`)
        terminal.writeln('Type commands to interact with the agent...')
        terminal.write('$ ')

        let currentCommand = ''

        // Handle input
        terminal.onData((data) => {
          const code = data.charCodeAt(0)
          
          if (code === 13) { // Enter key
            terminal.writeln('')
            if (currentCommand.trim() && onCommand) {
              onCommand(currentCommand.trim())
            }
            currentCommand = ''
            terminal.write('$ ')
          } else if (code === 127) { // Backspace
            if (currentCommand.length > 0) {
              currentCommand = currentCommand.slice(0, -1)
              terminal.write('\b \b')
            }
          } else if (code >= 32) { // Printable characters
            currentCommand += data
            terminal.write(data)
          }
        })

        // Handle resize
        const handleResize = () => {
          fitAddon.fit()
        }
        window.addEventListener('resize', handleResize)

        xtermRef.current = terminal
        fitAddonRef.current = fitAddon
        setIsLoading(false)

        return () => {
          window.removeEventListener('resize', handleResize)
          terminal.dispose()
        }
      } catch (error) {
        console.error('Failed to initialize terminal:', error)
        setIsLoading(false)
      }
    }

    initTerminal()
  }, [agentId, onCommand])

  // Method to write output from agent
  const writeOutput = (data: string) => {
    if (xtermRef.current) {
      xtermRef.current.writeln(data)
      xtermRef.current.write('$ ')
    }
  }

  // Expose writeOutput method
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    writeOutput
  }))

  return (
    <div className={`bg-[#1e1e2e] rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">
          Agent Terminal: {agentId}
        </h3>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>
      {isLoading ? (
        <div className="h-64 bg-[#1e1e2e] rounded border border-gray-700 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading terminal...</div>
        </div>
      ) : (
        <div
          ref={terminalRef}
          className="h-64 bg-[#1e1e2e] rounded border border-gray-700"
        />
      )}
    </div>
  )
}