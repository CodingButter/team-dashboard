/**
 * @package agent-manager/tests/lifecycle
 * Agent Lifecycle Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import AgentLifecycleManager from '../../src/lifecycle/agent-lifecycle.js'
import { createMockAgentProcess, createMockSpawnConfig } from './test-helpers.js'

describe('Agent Lifecycle Manager', () => {
  let lifecycleManager: AgentLifecycleManager
  
  beforeEach(() => {
    lifecycleManager = new AgentLifecycleManager({
      maxRestartAttempts: 3,
      gracefulShutdownTimeout: 5000,
      healthCheckInterval: 1000
    })
  })

  afterEach(() => {
    lifecycleManager?.cleanup()
  })

  describe('Agent Registration and Status Management', () => {
    it('should register agent with initial status', () => {
      const agent = createMockAgentProcess('test-1')
      lifecycleManager.registerAgent(agent)
      
      expect(lifecycleManager.getAgentStatus('test-1')).toBe('starting')
      expect(lifecycleManager.getRegisteredAgents()).toContain('test-1')
    })

    it('should validate state transitions', () => {
      const agent = createMockAgentProcess('test-2')
      lifecycleManager.registerAgent(agent)
      
      expect(() => lifecycleManager.updateAgentStatus('test-2', 'running')).not.toThrow()
      expect(() => lifecycleManager.updateAgentStatus('test-2', 'error')).not.toThrow()
      expect(lifecycleManager.getAgentStatus('test-2')).toBe('error')
    })

    it('should maintain state history', () => {
      const agent = createMockAgentProcess('test-3')
      lifecycleManager.registerAgent(agent)
      
      lifecycleManager.updateAgentStatus('test-3', 'running')
      lifecycleManager.updateAgentStatus('test-3', 'paused')
      
      const history = lifecycleManager.getAgentHistory('test-3')
      expect(history).toHaveLength(3) // starting, running, paused
      expect(history[0].status).toBe('starting')
      expect(history[2].status).toBe('paused')
    })
  })

  describe('Restart Logic', () => {
    it('should handle agent failures with exponential backoff', async () => {
      const agent = createMockAgentProcess('test-4')
      lifecycleManager.registerAgent(agent)
      
      const restartSpy = vi.spyOn(lifecycleManager, 'restartAgent')
      lifecycleManager.updateAgentStatus('test-4', 'error')
      
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(restartSpy).toHaveBeenCalledWith('test-4')
    })

    it('should terminate agent after max restart attempts', async () => {
      const agent = createMockAgentProcess('test-5')
      lifecycleManager.registerAgent(agent)
      
      // Simulate multiple failures
      for (let i = 0; i < 4; i++) {
        lifecycleManager.updateAgentStatus('test-5', 'error')
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      expect(lifecycleManager.getAgentStatus('test-5')).toBe('terminated')
    })
  })

  describe('Graceful Shutdown', () => {
    it('should perform graceful shutdown', async () => {
      const agent = createMockAgentProcess('test-6')
      lifecycleManager.registerAgent(agent)
      lifecycleManager.updateAgentStatus('test-6', 'running')
      
      const shutdownPromise = lifecycleManager.shutdownAgent('test-6', true)
      await expect(shutdownPromise).resolves.toBe(true)
      expect(lifecycleManager.getAgentStatus('test-6')).toBe('stopped')
    })

    it('should timeout on graceful shutdown', async () => {
      const agent = createMockAgentProcess('test-7')
      agent.kill = vi.fn().mockImplementation(() => {
        // Simulate unresponsive agent
        return new Promise(resolve => setTimeout(resolve, 10000))
      })
      
      lifecycleManager.registerAgent(agent)
      lifecycleManager.updateAgentStatus('test-7', 'running')
      
      const shutdownPromise = lifecycleManager.shutdownAgent('test-7', true)
      await expect(shutdownPromise).resolves.toBe(false)
    })
  })
})