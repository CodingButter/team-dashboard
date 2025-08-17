/**
 * Batch Operation Routes
 * API endpoints for batch agent operations with subscription tier enforcement
 */

import { FastifyInstance } from 'fastify'
import { batchProcessor } from '../batch/batch-processor.js'
import { subscriptionService } from '../subscription/subscription-service.js'

export async function registerBatchRoutes(fastify: FastifyInstance) {
  
  // Submit batch operation
  fastify.post<{
    Body: {
      userId: string
      type: 'spawn' | 'terminate' | 'command' | 'message'
      operations: Array<{
        type: 'spawn' | 'terminate' | 'command' | 'message'
        payload: any
      }>
    }
  }>('/batch', async (request, reply) => {
    try {
      const { userId, type, operations } = request.body

      if (!userId || !type || !operations || !Array.isArray(operations)) {
        return reply.code(400).send({
          error: 'userId, type, and operations array are required'
        })
      }

      if (operations.length === 0) {
        return reply.code(400).send({
          error: 'Operations array cannot be empty'
        })
      }

      const result = await batchProcessor.submitBatch(userId, type, operations)

      if (!result.success) {
        return reply.code(400).send({
          error: result.error
        })
      }

      return reply.code(201).send({
        batchId: result.batchId,
        message: 'Batch operation queued successfully',
        operationCount: operations.length
      })

    } catch (error: any) {
      fastify.log.error('Error submitting batch operation:', error)
      return reply.code(500).send({
        error: 'Failed to submit batch operation',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Get batch status
  fastify.get<{
    Params: { batchId: string }
  }>('/batch/:batchId', async (request, reply) => {
    try {
      const { batchId } = request.params

      const batch = batchProcessor.getBatchStatus(batchId)
      if (!batch) {
        return reply.code(404).send({
          error: 'Batch operation not found'
        })
      }

      return {
        id: batch.id,
        userId: batch.userId,
        type: batch.type,
        status: batch.status,
        progress: {
          ...batch.progress,
          percentage: Math.round((batch.progress.completed / batch.progress.total) * 100)
        },
        createdAt: batch.createdAt,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        error: batch.error,
        results: batch.results
      }

    } catch (error: any) {
      fastify.log.error('Error fetching batch status:', error)
      return reply.code(500).send({
        error: 'Failed to fetch batch status',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Cancel batch operation
  fastify.delete<{
    Params: { batchId: string }
    Body: { userId: string }
  }>('/batch/:batchId', async (request, reply) => {
    try {
      const { batchId } = request.params
      const { userId } = request.body

      if (!userId) {
        return reply.code(400).send({
          error: 'userId is required'
        })
      }

      const cancelled = batchProcessor.cancelBatch(batchId, userId)
      
      if (!cancelled) {
        return reply.code(404).send({
          error: 'Batch operation not found or already completed'
        })
      }

      return {
        message: 'Batch operation cancelled successfully',
        batchId
      }

    } catch (error: any) {
      fastify.log.error('Error cancelling batch operation:', error)
      return reply.code(500).send({
        error: 'Failed to cancel batch operation',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Batch spawn agents
  fastify.post<{
    Body: {
      userId: string
      agents: Array<{
        name?: string
        workspace?: string
        openaiApiKey: string
        openaiModel?: string
        model?: string
        environment?: Record<string, string>
        systemPrompt?: string
      }>
    }
  }>('/batch/spawn', async (request, reply) => {
    try {
      const { userId, agents } = request.body

      if (!userId || !agents || !Array.isArray(agents)) {
        return reply.code(400).send({
          error: 'userId and agents array are required'
        })
      }

      // Check if user can spawn these agents
      const subscription = subscriptionService.getUserSubscription(userId)
      const totalNewAgents = agents.length
      
      if (subscription.currentAgents + totalNewAgents > subscription.tier.maxAgents) {
        return reply.code(400).send({
          error: `Would exceed agent limit for ${subscription.tier.name} tier (${subscription.tier.maxAgents} max)`
        })
      }

      const operations = agents.map(agent => ({
        type: 'spawn' as const,
        payload: agent
      }))

      const result = await batchProcessor.submitBatch(userId, 'spawn', operations)

      if (!result.success) {
        return reply.code(400).send({
          error: result.error
        })
      }

      return reply.code(201).send({
        batchId: result.batchId,
        message: 'Batch agent spawn queued successfully',
        agentCount: agents.length
      })

    } catch (error: any) {
      fastify.log.error('Error spawning batch agents:', error)
      return reply.code(500).send({
        error: 'Failed to spawn batch agents',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Batch terminate agents
  fastify.post<{
    Body: {
      userId: string
      agentIds: string[]
    }
  }>('/batch/terminate', async (request, reply) => {
    try {
      const { userId, agentIds } = request.body

      if (!userId || !agentIds || !Array.isArray(agentIds)) {
        return reply.code(400).send({
          error: 'userId and agentIds array are required'
        })
      }

      const operations = agentIds.map(agentId => ({
        type: 'terminate' as const,
        payload: { agentId }
      }))

      const result = await batchProcessor.submitBatch(userId, 'terminate', operations)

      if (!result.success) {
        return reply.code(400).send({
          error: result.error
        })
      }

      return reply.code(201).send({
        batchId: result.batchId,
        message: 'Batch agent termination queued successfully',
        agentCount: agentIds.length
      })

    } catch (error: any) {
      fastify.log.error('Error terminating batch agents:', error)
      return reply.code(500).send({
        error: 'Failed to terminate batch agents',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Get subscription info
  fastify.get<{
    Params: { userId: string }
  }>('/subscription/:userId', async (request, reply) => {
    try {
      const { userId } = request.params

      const subscription = subscriptionService.getUserSubscription(userId)
      
      return {
        userId: subscription.userId,
        tier: subscription.tier,
        currentAgents: subscription.currentAgents,
        limits: {
          maxAgents: subscription.tier.maxAgents,
          maxConcurrentBatch: subscription.tier.maxConcurrentBatch,
          maxBatchSize: subscription.tier.maxBatchSize
        },
        features: subscription.tier.features,
        lastUpdated: subscription.lastUpdated
      }

    } catch (error: any) {
      fastify.log.error('Error fetching subscription:', error)
      return reply.code(500).send({
        error: 'Failed to fetch subscription',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Update subscription tier
  fastify.put<{
    Params: { userId: string }
    Body: {
      tier: string
      stripeCustomerId?: string
      stripeSubscriptionId?: string
    }
  }>('/subscription/:userId', async (request, reply) => {
    try {
      const { userId } = request.params
      const { tier, stripeCustomerId, stripeSubscriptionId } = request.body

      if (!tier) {
        return reply.code(400).send({
          error: 'tier is required'
        })
      }

      const updatedSubscription = subscriptionService.updateSubscription(
        userId,
        tier,
        { customerId: stripeCustomerId, subscriptionId: stripeSubscriptionId }
      )

      return {
        message: 'Subscription updated successfully',
        subscription: {
          userId: updatedSubscription.userId,
          tier: updatedSubscription.tier,
          currentAgents: updatedSubscription.currentAgents,
          lastUpdated: updatedSubscription.lastUpdated
        }
      }

    } catch (error: any) {
      fastify.log.error('Error updating subscription:', error)
      return reply.code(500).send({
        error: 'Failed to update subscription',
        details: error?.message || 'Unknown error'
      })
    }
  })

  // Get batch processor metrics
  fastify.get('/batch/metrics', async (request, reply) => {
    try {
      const batchMetrics = batchProcessor.getMetrics()
      const subscriptionMetrics = subscriptionService.getMetrics()

      return {
        batch: batchMetrics,
        subscriptions: subscriptionMetrics,
        timestamp: new Date()
      }

    } catch (error: any) {
      fastify.log.error('Error fetching metrics:', error)
      return reply.code(500).send({
        error: 'Failed to fetch metrics',
        details: error?.message || 'Unknown error'
      })
    }
  })
}