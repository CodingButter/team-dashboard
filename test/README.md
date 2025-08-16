# Testing Framework Documentation

This document provides guidelines for testing in the Team Management Dashboard project using Vitest.

## Overview

The project uses Vitest as the primary testing framework with the following features:

- **Vitest**: Fast test runner with native TypeScript support
- **React Testing Library**: Component testing utilities
- **Jest DOM matchers**: Additional DOM-specific assertions
- **Coverage reporting**: V8 coverage with 80% threshold
- **Watch mode**: Automatic test re-running during development
- **UI mode**: Visual test interface for debugging

## Getting Started

### Running Tests

```bash
# Run all tests once
pnpm test:run

# Run tests in watch mode (recommended during development)
pnpm test:watch

# Run tests with UI (great for debugging)
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run tests with coverage in watch mode
pnpm test:coverage:watch
```

### Project Structure

```
├── vitest.config.ts           # Root Vitest configuration
├── test/
│   ├── setup.ts              # Global test setup
│   ├── utils.tsx             # Test utilities and helpers
│   └── README.md             # This file
├── apps/dashboard/vitest.config.ts      # Dashboard-specific config
├── packages/ui/vitest.config.ts         # UI package config
├── packages/utils/vitest.config.ts      # Utils package config
├── packages/types/vitest.config.ts      # Types package config
└── services/*/vitest.config.ts          # Service-specific configs
```

## Writing Tests

### Test File Naming

- Component tests: `ComponentName.test.tsx`
- Utility tests: `utility-name.test.ts`
- Service tests: `service-name.test.ts`
- Hook tests: `use-hook-name.test.ts`

### Test Structure

Follow the AAA pattern (Arrange, Act, Assert):

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { title: 'Test Title' }
    
    // Act
    render(<MyComponent {...props} />)
    
    // Assert
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })
})
```

### Component Testing Guidelines

1. **Use the custom render function** from `test/utils.tsx`
2. **Query by role or accessible name** when possible
3. **Mock external dependencies** at the top of test files
4. **Test behavior, not implementation details**

```typescript
import { vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'

// Mock external dependencies
vi.mock('./expensive-component', () => ({
  ExpensiveComponent: () => <div data-testid="mocked-expensive" />
}))

describe('MyComponent', () => {
  it('handles user interactions correctly', async () => {
    const onSave = vi.fn()
    render(<MyComponent onSave={onSave} />)
    
    // Use user-event for realistic interactions
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    
    expect(onSave).toHaveBeenCalledWith(expectedData)
  })
})
```

### Utility Function Testing

```typescript
import { describe, it, expect } from 'vitest'
import { formatCurrency, validateEmail } from './utils'

describe('utility functions', () => {
  describe('formatCurrency', () => {
    it('formats USD correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
    })
    
    it('handles zero values', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00')
    })
  })
})
```

### Service Testing

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiService } from './api-service'

// Mock external dependencies
vi.mock('node-fetch')

describe('ApiService', () => {
  let service: ApiService
  
  beforeEach(() => {
    vi.clearAllMocks()
    service = new ApiService()
  })
  
  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    } as Response)
    
    const result = await service.getData(1)
    expect(result).toEqual(mockData)
  })
})
```

## Mocking Strategies

### Mock External Libraries

```typescript
// At the top of test files
vi.mock('external-library', () => ({
  ExternalComponent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="mocked-external">{children}</div>
}))
```

### Mock API Calls

```typescript
vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}))
```

### Mock React Hooks

```typescript
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    socket: null,
    isConnected: false,
    sendMessage: vi.fn(),
  })
}))
```

## Test Utilities

The project provides several test utilities in `test/utils.tsx`:

### Mock Data Factories

```typescript
import { createMockAgent, createMockSystemMetrics } from '../../test/utils'

const agent = createMockAgent({ status: 'running' })
const metrics = createMockSystemMetrics({ cpu: { usage: 75 } })
```

### Custom Render

```typescript
import { render } from '../../test/utils'

// Includes providers and global setup
render(<MyComponent />)
```

### Async Utilities

```typescript
import { waitFor, flushPromises } from '../../test/utils'

await waitFor(100) // Wait 100ms
await flushPromises() // Flush all pending promises
```

## Coverage Requirements

The project enforces 80% code coverage across:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Viewing Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report (opens in browser)
open coverage/index.html
```

### Coverage Exclusions

The following are excluded from coverage:

- Configuration files (`*.config.*`)
- Type definitions (`*.d.ts`)
- Test files (`*.test.*`, `*.spec.*`)
- Build artifacts (`dist/`, `.next/`)

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - testing implementation details
expect(component.state.count).toBe(1)

// ✅ Good - testing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works')

// ✅ Good
it('displays error message when validation fails')
```

### 3. Group Related Tests

```typescript
describe('UserForm', () => {
  describe('validation', () => {
    it('shows error for invalid email')
    it('shows error for missing required fields')
  })
  
  describe('submission', () => {
    it('calls onSubmit with form data')
    it('shows loading state during submission')
  })
})
```

### 4. Clean Up After Tests

```typescript
import { vi, afterEach } from 'vitest'

afterEach(() => {
  vi.clearAllMocks()
  // Clean up any global state
})
```

### 5. Use Realistic Test Data

```typescript
// ❌ Bad
const user = { id: 1, name: 'test' }

// ✅ Good
const user = { 
  id: 'user-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  createdAt: '2023-12-15T10:30:00Z'
}
```

## Debugging Tests

### Using the UI

```bash
pnpm test:ui
```

Opens a browser interface for:
- Running individual tests
- Viewing test output
- Debugging failures
- Exploring coverage

### Console Debugging

```typescript
import { screen } from '@testing-library/react'

// Debug rendered output
screen.debug()

// Debug specific element
screen.debug(screen.getByRole('button'))
```

### VS Code Integration

Add to `.vscode/settings.json`:

```json
{
  "vitest.enable": true,
  "vitest.commandLine": "pnpm test"
}
```

## Continuous Integration

Tests run automatically in CI using the `validate` script:

```bash
pnpm validate
```

This runs:
1. TypeScript type checking
2. ESLint linting
3. Prettier formatting check
4. All tests with coverage

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**
   - Check for timezone differences
   - Ensure all dependencies are properly mocked
   - Verify environment variables

2. **Slow test performance**
   - Mock expensive operations
   - Use `vi.useFakeTimers()` for time-dependent tests
   - Avoid unnecessary DOM queries

3. **Memory leaks in tests**
   - Clean up event listeners
   - Clear timers and intervals
   - Reset global state in `afterEach`

### Getting Help

- Check the [Vitest documentation](https://vitest.dev/)
- Review existing tests for patterns
- Ask team members for code review

---

For more information about testing patterns specific to this project, see the example tests in each workspace.