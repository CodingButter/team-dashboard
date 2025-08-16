import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, {
    // Add providers here if needed (e.g., ThemeProvider, Router, etc.)
    wrapper: ({ children }) => <>{children}</>,
    ...options,
  })
}

// Mock data factories
export const createMockAgent = (overrides = {}) => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  status: 'idle' as const,
  pid: 12345,
  memory: 150000000,
  cpu: 25.5,
  created_at: new Date().toISOString(),
  last_activity: new Date().toISOString(),
  ...overrides,
})

export const createMockSystemMetrics = (overrides = {}) => ({
  timestamp: new Date().toISOString(),
  cpu: {
    usage: 45.2,
    cores: 8,
    load: [1.2, 1.5, 1.8],
  },
  memory: {
    total: 16000000000,
    used: 8000000000,
    available: 8000000000,
    percentage: 50,
  },
  disk: {
    total: 500000000000,
    used: 200000000000,
    available: 300000000000,
    percentage: 40,
  },
  network: {
    bytesReceived: 1000000,
    bytesSent: 500000,
  },
  ...overrides,
})

export const createMockWebSocketMessage = (overrides = {}) => ({
  type: 'test-message',
  payload: { test: true },
  timestamp: new Date().toISOString(),
  ...overrides,
})

// Mock WebSocket utilities
export const createMockWebSocket = () => {
  const mockWS = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1, // OPEN
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  }

  return mockWS
}

// Test utilities for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const flushPromises = () => new Promise(setImmediate)

// Console utilities
export const suppressConsoleError = () => {
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export * from '@testing-library/user-event'

// Override render method
export { customRender as render }