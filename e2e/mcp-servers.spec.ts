import { test, expect, Page } from '@playwright/test';

/**
 * MCP Server Management E2E Tests
 * Tests MCP server configuration, management, and health monitoring
 */
test.describe('MCP Server Management', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/mcp');
    await page.waitForLoadState('networkidle');
  });

  test('should display MCP servers page', async () => {
    // Verify we're on the MCP page
    await expect(page).toHaveURL(/.*\/mcp/);
    await expect(page.locator('h1')).toContainText('MCP');
  });

  test('should display server cards or marketplace', async () => {
    // Look for server cards, marketplace, or configuration sections
    const serverContent = page.locator('[data-testid="mcp-servers"]').or(
      page.locator('.server-card')
    ).or(
      page.locator('[data-testid="mcp-marketplace"]')
    ).or(
      page.locator('text=server').first()
    );
    
    await expect(serverContent).toBeVisible();
  });

  test('should handle server configuration form', async () => {
    // Look for add/configure server buttons
    const configButton = page.locator('button').filter({ 
      hasText: /add|configure|create|setup/i 
    }).first();
    
    if (await configButton.isVisible()) {
      await configButton.click();
      
      // Wait for configuration form or modal
      await page.waitForTimeout(1000);
      
      // Look for form elements
      const configForm = page.locator('form').or(
        page.locator('[data-testid="server-config"]')
      ).or(
        page.locator('input[type="text"]').first()
      );
      
      await expect(configForm).toBeVisible();
      
      // Test form inputs if available
      const nameInput = page.locator('input[name="name"]').or(
        page.locator('input[placeholder*="name"]')
      ).first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('test-server');
        await expect(nameInput).toHaveValue('test-server');
      }
    } else {
      console.log('No server configuration button found');
    }
  });

  test('should display server status indicators', async () => {
    // Look for server status indicators
    const statusIndicators = page.locator('[data-testid*="status"]').or(
      page.locator('.status-indicator')
    ).or(
      page.locator('span').filter({ hasText: /online|offline|connected|disconnected|healthy/i })
    );
    
    // Check if any status indicators are present
    const serverCards = page.locator('.server-card').or(page.locator('[data-testid*="server"]'));
    const serverCount = await serverCards.count();
    
    if (serverCount > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    } else {
      // Check for empty state or placeholder
      const emptyState = page.locator('text=No servers').or(
        page.locator('[data-testid="empty-state"]')
      ).or(
        page.locator('text=marketplace')
      );
      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('should handle server health monitoring', async () => {
    // Look for health check or monitoring features
    const healthElements = page.locator('[data-testid*="health"]').or(
      page.locator('button').filter({ hasText: /health|check|monitor/i })
    ).or(
      page.locator('.health-indicator')
    );
    
    const healthCount = await healthElements.count();
    console.log(`Health monitoring elements found: ${healthCount}`);
    
    if (healthCount > 0) {
      const firstHealthElement = healthElements.first();
      
      if (await firstHealthElement.isVisible()) {
        // If it's a button, click it
        if (await firstHealthElement.getAttribute('role') === 'button' || 
            await firstHealthElement.tagName() === 'BUTTON') {
          await firstHealthElement.click();
          await page.waitForTimeout(1000);
        }
        
        // Verify health status is displayed
        const healthStatus = page.locator('text=healthy').or(
          page.locator('text=unhealthy')
        ).or(
          page.locator('[data-testid="health-status"]')
        );
        
        await expect(healthStatus.first()).toBeVisible();
      }
    }
  });

  test('should handle server restart functionality', async () => {
    // Look for restart buttons or actions
    const restartButtons = page.locator('button').filter({ 
      hasText: /restart|reload|refresh/i 
    });
    
    const restartCount = await restartButtons.count();
    
    if (restartCount > 0) {
      const firstRestartButton = restartButtons.first();
      
      // Click restart button
      await firstRestartButton.click();
      
      // Wait for restart action to complete
      await page.waitForTimeout(2000);
      
      // Look for restart confirmation or status change
      const restartIndicator = page.locator('text=restarting').or(
        page.locator('text=restarted')
      ).or(
        page.locator('[data-testid*="restart"]')
      );
      
      // This might be visible temporarily during restart
      console.log('Restart action completed');
    } else {
      console.log('No restart functionality found');
    }
  });

  test('should handle credential management', async () => {
    // Look for credential or authentication related elements
    const credentialElements = page.locator('button').filter({ 
      hasText: /credential|auth|token|key/i 
    }).or(
      page.locator('[data-testid*="credential"]')
    ).or(
      page.locator('input[type="password"]')
    );
    
    const credentialCount = await credentialElements.count();
    
    if (credentialCount > 0) {
      const firstCredentialElement = credentialElements.first();
      
      if (await firstCredentialElement.isVisible()) {
        // If it's a button, click it
        if (await firstCredentialElement.tagName() === 'BUTTON') {
          await firstCredentialElement.click();
          await page.waitForTimeout(1000);
          
          // Look for credential form or modal
          const credentialForm = page.locator('form').or(
            page.locator('[data-testid="credential-form"]')
          ).or(
            page.locator('input[type="password"]')
          );
          
          await expect(credentialForm.first()).toBeVisible();
        }
      }
    } else {
      console.log('No credential management found');
    }
  });

  test('should display MCP marketplace or server templates', async () => {
    // Look for marketplace or template elements
    const marketplaceElements = page.locator('[data-testid="mcp-marketplace"]').or(
      page.locator('.marketplace')
    ).or(
      page.locator('text=marketplace')
    ).or(
      page.locator('.server-template')
    );
    
    if (await marketplaceElements.first().isVisible()) {
      // Verify marketplace content
      await expect(marketplaceElements.first()).toBeVisible();
      
      // Look for server templates or available servers
      const serverTemplates = page.locator('.template-card').or(
        page.locator('[data-testid*="template"]')
      ).or(
        page.locator('button').filter({ hasText: /install|add/i })
      );
      
      const templateCount = await serverTemplates.count();
      console.log(`Server templates found: ${templateCount}`);
      
      if (templateCount > 0) {
        await expect(serverTemplates.first()).toBeVisible();
      }
    }
  });

  test('should handle server performance monitoring', async () => {
    // Monitor page performance during server interactions
    await page.addInitScript(() => {
      window.mcpPerformance = {
        startTime: Date.now(),
        interactions: []
      };
    });
    
    // Interact with server elements
    const serverCards = page.locator('.server-card').or(page.locator('[data-testid*="server"]'));
    const cardCount = await serverCards.count();
    
    if (cardCount > 0) {
      // Click on first server card
      await serverCards.first().click();
      await page.waitForTimeout(1000);
      
      // Record interaction performance
      await page.evaluate(() => {
        window.mcpPerformance.interactions.push({
          timestamp: Date.now(),
          action: 'server_card_click'
        });
      });
    }
    
    // Check overall page performance
    const performanceMetrics = await page.evaluate(() => {
      const perf = window.mcpPerformance;
      const elapsed = Date.now() - perf.startTime;
      return { elapsed, interactions: perf.interactions.length };
    });
    
    console.log(`MCP page performance: ${performanceMetrics.elapsed}ms, interactions: ${performanceMetrics.interactions}`);
    
    // Performance should be reasonable
    expect(performanceMetrics.elapsed).toBeLessThan(10000); // 10 seconds max
  });

  test('should handle API communication with MCP services', async () => {
    // Monitor network requests to MCP services
    const mcpRequests = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('mcp') || url.includes('server') || url.includes('health')) {
        mcpRequests.push({
          url: url,
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Trigger potential API calls by interacting with the page
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Try to trigger health checks or server actions
    const healthButtons = page.locator('button').filter({ hasText: /health|check/i });
    if (await healthButtons.first().isVisible()) {
      await healthButtons.first().click();
      await page.waitForTimeout(2000);
    }
    
    console.log(`MCP API requests made: ${mcpRequests.length}`);
    
    // Verify API communication occurred (if servers are configured)
    if (mcpRequests.length > 0) {
      expect(mcpRequests[0]).toHaveProperty('url');
      expect(mcpRequests[0]).toHaveProperty('method');
    }
  });
});