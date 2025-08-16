# E2E Testing with Playwright

This directory contains end-to-end tests for the Team Management Dashboard using Playwright.

## Test Structure

### Test Files

- **`dashboard.spec.ts`** - Core dashboard functionality, navigation, and performance
- **`agent-terminal.spec.ts`** - Agent creation, terminal interaction, and agent workflows
- **`mcp-servers.spec.ts`** - MCP server configuration, management, and health monitoring
- **`performance-visual.spec.ts`** - Performance monitoring and visual regression testing

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests with UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests (step through)
pnpm test:e2e:debug
```

### Browser-Specific Tests

```bash
# Run on Chromium only
pnpm test:e2e:chromium

# Run on Firefox only
pnpm test:e2e:firefox

# Run on WebKit (Safari) only
pnpm test:e2e:webkit

# Run mobile tests only
pnpm test:e2e:mobile
```

### Test Reports

```bash
# Show test results report
pnpm test:e2e:report
```

## Performance Testing

The E2E tests include comprehensive performance monitoring:

- **Core Web Vitals**: LCP, FID, CLS, FCP, TTFB
- **Frame Rate Analysis**: 60fps maintenance during animations
- **Memory Usage**: Memory leak detection and efficiency
- **Network Conditions**: Slow 3G network simulation
- **Load Time Validation**: <2 second page loads

## Visual Regression Testing

Visual regression tests capture screenshots and compare them across test runs:

- Desktop, tablet, and mobile viewports
- 20% threshold for visual differences
- Full-page and component-level screenshots

## Test Configuration

The tests are configured in `playwright.config.ts` with:

- Cross-browser support (Chromium, Firefox, WebKit)
- Mobile device testing
- Performance optimizations for dashboard testing
- Network simulation capabilities
- Parallel execution (disabled on CI for resource efficiency)

## Performance Targets

- **Page Load**: <2 seconds
- **LCP**: <2.5 seconds
- **FCP**: <1.8 seconds
- **CLS**: <0.1
- **Frame Rate**: >30fps average, >15fps minimum
- **Memory Growth**: <50MB during navigation stress test

## Test Environment

Tests expect the development server to be running on `http://localhost:3000`. The test configuration automatically starts the development server if not already running.

## Debugging Tests

1. Use `pnpm test:e2e:debug` to step through tests
2. Use `pnpm test:e2e:headed` to see browser actions
3. Check test artifacts in `test-results/` directory
4. Review HTML reports with `pnpm test:e2e:report`

## CI/CD Integration

The tests are configured for CI environments with:

- Reduced parallelism for resource efficiency
- Retry logic for flaky tests
- JSON and JUnit report generation
- Visual regression baseline management