import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'

// Global test setup for Node.js environment
beforeAll(() => {
  // Mock environment variables for tests
  process.env.NODE_ENV = 'test'
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

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