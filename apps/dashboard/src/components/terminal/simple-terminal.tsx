'use client'

import React, { useState } from 'react'

interface SimpleTerminalProps {
  agentId: string
  className?: string
  onCommand?: (command: string) => void
}

export function SimpleTerminal({ agentId, className = '', onCommand }: SimpleTerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([
    `Welcome to Agent Terminal [${agentId}]`,
    'Type commands to interact with the agent...',
    '$ '
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const command = input.trim()
    setHistory(prev => [...prev, `$ ${command}`, `Command sent to agent: ${command}`, '$ '])
    onCommand?.(command)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

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
      
      <div className="bg-black rounded border border-gray-700 p-3 h-64 overflow-y-auto">
        <div className="font-mono text-sm">
          {history.map((line, index) => (
            <div key={index} className="text-green-400 leading-5">
              {line}
            </div>
          ))}
          <div className="flex items-center text-green-400">
            <span>$ </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-green-400 ml-1 font-mono text-sm"
              placeholder="Enter command..."
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  )
}