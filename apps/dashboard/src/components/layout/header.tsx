'use client'

import React from 'react'
import { ThemeToggle } from '../theme-toggle'

export function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-foreground">
            Agent Management
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* System Stats */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>CPU:</span>
              <span className="text-foreground font-medium">45%</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Memory:</span>
              <span className="text-foreground font-medium">2.1GB</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Agents:</span>
              <span className="text-foreground font-medium">3/10</span>
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle size="sm" />

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              + New Agent
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}