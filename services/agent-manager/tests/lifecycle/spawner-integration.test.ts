/**
 * @package agent-manager/tests/lifecycle
 * Agent Spawner Integration Tests  
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgentSpawner } from '../../src/agents/agent-spawner.js'
import { createMockSpawnConfig } from './test-helpers.js'

describe('Agent Spawner Integration', () => {
  let spawner: AgentSpawner

  beforeEach(() => {
    spawner = new AgentSpawner({
      maxConcurrentAgents: 5,
      defaultWorkspace: '/tmp/test-workspace'
    })
  })

  afterEach(async () => {
    await spawner?.cleanup()
  })

  it('should spawn agent with lifecycle integration', async () => {
    const config = createMockSpawnConfig('spawner-1')
    
    const agent = await spawner.spawn(config)
    expect(agent).toBeDefined()
    expect(agent.status).toBe('starting')
  })

  it('should handle spawning failures', async () => {
    const invalidConfig = createMockSpawnConfig('spawner-2')
    invalidConfig.workspace = '/invalid/path'
    
    await expect(spawner.spawn(invalidConfig)).rejects.toThrow()
  })
})