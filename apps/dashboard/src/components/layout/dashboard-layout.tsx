'use client'

import React, { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { ToolApprovalNotifications } from '../notifications/tool-approval-notifications'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNotificationClick = (request: any) => {
    // Navigate to approval page when notification is clicked
    window.location.href = '/approvals'
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out`}>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Tool Approval Notifications */}
      <ToolApprovalNotifications onRequestClick={handleNotificationClick} />
    </div>
  )
}