'use client'

import { SystemMonitor } from '@/components/SystemMonitor'

export default function MonitoringPage() {
  return (
    <div className="container mx-auto p-6">
      <SystemMonitor 
        refreshRate={1000}
        retentionHours={24}
      />
    </div>
  )
}