/**
 * Subscription Service for Agent Limits and Tier Management
 * Provides subscription tier validation and enforcement for batch operations
 */

export interface SubscriptionTier {
  name: 'free' | 'team' | 'pro' | 'enterprise'
  maxAgents: number
  maxConcurrentBatch: number
  maxBatchSize: number
  features: string[]
  priorityQueue: boolean
}

export interface UserSubscription {
  userId: string
  tier: SubscriptionTier
  currentAgents: number
  lastUpdated: Date
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

export class SubscriptionService {
  private subscriptions: Map<string, UserSubscription> = new Map()
  
  // Define subscription tiers with agent limits
  private readonly tiers: Record<string, SubscriptionTier> = {
    free: {
      name: 'free',
      maxAgents: 3,
      maxConcurrentBatch: 1,
      maxBatchSize: 5,
      features: ['basic_agents', 'single_workflow'],
      priorityQueue: false
    },
    team: {
      name: 'team',
      maxAgents: 10,
      maxConcurrentBatch: 2,
      maxBatchSize: 15,
      features: ['basic_agents', 'workflows', 'batch_operations', 'team_collaboration'],
      priorityQueue: false
    },
    pro: {
      name: 'pro',
      maxAgents: 25,
      maxConcurrentBatch: 5,
      maxBatchSize: 50,
      features: ['advanced_agents', 'unlimited_workflows', 'parallel_batch', 'priority_support'],
      priorityQueue: true
    },
    enterprise: {
      name: 'enterprise',
      maxAgents: 100,
      maxConcurrentBatch: 10,
      maxBatchSize: 200,
      features: ['enterprise_agents', 'custom_workflows', 'unlimited_batch', 'dedicated_support', 'sla'],
      priorityQueue: true
    }
  }

  /**
   * Get subscription tier for user
   */
  getUserSubscription(userId: string): UserSubscription {
    const existing = this.subscriptions.get(userId)
    if (existing) {
      return existing
    }

    // Default to free tier for new users
    const freeSubscription: UserSubscription = {
      userId,
      tier: this.tiers.free,
      currentAgents: 0,
      lastUpdated: new Date()
    }
    
    this.subscriptions.set(userId, freeSubscription)
    return freeSubscription
  }

  /**
   * Update user subscription tier
   */
  updateSubscription(userId: string, tierName: string, stripeData?: { customerId?: string, subscriptionId?: string }): UserSubscription {
    const tier = this.tiers[tierName]
    if (!tier) {
      throw new Error(`Invalid subscription tier: ${tierName}`)
    }

    const existing = this.getUserSubscription(userId)
    const updated: UserSubscription = {
      ...existing,
      tier,
      lastUpdated: new Date(),
      ...(stripeData?.customerId && { stripeCustomerId: stripeData.customerId }),
      ...(stripeData?.subscriptionId && { stripeSubscriptionId: stripeData.subscriptionId })
    }

    this.subscriptions.set(userId, updated)
    return updated
  }

  /**
   * Check if user can spawn more agents
   */
  canSpawnAgent(userId: string): { allowed: boolean, reason?: string } {
    const subscription = this.getUserSubscription(userId)
    
    if (subscription.currentAgents >= subscription.tier.maxAgents) {
      return {
        allowed: false,
        reason: `Agent limit reached for ${subscription.tier.name} tier (${subscription.tier.maxAgents} max)`
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can start batch operation
   */
  canStartBatchOperation(userId: string, batchSize: number, currentBatches: number): { allowed: boolean, reason?: string } {
    const subscription = this.getUserSubscription(userId)
    
    if (currentBatches >= subscription.tier.maxConcurrentBatch) {
      return {
        allowed: false,
        reason: `Concurrent batch limit reached for ${subscription.tier.name} tier (${subscription.tier.maxConcurrentBatch} max)`
      }
    }

    if (batchSize > subscription.tier.maxBatchSize) {
      return {
        allowed: false,
        reason: `Batch size too large for ${subscription.tier.name} tier (${subscription.tier.maxBatchSize} max)`
      }
    }

    return { allowed: true }
  }

  /**
   * Update agent count for user
   */
  updateAgentCount(userId: string, delta: number): void {
    const subscription = this.getUserSubscription(userId)
    subscription.currentAgents = Math.max(0, subscription.currentAgents + delta)
    subscription.lastUpdated = new Date()
    this.subscriptions.set(userId, subscription)
  }

  /**
   * Check if user has feature access
   */
  hasFeature(userId: string, feature: string): boolean {
    const subscription = this.getUserSubscription(userId)
    return subscription.tier.features.includes(feature)
  }

  /**
   * Get all subscription tiers (for pricing page)
   */
  getAllTiers(): SubscriptionTier[] {
    return Object.values(this.tiers)
  }

  /**
   * Get subscription metrics for monitoring
   */
  getMetrics(): { totalUsers: number, tierBreakdown: Record<string, number> } {
    const tierBreakdown: Record<string, number> = {}
    
    for (const subscription of this.subscriptions.values()) {
      const tierName = subscription.tier.name
      tierBreakdown[tierName] = (tierBreakdown[tierName] || 0) + 1
    }

    return {
      totalUsers: this.subscriptions.size,
      tierBreakdown
    }
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService()