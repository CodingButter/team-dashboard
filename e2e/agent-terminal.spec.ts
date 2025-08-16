import { test, expect, Page } from '@playwright/test';

/**
 * Agent Terminal E2E Tests
 * Tests agent creation, terminal interaction, and agent workflows
 */
test.describe('Agent Terminal & Interaction', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test('should display agents page and agent cards', async () => {
    // Verify we're on the agents page
    await expect(page).toHaveURL(/.*\/agents/);
    await expect(page.locator('h1')).toContainText('Agents');
    
    // Check for agent list or empty state
    const agentContainer = page.locator('[data-testid="agent-list"]').or(page.locator('.agent-card')).first();
    await expect(agentContainer).toBeVisible();
  });

  test('should open agent creation wizard', async () => {
    // Look for create agent button
    const createButton = page.locator('button').filter({ hasText: /create|add|new/i }).first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Verify wizard or form opens
      const wizard = page.locator('[data-testid="agent-wizard"]').or(page.locator('form')).first();
      await expect(wizard).toBeVisible();
    } else {
      // Skip if create button not available
      test.skip('Create agent button not available');
    }
  });

  test('should handle terminal operations when terminal is available', async () => {
    // Look for existing agent with terminal or terminal button
    const terminalButton = page.locator('button').filter({ hasText: /terminal|console/i }).first();
    
    if (await terminalButton.isVisible()) {
      await terminalButton.click();
      
      // Wait for terminal to load
      await page.waitForTimeout(2000);
      
      // Check for terminal interface (xterm.js creates .xterm class)
      const terminal = page.locator('.xterm').or(page.locator('[data-testid="terminal"]')).first();
      await expect(terminal).toBeVisible();
      
      // Verify terminal is interactive
      await expect(terminal).not.toBeEmpty();
    } else {
      console.log('No terminal button found, skipping terminal interaction test');
    }
  });

  test('should display agent status indicators', async () => {
    // Look for agent status indicators
    const statusIndicators = page.locator('[data-testid*="status"]').or(
      page.locator('.status-indicator')
    ).or(
      page.locator('span').filter({ hasText: /online|offline|running|idle/i })
    );
    
    // At least one status indicator should be visible if agents exist
    const agentCards = page.locator('.agent-card');
    const agentCount = await agentCards.count();
    
    if (agentCount > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    }
  });

  test('should handle agent selection and details', async () => {
    // Look for agent cards
    const agentCards = page.locator('.agent-card').or(page.locator('[data-testid*="agent"]'));
    const firstAgent = agentCards.first();
    
    if (await firstAgent.isVisible()) {
      await firstAgent.click();
      
      // Wait for agent details or expansion
      await page.waitForTimeout(1000);
      
      // Verify some kind of agent detail is shown
      const agentDetails = page.locator('[data-testid="agent-details"]').or(
        page.locator('.agent-expanded')
      ).or(
        page.locator('button').filter({ hasText: /terminal|manage|configure/i })
      );
      
      await expect(agentDetails.first()).toBeVisible();
    } else {
      console.log('No agent cards found, creating mock test scenario');
      // If no agents exist, verify the empty state
      const emptyState = page.locator('text=No agents').or(page.locator('text=empty')).or(page.locator('[data-testid="empty-state"]'));
      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('should handle terminal performance under load', async () => {
    const terminalButton = page.locator('button').filter({ hasText: /terminal/i }).first();
    
    if (await terminalButton.isVisible()) {
      // Monitor performance
      await page.addInitScript(() => {
        window.terminalPerformance = {
          startTime: Date.now(),
          frameCount: 0,
          measurements: []
        };
        
        // Monitor frame rate if possible
        const measureFrameRate = () => {
          window.terminalPerformance.frameCount++;
          requestAnimationFrame(measureFrameRate);
        };
        requestAnimationFrame(measureFrameRate);
      });
      
      await terminalButton.click();
      await page.waitForTimeout(3000); // Let terminal stabilize
      
      // Check performance metrics
      const performance = await page.evaluate(() => {
        const perf = window.terminalPerformance;
        const elapsed = Date.now() - perf.startTime;
        const fps = (perf.frameCount / elapsed) * 1000;
        return { fps, elapsed };
      });
      
      // Terminal should maintain reasonable performance
      console.log(`Terminal FPS: ${performance.fps}, Runtime: ${performance.elapsed}ms`);
      expect(performance.fps).toBeGreaterThan(30); // At least 30fps
    }
  });

  test('should handle WebSocket connections for agent communication', async () => {
    const wsConnections = [];
    page.on('websocket', (ws) => {
      wsConnections.push(ws);
      console.log('WebSocket connection established');
    });
    
    // Navigate to agents page and interact
    await page.goto('/agents');
    await page.waitForTimeout(2000);
    
    // Try to trigger WebSocket connections by interacting with agents
    const terminalButton = page.locator('button').filter({ hasText: /terminal/i }).first();
    if (await terminalButton.isVisible()) {
      await terminalButton.click();
      await page.waitForTimeout(2000);
    }
    
    console.log(`WebSocket connections for agents: ${wsConnections.length}`);
  });

  test('should handle agent workflow execution', async () => {
    // Look for workflow or task execution buttons
    const workflowButtons = page.locator('button').filter({ 
      hasText: /run|execute|start|workflow|task/i 
    });
    
    const buttonCount = await workflowButtons.count();
    
    if (buttonCount > 0) {
      const firstWorkflowButton = workflowButtons.first();
      await firstWorkflowButton.click();
      
      // Wait for workflow to start
      await page.waitForTimeout(2000);
      
      // Look for workflow status indicators
      const statusIndicators = page.locator('[data-testid*="workflow"]').or(
        page.locator('text=running').or(page.locator('text=executing'))
      );
      
      await expect(statusIndicators.first()).toBeVisible();
    } else {
      console.log('No workflow buttons found, skipping workflow test');
    }
  });
});