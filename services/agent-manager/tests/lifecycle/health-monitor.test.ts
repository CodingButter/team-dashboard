/**
 * @package agent-manager/tests/lifecycle
 * Agent Health Monitor Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import AgentHealthMonitor from '../../src/lifecycle/health-monitor.js'
import { createMockAgentProcess, mockHealthMetrics, delay } from './test-helpers.js'

describe('Agent Health Monitor', () => {
  let healthMonitor: AgentHealthMonitor

  beforeEach(() => {
    healthMonitor = new AgentHealthMonitor({
      healthCheckInterval: 100,
      unhealthyThreshold: 3,
      criticalThreshold: 5
    })
  })

  afterEach(() => {
    healthMonitor?.stop()
  })

  describe('Health Monitoring', () => {
    it('should start monitoring an agent', async () => {
      const agent = createMockAgentProcess('health-1')
      
      const startResult = await healthMonitor.startMonitoring(agent.id, agent)
      expect(startResult).toBe(true)
      expect(healthMonitor.isMonitoring(agent.id)).toBe(true)
    })

    it('should detect unhealthy agents', async () => {
      const agent = createMockAgentProcess('health-2')
      await healthMonitor.startMonitoring(agent.id, agent)
      
      // Simulate unhealthy metrics
      healthMonitor.updateHealthMetrics(agent.id, {
        ...mockHealthMetrics,
        responseTime: 5000,
        status: 'unhealthy'
      })
      
      await delay(150)
      
      const health = healthMonitor.getAgentHealth(agent.id)
      expect(health.status).toBe('unhealthy')
      expect(health.consecutiveFailures).toBeGreaterThan(0)
    })

    it('should provide health summary', () => {
      const summary = healthMonitor.getHealthSummary()
      
      expect(summary).toHaveProperty('totalAgents')
      expect(summary).toHaveProperty('healthyAgents')
      expect(summary).toHaveProperty('unhealthyAgents')
      expect(summary).toHaveProperty('criticalAgents')
    })
  })
})