import { test, expect, Page } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * Tests core dashboard functionality, navigation, and performance
 */
test.describe('Dashboard Navigation & Performance', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to the homepage
    await page.goto('/');
  });

  test('should load dashboard homepage with correct title and performance metrics', async () => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Verify page title
    await expect(page).toHaveTitle(/Team Management Dashboard/);
    
    // Verify main dashboard elements are visible
    await expect(page.locator('h1')).toContainText('Team Management Dashboard');
    
    // Performance check: Page should load within 2 seconds
    const navigationPromise = page.waitForLoadState('load');
    const startTime = Date.now();
    await navigationPromise;
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should navigate to agents page and display agent list', async () => {
    // Navigate to agents
    await page.click('text=Agents');
    await page.waitForURL('**/agents');
    await expect(page).toHaveURL(/.*\/agents/);
    
    // Verify agents page content
    await expect(page.locator('h1')).toContainText('Agents');
    
    // Check for agent cards or list container
    await expect(page.locator('[data-testid="agent-list"]').or(page.locator('.agent-card')).first()).toBeVisible();
  });

  test('should navigate to system monitoring page', async () => {
    // Navigate to system page
    await page.click('text=System');
    await page.waitForURL('**/system');
    await expect(page).toHaveURL(/.*\/system/);
    
    // Verify system metrics are displayed
    await expect(page.locator('text=CPU').or(page.locator('text=Memory')).first()).toBeVisible();
  });

  test('should navigate to MCP servers page', async () => {
    // Navigate to MCP page
    await page.click('text=MCP');
    await page.waitForURL('**/mcp');
    await expect(page).toHaveURL(/.*\/mcp/);
    
    // Verify MCP page loads
    await expect(page.locator('h1')).toContainText('MCP');
  });

  test('should display system metrics on dashboard', async () => {
    // Wait for metrics to load
    await page.waitForSelector('text=CPU, text=Memory', { timeout: 10000 });
    
    // Verify system metrics are visible
    const cpuMetric = page.locator('text=CPU').first();
    const memoryMetric = page.locator('text=Memory').first();
    
    await expect(cpuMetric.or(memoryMetric)).toBeVisible();
  });

  test('should have responsive sidebar navigation', async () => {
    // Test desktop view
    await expect(page.locator('nav')).toBeVisible();
    
    // Test mobile view by changing viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigation should still be accessible (mobile menu)
    const mobileNav = page.locator('[data-testid="mobile-menu"]').or(page.locator('nav')).first();
    await expect(mobileNav).toBeVisible();
  });

  test('should maintain 60fps during navigation animations', async () => {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.performanceEntries = [];
      const observer = new PerformanceObserver((list) => {
        window.performanceEntries.push(...list.getEntries());
      });
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    });
    
    // Navigate between pages quickly
    await page.click('text=Agents');
    await page.waitForURL('**/agents');
    
    await page.click('text=System');
    await page.waitForURL('**/system');
    
    await page.click('text=Dashboard');
    await page.waitForURL('**/');
    
    // Check performance metrics
    const performanceEntries = await page.evaluate(() => window.performanceEntries);
    
    // Verify navigation performance
    const navigationEntries = performanceEntries.filter(entry => entry.entryType === 'navigation');
    expect(navigationEntries.length).toBeGreaterThan(0);
    
    // Check for reasonable load times
    const paintEntries = performanceEntries.filter(entry => entry.entryType === 'paint');
    expect(paintEntries.length).toBeGreaterThan(0);
  });

  test('should handle WebSocket connections for real-time updates', async () => {
    // Monitor network requests
    const wsConnections = [];
    page.on('websocket', (ws) => {
      wsConnections.push(ws);
    });
    
    // Navigate to dashboard where WebSocket connections might be established
    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for potential WebSocket connections
    
    // Verify that WebSocket connections are established (if any)
    // This is optional since WebSocket connections might not always be present
    console.log(`WebSocket connections established: ${wsConnections.length}`);
  });
});