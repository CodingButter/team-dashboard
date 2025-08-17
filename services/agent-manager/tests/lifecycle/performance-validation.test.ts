/**
 * @package agent-manager/tests/lifecycle
 * Performance Validation Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import IntegratedAgentLifecycleManager from '../../src/lifecycle/index.js'
import { createMockSpawnConfig, delay } from './test-helpers.js'

describe('Performance Validation', () => {
  let manager: IntegratedAgentLifecycleManager

  beforeEach(() => {
    manager = new IntegratedAgentLifecycleManager()
  })

  afterEach(async () => {
    await manager?.shutdown()
  })

  it('should handle concurrent agent operations', async () => {
    const configs = Array.from({ length: 5 }, (_, i) => 
      createMockSpawnConfig(`perf-${i}`)
    )
    
    const startTime = Date.now()
    const agents = await Promise.all(
      configs.map(config => manager.spawnAgent(config))
    )
    const duration = Date.now() - startTime
    
    expect(agents).toHaveLength(5)
    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
  })

  it('should maintain performance under load', async () => {
    const agentIds: string[] = []
    
    // Spawn multiple agents
    for (let i = 0; i < 10; i++) {
      const config = createMockSpawnConfig(`load-${i}`)
      const agent = await manager.spawnAgent(config)
      agentIds.push(agent.id)
    }
    
    // Perform operations on all agents
    const startTime = Date.now()
    await Promise.all(agentIds.map(id => manager.pauseAgent(id)))
    await Promise.all(agentIds.map(id => manager.resumeAgent(id)))
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(2000) // Should handle bulk operations efficiently
  })

  it('should validate memory usage stays within bounds', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Create and destroy agents to test memory leaks
    for (let i = 0; i < 20; i++) {
      const config = createMockSpawnConfig(`memory-${i}`)
      const agent = await manager.spawnAgent(config)
      await manager.terminateAgent(agent.id)
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc()
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryGrowth = finalMemory - initialMemory
    
    // Memory growth should be reasonable (less than 50MB)
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)
  })
})