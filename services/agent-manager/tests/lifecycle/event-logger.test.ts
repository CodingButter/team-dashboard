/**
 * @package agent-manager/tests/lifecycle
 * Event Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import AgentLifecycleEventLogger from '../../src/lifecycle/event-logger.js'

describe('Event Logger', () => {
  let eventLogger: AgentLifecycleEventLogger

  beforeEach(() => {
    eventLogger = new AgentLifecycleEventLogger({
      logLevel: 'debug',
      maxLogEntries: 1000,
      enableFileLogging: false
    })
  })

  afterEach(() => {
    eventLogger?.cleanup()
  })

  it('should log lifecycle events', () => {
    eventLogger.logEvent('test-agent', 'agent_started', { timestamp: Date.now() })
    
    const events = eventLogger.getEvents('test-agent')
    expect(events).toHaveLength(1)
    expect(events[0].event).toBe('agent_started')
  })

  it('should filter events by severity', () => {
    eventLogger.logEvent('test-agent', 'agent_error', { severity: 'error' })
    eventLogger.logEvent('test-agent', 'agent_info', { severity: 'info' })
    
    const errorEvents = eventLogger.getEventsBySeverity('error')
    expect(errorEvents).toHaveLength(1)
    expect(errorEvents[0].event).toBe('agent_error')
  })
})