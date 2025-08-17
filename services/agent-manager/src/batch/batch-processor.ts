/**
 * Batch Processing Service for Agent Operations
 * Provides queue-based batch processing with subscription tier enforcement
 */

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { subscriptionService, UserSubscription } from '../subscription/subscription-service.js'

export interface BatchOperation {
  id: string
  userId: string
  type: 'spawn' | 'terminate' | 'command' | 'message'
  operations: BatchOperationItem[]
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  priority: number
  progress: {
    total: number
    completed: number
    failed: number
  }
  results: BatchOperationResult[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export interface BatchOperationItem {
  id: string
  type: 'spawn' | 'terminate' | 'command' | 'message'
  payload: any
  retries?: number
}

export interface BatchOperationResult {
  operationId: string
  success: boolean
  result?: any
  error?: string
  executedAt: Date
}

export class BatchProcessor extends EventEmitter {
  private queue: BatchOperation[] = []
  private activeBatches: Map<string, BatchOperation> = new Map()
  private isProcessing = false
  private maxConcurrentBatches = 5
  private processingInterval = 1000 // 1 second

  constructor() {
    super()
    this.startProcessing()
  }

  /**
   * Submit batch operation for processing
   */
  async submitBatch(
    userId: string,
    type: BatchOperation['type'],
    operations: Omit<BatchOperationItem, 'id'>[]
  ): Promise<{ batchId: string, success: boolean, error?: string }> {
    
    try {
      // Get user subscription and validate
      const subscription = subscriptionService.getUserSubscription(userId)
      const currentBatches = this.getUserActiveBatches(userId)
      
      // Check if user can start batch operation
      const validation = subscriptionService.canStartBatchOperation(
        userId,
        operations.length,
        currentBatches
      )

      if (!validation.allowed) {
        return {
          batchId: '',
          success: false,
          error: validation.reason
        }
      }

      // Create batch operation
      const batchId = uuidv4()
      const batchOperations: BatchOperationItem[] = operations.map(op => ({
        ...op,
        id: uuidv4()
      }))

      const batch: BatchOperation = {
        id: batchId,
        userId,
        type,
        operations: batchOperations,
        status: 'queued',
        priority: subscription.tier.priorityQueue ? 10 : 1, // Higher priority for paid tiers
        progress: {
          total: batchOperations.length,
          completed: 0,
          failed: 0
        },
        results: [],
        createdAt: new Date()
      }

      // Add to queue
      this.queue.push(batch)
      this.sortQueue()

      // Emit queued event
      this.emit('batch:queued', { batchId, userId, operationCount: operations.length })

      return {
        batchId,
        success: true
      }

    } catch (error: any) {
      return {
        batchId: '',
        success: false,
        error: error.message || 'Failed to submit batch'
      }
    }
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchId: string): BatchOperation | null {
    // Check active batches first
    const active = this.activeBatches.get(batchId)
    if (active) return active

    // Check queue
    return this.queue.find(batch => batch.id === batchId) || null
  }

  /**
   * Cancel batch operation
   */
  cancelBatch(batchId: string, userId: string): boolean {
    // Remove from queue if not started
    const queueIndex = this.queue.findIndex(batch => batch.id === batchId && batch.userId === userId)
    if (queueIndex >= 0) {
      const batch = this.queue[queueIndex]
      batch.status = 'cancelled'
      batch.completedAt = new Date()
      this.queue.splice(queueIndex, 1)
      this.emit('batch:cancelled', { batchId, userId })
      return true
    }

    // Cancel active batch
    const activeBatch = this.activeBatches.get(batchId)
    if (activeBatch && activeBatch.userId === userId) {
      activeBatch.status = 'cancelled'
      activeBatch.completedAt = new Date()
      this.activeBatches.delete(batchId)
      this.emit('batch:cancelled', { batchId, userId })
      return true
    }

    return false
  }

  /**
   * Get user's active batches count
   */
  private getUserActiveBatches(userId: string): number {
    let count = 0
    
    // Count queued batches
    count += this.queue.filter(batch => batch.userId === userId).length
    
    // Count active batches
    for (const batch of this.activeBatches.values()) {
      if (batch.userId === userId) count++
    }

    return count
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
  }

  /**
   * Start the batch processing loop
   */
  private startProcessing(): void {
    if (this.isProcessing) return

    this.isProcessing = true
    setInterval(() => {
      this.processQueue()
    }, this.processingInterval)
  }

  /**
   * Process queued batches
   */
  private async processQueue(): Promise<void> {
    // Check if we can process more batches
    if (this.activeBatches.size >= this.maxConcurrentBatches) {
      return
    }

    // Get next batch from queue
    const nextBatch = this.queue.shift()
    if (!nextBatch) return

    // Move to active processing
    this.activeBatches.set(nextBatch.id, nextBatch)
    nextBatch.status = 'processing'
    nextBatch.startedAt = new Date()

    // Emit processing event
    this.emit('batch:started', {
      batchId: nextBatch.id,
      userId: nextBatch.userId,
      operationCount: nextBatch.operations.length
    })

    try {
      await this.processBatch(nextBatch)
    } catch (error: any) {
      nextBatch.status = 'failed'
      nextBatch.error = error.message || 'Batch processing failed'
      this.emit('batch:failed', {
        batchId: nextBatch.id,
        userId: nextBatch.userId,
        error: nextBatch.error
      })
    } finally {
      // Mark as completed and remove from active
      nextBatch.completedAt = new Date()
      this.activeBatches.delete(nextBatch.id)
    }
  }

  /**
   * Process individual batch
   */
  private async processBatch(batch: BatchOperation): Promise<void> {
    for (const operation of batch.operations) {
      if (batch.status === 'cancelled') {
        break
      }

      try {
        const result = await this.executeOperation(batch, operation)
        
        batch.results.push({
          operationId: operation.id,
          success: true,
          result,
          executedAt: new Date()
        })
        
        batch.progress.completed++

        // Emit progress update
        this.emit('batch:progress', {
          batchId: batch.id,
          userId: batch.userId,
          progress: {
            ...batch.progress,
            percentage: Math.round((batch.progress.completed / batch.progress.total) * 100)
          }
        })

      } catch (error: any) {
        batch.results.push({
          operationId: operation.id,
          success: false,
          error: error.message || 'Operation failed',
          executedAt: new Date()
        })
        
        batch.progress.failed++
      }
    }

    // Mark batch as completed
    batch.status = batch.progress.failed === 0 ? 'completed' : 'failed'
    
    this.emit('batch:completed', {
      batchId: batch.id,
      userId: batch.userId,
      results: {
        total: batch.progress.total,
        completed: batch.progress.completed,
        failed: batch.progress.failed
      }
    })
  }

  /**
   * Execute individual operation (to be implemented by specific operation handlers)
   */
  private async executeOperation(batch: BatchOperation, operation: BatchOperationItem): Promise<any> {
    // This is a placeholder - actual implementation would delegate to specific operation handlers
    // For demo purposes, simulate work
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return {
      operationId: operation.id,
      type: operation.type,
      status: 'completed'
    }
  }

  /**
   * Get queue metrics
   */
  getMetrics(): {
    queueSize: number
    activeBatches: number
    totalProcessed: number
  } {
    return {
      queueSize: this.queue.length,
      activeBatches: this.activeBatches.size,
      totalProcessed: 0 // Would track this in production
    }
  }
}

// Singleton instance
export const batchProcessor = new BatchProcessor()