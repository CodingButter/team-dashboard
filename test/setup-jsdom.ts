import '@testing-library/jest-dom'
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global test setup for browser environment
beforeAll(() => {
  // Mock environment variables for tests
  process.env.NODE_ENV = 'test'
})

// Clean up after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Global mocks for common browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock console methods to reduce noise in tests
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Uncomment these if you want to suppress console output in tests
    // log: vi.fn(),
    // warn: vi.fn(),
    // error: vi.fn(),
    // info: vi.fn(),
    // debug: vi.fn(),
  }
}

// Mock fetch if not available (for Node.js environment)
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Mock WebSocket for testing
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
}))