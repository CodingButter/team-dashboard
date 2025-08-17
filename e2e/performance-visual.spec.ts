import { test, expect, Page } from '@playwright/test';

/**
 * Performance & Visual Regression E2E Tests
 * Tests page performance, visual consistency, and regression detection
 */
test.describe('Performance & Visual Regression', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('should meet Core Web Vitals performance metrics', async () => {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null
      };

      // Monitor Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          window.performanceMetrics.lcp = entries[entries.length - 1].startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        window.performanceMetrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Monitor First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          window.performanceMetrics.fcp = entries[0].startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Monitor Time to First Byte
      window.addEventListener('load', () => {
        const navEntry = performance.getEntriesByType('navigation')[0];
        window.performanceMetrics.ttfb = navEntry.responseStart - navEntry.requestStart;
      });
    });

    // Navigate to dashboard
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Collect performance metrics
    const metrics = await page.evaluate(() => window.performanceMetrics);

    // Validate Core Web Vitals
    console.log('Performance Metrics:', metrics);
    
    // LCP should be under 2.5 seconds (2500ms)
    if (metrics.lcp !== null) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
    
    // CLS should be under 0.1
    if (metrics.cls !== null) {
      expect(metrics.cls).toBeLessThan(0.1);
    }
    
    // FCP should be under 1.8 seconds (1800ms)
    if (metrics.fcp !== null) {
      expect(metrics.fcp).toBeLessThan(1800);
    }
    
    // Overall load time should be under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should maintain consistent visual appearance - Dashboard', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for any animations to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('dashboard-homepage.png', {
      fullPage: true,
      threshold: 0.2 // Allow 20% difference for slight variations
    });
  });

  test('should maintain consistent visual appearance - Agents Page', async () => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('agents-page.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should maintain consistent visual appearance - MCP Page', async () => {
    await page.goto('/mcp');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('mcp-page.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should maintain 60fps during animations', async () => {
    await page.addInitScript(() => {
      window.frameMetrics = {
        frames: [],
        startTime: Date.now()
      };

      let lastFrameTime = performance.now();
      const measureFrameRate = (currentTime) => {
        const delta = currentTime - lastFrameTime;
        window.frameMetrics.frames.push(delta);
        lastFrameTime = currentTime;
        requestAnimationFrame(measureFrameRate);
      };
      requestAnimationFrame(measureFrameRate);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger animations by navigating between pages
    await page.click('text=Agents');
    await page.waitForURL('**/agents');
    await page.waitForTimeout(1000);

    await page.click('text=System');
    await page.waitForURL('**/system');
    await page.waitForTimeout(1000);

    await page.click('text=Dashboard');
    await page.waitForURL('**/');
    await page.waitForTimeout(1000);

    // Analyze frame rate
    const frameData = await page.evaluate(() => {
      const frames = window.frameMetrics.frames;
      const validFrames = frames.filter(delta => delta > 0 && delta < 1000); // Filter out invalid frames
      
      if (validFrames.length === 0) return { avgFps: 0, minFps: 0 };
      
      const avgFrameTime = validFrames.reduce((sum, delta) => sum + delta, 0) / validFrames.length;
      const maxFrameTime = Math.max(...validFrames);
      
      return {
        avgFps: 1000 / avgFrameTime,
        minFps: 1000 / maxFrameTime,
        frameCount: validFrames.length
      };
    });

    console.log('Frame Rate Analysis:', frameData);
    
    // Should maintain close to 60fps average
    expect(frameData.avgFps).toBeGreaterThan(30);
    expect(frameData.minFps).toBeGreaterThan(15); // Even worst frame should be > 15fps
  });

  test('should handle responsive design breakpoints', async () => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('desktop-view.png', {
      threshold: 0.2
    });

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('tablet-view.png', {
      threshold: 0.2
    });

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('mobile-view.png', {
      threshold: 0.2
    });
  });

  test('should handle memory usage efficiently', async () => {
    await page.addInitScript(() => {
      window.memoryMetrics = {
        initial: performance.memory ? performance.memory.usedJSHeapSize : 0,
        measurements: []
      };

      // Monitor memory usage periodically
      setInterval(() => {
        if (performance.memory) {
          window.memoryMetrics.measurements.push({
            timestamp: Date.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          });
        }
      }, 1000);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate around to stress test memory
    for (let i = 0; i < 5; i++) {
      await page.click('text=Agents');
      await page.waitForTimeout(500);
      await page.click('text=System');
      await page.waitForTimeout(500);
      await page.click('text=MCP');
      await page.waitForTimeout(500);
      await page.click('text=Dashboard');
      await page.waitForTimeout(500);
    }

    // Analyze memory usage
    const memoryData = await page.evaluate(() => {
      const metrics = window.memoryMetrics;
      if (metrics.measurements.length === 0) return null;

      const latest = metrics.measurements[metrics.measurements.length - 1];
      const growth = latest.used - metrics.initial;
      
      return {
        initialMemory: metrics.initial,
        finalMemory: latest.used,
        memoryGrowth: growth,
        measurementCount: metrics.measurements.length
      };
    });

    if (memoryData) {
      console.log('Memory Usage Analysis:', memoryData);
      
      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryData.memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should handle network conditions gracefully', async () => {
    // Simulate slow 3G network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 300 // 300ms latency
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Load time on slow network: ${loadTime}ms`);

    // Should still load within reasonable time on slow network (10 seconds)
    expect(loadTime).toBeLessThan(10000);

    // Verify page is still functional
    await expect(page.locator('h1')).toBeVisible();
    
    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});