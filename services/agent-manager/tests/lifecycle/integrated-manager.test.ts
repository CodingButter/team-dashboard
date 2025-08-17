/**
 * @package agent-manager/tests/lifecycle  
 * Integrated Lifecycle Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import IntegratedAgentLifecycleManager from '../../src/lifecycle/index.js'
import { createMockSpawnConfig } from './test-helpers.js'

describe('Integrated Lifecycle Manager', () => {
  let manager: IntegratedAgentLifecycleManager

  beforeEach(() => {
    manager = new IntegratedAgentLifecycleManager()
  })

  afterEach(async () => {
    await manager?.shutdown()
  })

  it('should integrate all lifecycle components', async () => {
    const config = createMockSpawnConfig('integrated-1')
    
    const agent = await manager.spawnAgent(config)
    expect(agent).toBeDefined()
    expect(agent.id).toBe('integrated-1')
  })

  it('should handle agent lifecycle end-to-end', async () => {
    const config = createMockSpawnConfig('integrated-2')
    
    const agent = await manager.spawnAgent(config)
    await manager.pauseAgent(agent.id)
    await manager.resumeAgent(agent.id)
    await manager.terminateAgent(agent.id)
    
    expect(manager.getAgentStatus(agent.id)).toBe('terminated')
  })
})