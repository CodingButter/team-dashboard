/**
 * @package agent-manager/tests/lifecycle
 * Agent Resource Monitor Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import AgentResourceMonitor from '../../src/lifecycle/resource-monitor.js'
import { createMockAgentProcess, mockResourceMetrics, delay } from './test-helpers.js'

describe('Agent Resource Monitor', () => {
  let resourceMonitor: AgentResourceMonitor

  beforeEach(() => {
    resourceMonitor = new AgentResourceMonitor({
      monitoringInterval: 100,
      memoryThreshold: 512,
      cpuThreshold: 80,
      historySizeLimit: 100
    })
  })

  afterEach(() => {
    resourceMonitor?.stop()
  })

  describe('Resource Monitoring', () => {
    it('should start monitoring resources', async () => {
      const agent = createMockAgentProcess('resource-1')
      
      const result = await resourceMonitor.startMonitoring(agent.id, agent.pid)
      expect(result).toBe(true)
      expect(resourceMonitor.isMonitoring(agent.id)).toBe(true)
    })

    it('should collect resource metrics', async () => {
      const agent = createMockAgentProcess('resource-2')
      await resourceMonitor.startMonitoring(agent.id, agent.pid)
      
      await delay(150)
      
      const metrics = resourceMonitor.getResourceMetrics(agent.id)
      expect(metrics).toBeDefined()
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0)
    })

    it('should detect resource threshold violations', async () => {
      const agent = createMockAgentProcess('resource-3')
      await resourceMonitor.startMonitoring(agent.id, agent.pid)
      
      // Simulate high resource usage
      resourceMonitor.updateResourceMetrics(agent.id, {
        ...mockResourceMetrics,
        memoryUsage: 600, // Above threshold
        cpuUsage: 90      // Above threshold
      })
      
      const violations = resourceMonitor.getThresholdViolations(agent.id)
      expect(violations.memory).toBe(true)
      expect(violations.cpu).toBe(true)
    })
  })
})