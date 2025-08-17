/**
 * Batch Processing Test
 * Test batch operations with different subscription tiers
 */

import { subscriptionService } from '../subscription/subscription-service.js'
import { batchProcessor } from './batch-processor.js'
import { subscriptionAgentManager } from '../agents/subscription-agent-manager.js'

export class BatchProcessingTest {
  
  /**
   * Test subscription tier limits
   */
  static async testSubscriptionLimits(): Promise<void> {
    console.log('🧪 Testing Subscription Tier Limits...')

    // Test free tier limits
    const freeUser = 'user-free-123'
    subscriptionService.updateSubscription(freeUser, 'free')
    
    console.log('📊 Free tier subscription:', subscriptionService.getUserSubscription(freeUser))
    
    // Test can spawn agents
    const canSpawn = subscriptionService.canSpawnAgent(freeUser)
    console.log('✅ Can spawn agent (free):', canSpawn)

    // Test batch operation limits
    const canBatch = subscriptionService.canStartBatchOperation(freeUser, 3, 0)
    console.log('✅ Can start batch (free, 3 operations):', canBatch)

    const canBatchLarge = subscriptionService.canStartBatchOperation(freeUser, 10, 0)
    console.log('❌ Can start large batch (free, 10 operations):', canBatchLarge)

    // Test pro tier
    const proUser = 'user-pro-456'
    subscriptionService.updateSubscription(proUser, 'pro')
    
    console.log('📊 Pro tier subscription:', subscriptionService.getUserSubscription(proUser))
    
    const canBatchPro = subscriptionService.canStartBatchOperation(proUser, 25, 0)
    console.log('✅ Can start batch (pro, 25 operations):', canBatchPro)
  }

  /**
   * Test batch processing queue
   */
  static async testBatchProcessing(): Promise<void> {
    console.log('\n🧪 Testing Batch Processing Queue...')

    const testUser = 'user-test-789'
    subscriptionService.updateSubscription(testUser, 'team')

    // Create test batch operations
    const operations = [
      { type: 'spawn' as const, payload: { name: 'test-agent-1' } },
      { type: 'spawn' as const, payload: { name: 'test-agent-2' } },
      { type: 'spawn' as const, payload: { name: 'test-agent-3' } }
    ]

    // Submit batch
    const result = await batchProcessor.submitBatch(testUser, 'spawn', operations)
    console.log('📤 Batch submitted:', result)

    if (result.success) {
      // Monitor batch status
      const monitorBatch = setInterval(() => {
        const status = batchProcessor.getBatchStatus(result.batchId)
        if (status) {
          console.log('📊 Batch status:', {
            id: status.id,
            status: status.status,
            progress: status.progress
          })

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(monitorBatch)
            console.log('✅ Batch processing completed')
          }
        }
      }, 500)

      // Stop monitoring after 10 seconds
      setTimeout(() => {
        clearInterval(monitorBatch)
      }, 10000)
    }
  }

  /**
   * Test subscription metrics
   */
  static testMetrics(): void {
    console.log('\n🧪 Testing Metrics...')

    const batchMetrics = batchProcessor.getMetrics()
    console.log('📊 Batch metrics:', batchMetrics)

    const subscriptionMetrics = subscriptionService.getMetrics()
    console.log('📊 Subscription metrics:', subscriptionMetrics)

    const agentMetrics = subscriptionAgentManager.getSubscriptionMetrics()
    console.log('📊 Agent metrics:', agentMetrics)
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Batch Processing Tests...\n')

    try {
      await this.testSubscriptionLimits()
      await this.testBatchProcessing()
      this.testMetrics()
      
      console.log('\n✅ All batch processing tests completed successfully!')
      
    } catch (error: any) {
      console.error('\n❌ Test failed:', error.message)
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  BatchProcessingTest.runAllTests()
}