'use client'

import { useState, useMemo } from 'react'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature: number
  }
  memory: {
    total: number
    used: number
    available: number
    percent: number
  }
  disk: {
    total: number
    used: number
    percent: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
  }
}

const INITIAL_METRICS: SystemMetrics = {
  cpu: {
    usage: 45.2,
    cores: 8,
    temperature: 62,
  },
  memory: {
    total: 16 * 1024 * 1024 * 1024,
    used: 8.5 * 1024 * 1024 * 1024,
    available: 7.5 * 1024 * 1024 * 1024,
    percent: 53.1,
  },
  disk: {
    total: 1 * 1024 * 1024 * 1024 * 1024,
    used: 650 * 1024 * 1024 * 1024,
    percent: 65.0,
  },
  network: {
    bytesIn: 1250000000,
    bytesOut: 890000000,
    packetsIn: 125000,
    packetsOut: 89000,
  },
}

export function useSystemMetrics() {
  const [systemMetrics] = useState<SystemMetrics>(INITIAL_METRICS)

  // Memoized formatted metrics to prevent recalculation
  const formattedMetrics = useMemo(() => ({
    ...systemMetrics,
    memory: {
      ...systemMetrics.memory,
      usedGB: (systemMetrics.memory.used / (1024 * 1024 * 1024)).toFixed(1),
      totalGB: (systemMetrics.memory.total / (1024 * 1024 * 1024)).toFixed(1),
    },
    disk: {
      ...systemMetrics.disk,
      usedGB: (systemMetrics.disk.used / (1024 * 1024 * 1024)).toFixed(0),
      totalTB: (systemMetrics.disk.total / (1024 * 1024 * 1024 * 1024)).toFixed(1),
    },
    network: {
      ...systemMetrics.network,
      bytesInMB: (systemMetrics.network.bytesIn / (1024 * 1024)).toFixed(1),
      bytesOutMB: (systemMetrics.network.bytesOut / (1024 * 1024)).toFixed(1),
    }
  }), [systemMetrics])

  return {
    systemMetrics,
    formattedMetrics,
  }
}