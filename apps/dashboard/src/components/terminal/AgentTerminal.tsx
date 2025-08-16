'use client'

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useWebSocket } from '@/hooks/use-websocket'

// Terminal interface as required by GitHub issue
interface AgentTerminalRef {
  connect(agentId: string): void
  sendInput(data: string): void
  resize(cols: number, rows: number): void
  clear(): void
  destroy(): void
  writeOutput(data: string): void
}

interface AgentTerminalProps {
  agentId: string
  className?: string
  height?: number
  onCommand?: (command: string) => void
  theme?: 'dark' | 'light'
}

export const AgentTerminal = forwardRef<AgentTerminalRef, AgentTerminalProps>(
  ({ agentId, className = '', height = 400, onCommand, theme = 'dark' }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<any>(null)
    const fitAddonRef = useRef<any>(null)
    const searchAddonRef = useRef<any>(null)
    const webLinksAddonRef = useRef<any>(null)
    const unicode11AddonRef = useRef<any>(null)
    
    const [isLoading, setIsLoading] = useState(true)
    const [currentCommand, setCurrentCommand] = useState('')
    const [commandHistory, setCommandHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    const { sendCommand, subscribeToAgent } = useWebSocket()

    // Common commands for autocomplete
    const commonCommands = [
      'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find',
      'ps', 'top', 'htop', 'kill', 'killall', 'jobs', 'bg', 'fg',
      'git status', 'git add', 'git commit', 'git push', 'git pull', 'git clone',
      'npm install', 'npm start', 'npm run', 'yarn install', 'yarn start',
      'docker ps', 'docker run', 'docker stop', 'docker build',
      'help', 'clear', 'exit', 'history'
    ]

    // Theme configurations
    const themes = {
      dark: {
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
      light: {
        background: '#ffffff',
        foreground: '#24292e',
        cursor: '#24292e',
        selection: '#0366d6',
        black: '#24292e',
        red: '#d73a49',
        green: '#28a745',
        yellow: '#ffd33d',
        blue: '#0366d6',
        magenta: '#6f42c1',
        cyan: '#17a2b8',
        white: '#ffffff',
        brightBlack: '#586069',
        brightRed: '#d73a49',
        brightGreen: '#28a745',
        brightYellow: '#ffd33d',
        brightBlue: '#0366d6',
        brightMagenta: '#6f42c1',
        brightCyan: '#17a2b8',
        brightWhite: '#ffffff',
      }
    }

    // Initialize terminal
    useEffect(() => {
      if (!terminalRef.current) return

      const initTerminal = async () => {
        try {
          // Dynamic imports for client-side only
          const { Terminal: XTerm } = await import('xterm')
          const { FitAddon } = await import('@xterm/addon-fit')
          const { SearchAddon } = await import('@xterm/addon-search')
          const { WebLinksAddon } = await import('@xterm/addon-web-links')
          const { Unicode11Addon } = await import('@xterm/addon-unicode11')
          
          // Import xterm CSS
          await import('xterm/css/xterm.css')

          const terminal = new XTerm({
            theme: themes[theme],
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Cascadia Code", monospace',
            fontWeight: 'normal',
            cursorBlink: true,
            cursorStyle: 'block',
            allowTransparency: false,
            cols: 120,
            rows: Math.floor(height / 20),
            scrollback: 10000,
            tabStopWidth: 4,
            convertEol: true,
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
          })

          // Load addons
          const fitAddon = new FitAddon()
          const searchAddon = new SearchAddon()
          const webLinksAddon = new WebLinksAddon()
          const unicode11Addon = new Unicode11Addon()

          terminal.loadAddon(fitAddon)
          terminal.loadAddon(searchAddon)
          terminal.loadAddon(webLinksAddon)
          terminal.loadAddon(unicode11Addon)

          terminal.unicode.activeVersion = '11'

          terminal.open(terminalRef.current!)
          fitAddon.fit()

          // Store references
          xtermRef.current = terminal
          fitAddonRef.current = fitAddon
          searchAddonRef.current = searchAddon
          webLinksAddonRef.current = webLinksAddon
          unicode11AddonRef.current = unicode11Addon

          // Welcome message with ANSI colors
          terminal.writeln('\x1b[32m┌─────────────────────────────────────────────────────────────┐\x1b[0m')
          terminal.writeln('\x1b[32m│\x1b[0m \x1b[1;36mAgent Terminal\x1b[0m \x1b[90m[\x1b[33m' + agentId + '\x1b[90m]\x1b[0m                          \x1b[32m│\x1b[0m')
          terminal.writeln('\x1b[32m│\x1b[0m \x1b[90mType commands to interact with the agent...\x1b[0m           \x1b[32m│\x1b[0m')
          terminal.writeln('\x1b[32m│\x1b[0m \x1b[90mPress Ctrl+F to search, Tab for autocomplete\x1b[0m         \x1b[32m│\x1b[0m')
          terminal.writeln('\x1b[32m│\x1b[0m \x1b[90mWebSocket: \x1b[31mDisconnected\x1b[90m (Demo Mode)\x1b[0m                   \x1b[32m│\x1b[0m')
          terminal.writeln('\x1b[32m└─────────────────────────────────────────────────────────────┘\x1b[0m')
          terminal.writeln('')
          writePrompt()

          // Handle input
          terminal.onData(handleTerminalInput)

          // Handle resize
          const handleResize = () => {
            fitAddon.fit()
          }
          window.addEventListener('resize', handleResize)

          // Handle key events for search
          terminal.onKey(({ key, domEvent }) => {
            // Ctrl+F to search
            if (domEvent.ctrlKey && domEvent.key === 'f') {
              domEvent.preventDefault()
              openSearch()
            }
            // Escape to close suggestions
            if (domEvent.key === 'Escape') {
              setShowSuggestions(false)
            }
          })

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
    }, [agentId, theme, height])

    // Subscribe to agent when agentId changes
    useEffect(() => {
      if (agentId) {
        subscribeToAgent(agentId)
      }
    }, [agentId, subscribeToAgent])

    const writePrompt = () => {
      if (xtermRef.current) {
        xtermRef.current.write('\x1b[1;32m$\x1b[0m ')
      }
    }

    const handleTerminalInput = useCallback((data: string) => {
      const terminal = xtermRef.current
      if (!terminal) return

      const code = data.charCodeAt(0)

      if (code === 13) { // Enter key
        terminal.writeln('')
        if (currentCommand.trim()) {
          executeCommand(currentCommand.trim())
          // Add to history
          setCommandHistory(prev => [...prev, currentCommand.trim()])
          setHistoryIndex(-1)
        }
        setCurrentCommand('')
        setShowSuggestions(false)
      } else if (code === 127) { // Backspace
        if (currentCommand.length > 0) {
          const newCommand = currentCommand.slice(0, -1)
          setCurrentCommand(newCommand)
          terminal.write('\b \b')
          updateSuggestions(newCommand)
        }
      } else if (code === 9) { // Tab key
        handleAutoComplete()
      } else if (code === 27) { // Escape sequences (arrow keys)
        const nextChar = data.charCodeAt(1)
        const thirdChar = data.charCodeAt(2)
        
        if (nextChar === 91) { // Arrow keys
          if (thirdChar === 65) { // Up arrow
            navigateHistory('up')
          } else if (thirdChar === 66) { // Down arrow
            navigateHistory('down')
          }
        }
      } else if (code >= 32) { // Printable characters
        const newCommand = currentCommand + data
        setCurrentCommand(newCommand)
        terminal.write(data)
        updateSuggestions(newCommand)
      }
    }, [currentCommand, commandHistory, historyIndex])

    const executeCommand = (command: string) => {
      if (onCommand) {
        onCommand(command)
      }
      
      // Handle built-in commands
      if (command === 'clear') {
        clear()
        return
      }
      
      if (command === 'history') {
        showHistory()
        return
      }

      if (command === 'help') {
        showHelp()
        return
      }
      
      // Send command via WebSocket (if connected)
      try {
        sendCommand(agentId, command)
      } catch (error) {
        // Fallback: provide mock response for demo
        setTimeout(() => {
          provideMockResponse(command)
        }, 500)
      }
      
      writePrompt()
    }

    const showHistory = () => {
      const terminal = xtermRef.current
      if (!terminal) return

      terminal.writeln('\x1b[36mCommand History:\x1b[0m')
      commandHistory.forEach((cmd, index) => {
        terminal.writeln(`  ${index + 1}: ${cmd}`)
      })
      terminal.writeln('')
    }

    const showHelp = () => {
      const terminal = xtermRef.current
      if (!terminal) return

      terminal.writeln('\x1b[36mAvailable Commands:\x1b[0m')
      terminal.writeln('  \x1b[32mhelp\x1b[0m       - Show this help message')
      terminal.writeln('  \x1b[32mclear\x1b[0m      - Clear the terminal')
      terminal.writeln('  \x1b[32mhistory\x1b[0m    - Show command history')
      terminal.writeln('  \x1b[32mls\x1b[0m         - List directory contents')
      terminal.writeln('  \x1b[32mpwd\x1b[0m        - Show current directory')
      terminal.writeln('  \x1b[32mps\x1b[0m         - Show running processes')
      terminal.writeln('  \x1b[32mgit status\x1b[0m - Show git repository status')
      terminal.writeln('')
      terminal.writeln('\x1b[90mUse Tab for autocomplete, Up/Down arrows for history\x1b[0m')
      terminal.writeln('')
    }

    const provideMockResponse = (command: string) => {
      const terminal = xtermRef.current
      if (!terminal) return

      // Mock responses for demo
      const responses: Record<string, string[]> = {
        'ls': [
          '\x1b[34msrc/\x1b[0m          \x1b[34mdocs/\x1b[0m         package.json',
          '\x1b[34mnode_modules/\x1b[0m \x1b[32mREADME.md\x1b[0m     \x1b[33m.env.example\x1b[0m'
        ],
        'pwd': ['/home/user/projects/' + agentId.split('-')[1]],
        'ps': [
          '  PID TTY          TIME CMD',
          ' 1234 pts/0    00:00:01 bash',
          ' 5678 pts/0    00:00:00 node',
          ' 9012 pts/0    00:00:00 ps'
        ],
        'git status': [
          'On branch main',
          'Your branch is up to date with \'origin/main\'.',
          '',
          'Changes not staged for commit:',
          '  \x1b[31mmodified:   src/components/terminal.tsx\x1b[0m',
          '',
          'no changes added to commit'
        ],
        'npm install': [
          'npm WARN deprecated some-package@1.0.0',
          'added 150 packages in 3.2s'
        ],
        'npm start': [
          '> start',
          '> next dev',
          '',
          '  ▲ Next.js 14.1.0',
          '  - Local:        http://localhost:3000',
          '  ✓ Ready in 1.2s'
        ]
      }

      const response = responses[command] || [
        `\x1b[90mExecuting: ${command}\x1b[0m`,
        `\x1b[32m✓\x1b[0m Command completed successfully`,
        `\x1b[90m(This is a demo response - WebSocket not connected)\x1b[0m`
      ]

      response.forEach((line, index) => {
        setTimeout(() => {
          terminal.writeln(line)
          if (index === response.length - 1) {
            terminal.writeln('')
            writePrompt()
          }
        }, index * 100)
      })
    }

    const navigateHistory = (direction: 'up' | 'down') => {
      const terminal = xtermRef.current
      if (!terminal || commandHistory.length === 0) return

      let newIndex = historyIndex
      
      if (direction === 'up' && historyIndex < commandHistory.length - 1) {
        newIndex = historyIndex + 1
      } else if (direction === 'down' && historyIndex > -1) {
        newIndex = historyIndex - 1
      }

      if (newIndex !== historyIndex) {
        // Clear current line
        const currentLineLength = currentCommand.length + 2 // $ + space
        for (let i = 0; i < currentLineLength; i++) {
          terminal.write('\b \b')
        }

        setHistoryIndex(newIndex)
        const newCommand = newIndex === -1 ? '' : commandHistory[commandHistory.length - 1 - newIndex]
        setCurrentCommand(newCommand)
        
        // Write new command
        writePrompt()
        terminal.write(newCommand)
      }
    }

    const updateSuggestions = (input: string) => {
      if (input.length < 2) {
        setShowSuggestions(false)
        return
      }

      const filtered = commonCommands.filter(cmd => 
        cmd.toLowerCase().startsWith(input.toLowerCase())
      ).slice(0, 5)

      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    }

    const handleAutoComplete = () => {
      if (suggestions.length > 0) {
        const terminal = xtermRef.current
        if (!terminal) return

        const suggestion = suggestions[0]
        const remaining = suggestion.slice(currentCommand.length)
        
        setCurrentCommand(suggestion)
        terminal.write(remaining)
        setShowSuggestions(false)
      }
    }

    const openSearch = () => {
      if (searchAddonRef.current) {
        // This would typically open a search overlay
        // For now, we'll just log that search is available
        const terminal = xtermRef.current
        if (terminal) {
          terminal.writeln('')
          terminal.writeln('\x1b[33mSearch functionality available via Ctrl+F\x1b[0m')
          writePrompt()
        }
      }
    }

    // Imperative methods
    const connect = useCallback((newAgentId: string) => {
      subscribeToAgent(newAgentId)
    }, [subscribeToAgent])

    const sendInput = useCallback((data: string) => {
      sendCommand(agentId, data)
    }, [sendCommand, agentId])

    const resize = useCallback((cols: number, rows: number) => {
      if (xtermRef.current && fitAddonRef.current) {
        xtermRef.current.resize(cols, rows)
        fitAddonRef.current.fit()
      }
    }, [])

    const clear = useCallback(() => {
      if (xtermRef.current) {
        xtermRef.current.clear()
        writePrompt()
      }
    }, [])

    const destroy = useCallback(() => {
      if (xtermRef.current) {
        xtermRef.current.dispose()
        xtermRef.current = null
      }
    }, [])

    const writeOutput = useCallback((data: string) => {
      if (xtermRef.current) {
        xtermRef.current.writeln(data)
        writePrompt()
      }
    }, [])

    useImperativeHandle(ref, () => ({
      connect,
      sendInput,
      resize,
      clear,
      destroy,
      writeOutput
    }))

    return (
      <div className={`bg-${theme === 'dark' ? '[#1e1e2e]' : 'white'} rounded-lg shadow-lg overflow-hidden ${className}`}>
        {/* Terminal Header */}
        <div className={`flex items-center justify-between px-4 py-2 ${
          theme === 'dark' ? 'bg-[#313244] border-b border-[#45475a]' : 'bg-gray-100 border-b border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Agent Terminal: {agentId}
            </h3>
            {isLoading && (
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                Loading...
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Terminal controls */}
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 cursor-pointer" onClick={destroy}></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 cursor-pointer"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 cursor-pointer"></div>
            </div>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="relative">
          {isLoading ? (
            <div 
              className={`flex items-center justify-center ${
                theme === 'dark' ? 'bg-[#1e1e2e] text-gray-400' : 'bg-white text-gray-600'
              }`}
              style={{ height: `${height}px` }}
            >
              <div className="text-sm">Initializing terminal...</div>
            </div>
          ) : (
            <>
              <div
                ref={terminalRef}
                className={`${theme === 'dark' ? 'bg-[#1e1e2e]' : 'bg-white'} focus-within:outline-none`}
                style={{ height: `${height}px` }}
              />
              
              {/* Autocomplete suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className={`absolute bottom-0 left-4 right-4 ${
                  theme === 'dark' ? 'bg-[#313244] border-[#45475a]' : 'bg-gray-50 border-gray-200'
                } border rounded-t-md p-2 text-xs`}>
                  <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Suggestions:
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={suggestion}
                      className={`${
                        theme === 'dark' ? 'text-green-400 hover:bg-[#45475a]' : 'text-green-600 hover:bg-gray-100'
                      } px-2 py-1 rounded cursor-pointer ${index === 0 ? 'font-semibold' : ''}`}
                      onClick={() => {
                        setCurrentCommand(suggestion)
                        setShowSuggestions(false)
                        if (xtermRef.current) {
                          // Clear current input and write suggestion
                          const currentLineLength = currentCommand.length
                          for (let i = 0; i < currentLineLength; i++) {
                            xtermRef.current.write('\b \b')
                          }
                          xtermRef.current.write(suggestion)
                        }
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
)

AgentTerminal.displayName = 'AgentTerminal'