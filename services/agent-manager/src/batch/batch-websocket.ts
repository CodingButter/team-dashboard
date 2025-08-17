/**
 * WebSocket Events for Batch Operations
 * Provides real-time updates for batch processing status
 */

import { EventEmitter } from 'events'
import { batchProcessor } from './batch-processor.js'

export interface BatchWebSocketMessage {
  type: 'batch:status' | 'batch:progress' | 'batch:completed' | 'batch:failed' | 'batch:cancelled'
  batchId: string
  userId: string
  data: any
  timestamp: Date
}

export class BatchWebSocketManager extends EventEmitter {
  private connections: Map<string, any> = new Map() // userId -> WebSocket connection

  constructor() {
    super()
    this.setupBatchProcessorEvents()
  }

  /**
   * Setup event listeners for batch processor
   */
  private setupBatchProcessorEvents(): void {
    batchProcessor.on('batch:queued', (data) => {
      this.broadcastToUser(data.userId, {
        type: 'batch:status',
        batchId: data.batchId,
        userId: data.userId,
        data: {
          status: 'queued',
          message: `Batch operation queued with ${data.operationCount} operations`
        },
        timestamp: new Date()
      })
    })

    batchProcessor.on('batch:started', (data) => {
      this.broadcastToUser(data.userId, {
        type: 'batch:status',
        batchId: data.batchId,
        userId: data.userId,
        data: {
          status: 'processing',
          message: `Batch operation started processing ${data.operationCount} operations`
        },
        timestamp: new Date()
      })
    })

    batchProcessor.on('batch:progress', (data) => {
      this.broadcastToUser(data.userId, {
        type: 'batch:progress',
        batchId: data.batchId,
        userId: data.userId,
        data: {
          progress: data.progress,
          message: `Batch operation ${data.progress.percentage}% complete`
        },
        timestamp: new Date()
      })
    })

    batchProcessor.on('batch:completed', (data) => {
      this.broadcastToUser(data.userId, {
        type: 'batch:completed',
        batchId: data.batchId,
        userId: data.userId,
        data: {
          results: data.results,
          message: `Batch operation completed: ${data.results.completed} successful, ${data.results.failed} failed`
        },
        timestamp: new Date()
      })
    })

    batchProcessor.on('batch:failed', (data) => {
      this.broadcastToUser(data.userId, {
        type: 'batch:failed',
        batchId: data.batchId,
        userId: data.userId,
        data: {
          error: data.error,
          message: `Batch operation failed: ${data.error}`
        },
        timestamp: new Date()
      })
    })

    batchProcessor.on('batch:cancelled', (data) => {
      this.broadcastToUser(data.userId, {
        type: 'batch:cancelled',
        batchId: data.batchId,
        userId: data.userId,
        data: {
          message: 'Batch operation was cancelled'
        },
        timestamp: new Date()
      })
    })
  }

  /**
   * Register WebSocket connection for user
   */
  registerConnection(userId: string, connection: any): void {
    this.connections.set(userId, connection)

    // Setup connection close handler
    connection.on('close', () => {
      this.connections.delete(userId)
    })

    // Send welcome message
    this.sendToConnection(connection, {
      type: 'batch:status',
      batchId: '',
      userId,
      data: {
        message: 'Connected to batch operation updates',
        status: 'connected'
      },
      timestamp: new Date()
    })
  }

  /**
   * Unregister WebSocket connection
   */
  unregisterConnection(userId: string): void {
    const connection = this.connections.get(userId)
    if (connection) {
      connection.close()
      this.connections.delete(userId)
    }
  }

  /**
   * Broadcast message to specific user
   */
  private broadcastToUser(userId: string, message: BatchWebSocketMessage): void {
    const connection = this.connections.get(userId)
    if (connection) {
      this.sendToConnection(connection, message)
    }
  }

  /**
   * Send message to WebSocket connection
   */
  private sendToConnection(connection: any, message: BatchWebSocketMessage): void {
    try {
      if (connection.readyState === 1) { // WebSocket.OPEN
        connection.send(JSON.stringify(message))
      }
    } catch (error: any) {
      console.error('Failed to send WebSocket message:', error.message)
    }
  }

  /**
   * Broadcast message to all connected users
   */
  broadcastToAll(message: Omit<BatchWebSocketMessage, 'userId'>): void {
    for (const [userId, connection] of this.connections.entries()) {
      this.sendToConnection(connection, { ...message, userId })
    }
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): {
    activeConnections: number
    connectionsByUser: Record<string, boolean>
  } {
    const connectionsByUser: Record<string, boolean> = {}
    
    for (const [userId] of this.connections.entries()) {
      connectionsByUser[userId] = true
    }

    return {
      activeConnections: this.connections.size,
      connectionsByUser
    }
  }

  /**
   * Send batch status update manually
   */
  sendBatchUpdate(userId: string, batchId: string, status: string, data: any): void {
    this.broadcastToUser(userId, {
      type: 'batch:status',
      batchId,
      userId,
      data: {
        status,
        ...data
      },
      timestamp: new Date()
    })
  }
}

// Singleton instance
export const batchWebSocketManager = new BatchWebSocketManager()