/**
 * Subscription-Aware Agent Manager
 * Wraps OpenAIAgentManager with subscription tier enforcement
 */

import { EventEmitter } from 'events'
import OpenAIAgentManager, { OpenAIAgentConfig } from './openai-agent-manager.js'
import { subscriptionService } from '../subscription/subscription-service.js'

export interface SubscriptionAwareAgentConfig extends OpenAIAgentConfig {
  userId: string
}

export class SubscriptionAgentManager extends EventEmitter {
  private agentManager: OpenAIAgentManager
  private userAgents: Map<string, Set<string>> = new Map() // userId -> Set of agentIds

  constructor() {
    super()
    this.agentManager = new OpenAIAgentManager()
    this.setupAgentManagerEvents()
  }

  /**
   * Setup event forwarding from underlying agent manager
   */
  private setupAgentManagerEvents(): void {
    this.agentManager.on('agent:spawned', (data) => {
      this.emit('agent:spawned', data)
    })

    this.agentManager.on('agent:terminated', (data) => {
      this.emit('agent:terminated', data)
      // Update agent count when terminated
      this.handleAgentTerminated(data.agentId)
    })

    this.agentManager.on('agent:error', (data) => {
      this.emit('agent:error', data)
    })
  }

  /**
   * Spawn agent with subscription validation
   */
  async spawnAgent(config: SubscriptionAwareAgentConfig): Promise<any> {
    const { userId } = config

    // Check subscription limits
    const canSpawn = subscriptionService.canSpawnAgent(userId)
    if (!canSpawn.allowed) {
      throw new Error(canSpawn.reason)
    }

    try {
      // Spawn agent using underlying manager
      const agent = await this.agentManager.spawnAgent(config)

      // Track agent for user
      if (!this.userAgents.has(userId)) {
        this.userAgents.set(userId, new Set())
      }
      this.userAgents.get(userId)!.add(agent.id)

      // Update subscription agent count
      subscriptionService.updateAgentCount(userId, 1)

      // Emit subscription-aware event
      this.emit('agent:spawned:subscription', {
        userId,
        agentId: agent.id,
        subscription: subscriptionService.getUserSubscription(userId)
      })

      return agent

    } catch (error: any) {
      throw new Error(`Failed to spawn agent: ${error.message}`)
    }
  }

  /**
   * Terminate agent with subscription cleanup
   */
  async terminateAgent(agentId: string, userId?: string): Promise<void> {
    try {
      await this.agentManager.terminateAgent(agentId)
      
      if (userId) {
        this.handleAgentTerminated(agentId, userId)
      }
    } catch (error: any) {
      throw new Error(`Failed to terminate agent: ${error.message}`)
    }
  }

  /**
   * Handle agent termination cleanup
   */
  private handleAgentTerminated(agentId: string, userId?: string): void {
    // Find which user owned this agent if not provided
    if (!userId) {
      for (const [uid, agentSet] of this.userAgents.entries()) {
        if (agentSet.has(agentId)) {
          userId = uid
          break
        }
      }
    }

    if (userId) {
      const userAgentSet = this.userAgents.get(userId)
      if (userAgentSet) {
        userAgentSet.delete(agentId)
        if (userAgentSet.size === 0) {
          this.userAgents.delete(userId)
        }
      }

      // Update subscription agent count
      subscriptionService.updateAgentCount(userId, -1)

      this.emit('agent:terminated:subscription', {
        userId,
        agentId,
        subscription: subscriptionService.getUserSubscription(userId)
      })
    }
  }

  /**
   * Get agents for a specific user
   */
  getUserAgents(userId: string): any[] {
    const userAgentIds = this.userAgents.get(userId) || new Set()
    const allAgents = this.agentManager.listAgents()
    
    return allAgents.filter(agent => userAgentIds.has(agent.id))
  }

  /**
   * Get agent count for user
   */
  getUserAgentCount(userId: string): number {
    const userAgentSet = this.userAgents.get(userId)
    return userAgentSet ? userAgentSet.size : 0
  }

  /**
   * Validate batch operation for user
   */
  validateBatchOperation(userId: string, operationType: 'spawn' | 'terminate', operationCount: number): { allowed: boolean, reason?: string } {
    const subscription = subscriptionService.getUserSubscription(userId)

    if (operationType === 'spawn') {
      const currentAgents = this.getUserAgentCount(userId)
      const newTotal = currentAgents + operationCount
      
      if (newTotal > subscription.tier.maxAgents) {
        return {
          allowed: false,
          reason: `Batch spawn would exceed agent limit for ${subscription.tier.name} tier (${subscription.tier.maxAgents} max)`
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Batch spawn agents with subscription enforcement
   */
  async batchSpawnAgents(userId: string, configs: Omit<SubscriptionAwareAgentConfig, 'userId'>[]): Promise<{ success: any[], failed: any[] }> {
    // Validate batch operation
    const validation = this.validateBatchOperation(userId, 'spawn', configs.length)
    if (!validation.allowed) {
      throw new Error(validation.reason)
    }

    const results = { success: [], failed: [] }

    for (const config of configs) {
      try {
        const agent = await this.spawnAgent({ ...config, userId })
        results.success.push(agent)
      } catch (error: any) {
        results.failed.push({
          config,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Batch terminate agents with subscription cleanup
   */
  async batchTerminateAgents(userId: string, agentIds: string[]): Promise<{ success: string[], failed: any[] }> {
    const results = { success: [], failed: [] }

    for (const agentId of agentIds) {
      try {
        await this.terminateAgent(agentId, userId)
        results.success.push(agentId)
      } catch (error: any) {
        results.failed.push({
          agentId,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Forward other methods to underlying agent manager
   */
  sendMessage(agentId: string, messages: any[], streamCallback?: (chunk: string) => void): Promise<string> {
    return this.agentManager.sendMessage(agentId, messages, streamCallback)
  }

  sendCommand(agentId: string, command: string): Promise<void> {
    return this.agentManager.sendCommand(agentId, command)
  }

  getAgent(agentId: string): any {
    return this.agentManager.getAgent(agentId)
  }

  listAgents(): any[] {
    return this.agentManager.listAgents()
  }

  getCommunicationHistory(agentId: string): any[] {
    return this.agentManager.getCommunicationHistory(agentId)
  }

  /**
   * Get subscription metrics for monitoring
   */
  getSubscriptionMetrics(): {
    totalUsers: number
    agentsByTier: Record<string, number>
    averageAgentsPerUser: number
  } {
    const tierCounts: Record<string, number> = {}
    let totalAgents = 0

    for (const [userId, agentSet] of this.userAgents.entries()) {
      const subscription = subscriptionService.getUserSubscription(userId)
      const tierName = subscription.tier.name
      const agentCount = agentSet.size

      tierCounts[tierName] = (tierCounts[tierName] || 0) + agentCount
      totalAgents += agentCount
    }

    return {
      totalUsers: this.userAgents.size,
      agentsByTier: tierCounts,
      averageAgentsPerUser: this.userAgents.size > 0 ? totalAgents / this.userAgents.size : 0
    }
  }
}

// Singleton instance
export const subscriptionAgentManager = new SubscriptionAgentManager()