'use client'

import React from 'react'
import Link from 'next/link'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: '🏠' },
    { name: 'Agents', href: '/agents', icon: '🤖' },
    { name: 'System Monitor', href: '/system', icon: '📊' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  return (
    <div className="bg-card border-r border-border flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {isOpen && (
            <h1 className="text-lg font-semibold text-foreground">
              Team Dashboard
            </h1>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground"
          >
            {isOpen ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <span className="text-lg mr-3">{item.icon}</span>
                {isOpen && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {isOpen && (
            <span className="text-xs text-muted-foreground">
              WebSocket Connected
            </span>
          )}
        </div>
      </div>
    </div>
  )
}