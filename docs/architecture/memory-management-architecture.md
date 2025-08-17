# Conversation Memory Management Architecture

## Executive Summary

This document defines the comprehensive architecture for the conversation memory management system, addressing Issue #7 (P0 Priority). The system provides persistent, scalable, and efficient memory management for agent conversations with proper cleanup strategies and subscription-aware limits.

## Architecture Overview

### Core Components

1. **Memory Persistence Layer**
   - Primary: Redis for hot data (active conversations)
   - Secondary: PostgreSQL for historical data and analytics
   - Tertiary: S3-compatible storage for archival

2. **Memory State Management**
   - Hierarchical memory structure
   - Context-aware pruning
   - Subscription-based quotas

3. **API Gateway**
   - RESTful endpoints for CRUD operations
   - WebSocket for real-time updates
   - GraphQL for complex queries

4. **Cleanup Strategies**
   - Time-based expiration
   - Token-based limits
   - Subscription tier enforcement

## Detailed Design

### 1. Memory Persistence Layer

#### Redis Schema
```typescript
interface ConversationMemory {
  sessionId: string;
  agentId: string;
  userId: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  messages: Message[];
  metadata: {
    totalTokens: number;
    totalCost: number;
    createdAt: number;
    updatedAt: number;
    lastAccessedAt: number;
    priority: number;
    tags: string[];
  };
  summary?: ConversationSummary;
}

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  timestamp: number;
  tokens: number;
  embeddings?: number[];
}

interface ConversationSummary {
  text: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  generatedAt: number;
}
```

#### PostgreSQL Schema
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  summary JSONB,
  metadata JSONB
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  embeddings VECTOR(1536),
  metadata JSONB
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_embeddings ON messages USING ivfflat (embeddings);
```

### 2. Memory State Management

#### Hierarchical Structure
```
Active Memory (Redis)
├── Working Memory (last 10 messages)
├── Short-term Memory (last 100 messages)
└── Context Memory (summarized older messages)

Historical Memory (PostgreSQL)
├── Recent History (last 30 days)
├── Archive (30-365 days)
└── Cold Storage (>365 days in S3)
```

#### Memory Optimization Algorithm
```typescript
class MemoryOptimizer {
  optimizeConversation(conversation: ConversationMemory): ConversationMemory {
    const limits = this.getSubscriptionLimits(conversation.subscriptionTier);
    
    // Step 1: Preserve system messages
    const systemMessages = conversation.messages.filter(m => m.role === 'system');
    
    // Step 2: Apply importance scoring
    const scoredMessages = this.scoreMessages(conversation.messages);
    
    // Step 3: Compress older messages
    const compressedMessages = this.compressMessages(scoredMessages, limits);
    
    // Step 4: Generate summary if needed
    if (conversation.messages.length > limits.summaryThreshold) {
      conversation.summary = this.generateSummary(conversation.messages);
    }
    
    return {
      ...conversation,
      messages: [...systemMessages, ...compressedMessages]
    };
  }
  
  private scoreMessages(messages: Message[]): ScoredMessage[] {
    return messages.map(msg => ({
      ...msg,
      score: this.calculateImportance(msg)
    }));
  }
  
  private calculateImportance(message: Message): number {
    let score = 1.0;
    
    // Recent messages are more important
    const age = Date.now() - message.timestamp;
    score *= Math.exp(-age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
    
    // User and assistant messages are more important
    if (message.role === 'user' || message.role === 'assistant') {
      score *= 1.5;
    }
    
    // Longer messages might contain more context
    score *= Math.log(message.content.length + 1) / 10;
    
    return score;
  }
}
```

### 3. API Contracts

#### REST Endpoints
```typescript
// Memory CRUD Operations
POST   /api/v1/memory/conversations
GET    /api/v1/memory/conversations/:sessionId
PUT    /api/v1/memory/conversations/:sessionId
DELETE /api/v1/memory/conversations/:sessionId

// Message Operations
POST   /api/v1/memory/conversations/:sessionId/messages
GET    /api/v1/memory/conversations/:sessionId/messages
DELETE /api/v1/memory/conversations/:sessionId/messages/:messageId

// Analytics & Search
GET    /api/v1/memory/search
GET    /api/v1/memory/analytics/usage
GET    /api/v1/memory/analytics/costs

// Maintenance
POST   /api/v1/memory/cleanup
POST   /api/v1/memory/archive
GET    /api/v1/memory/health
```

#### WebSocket Events
```typescript
// Real-time memory updates
ws.on('memory:updated', (data: ConversationMemory) => {});
ws.on('memory:deleted', (sessionId: string) => {});
ws.on('memory:optimized', (sessionId: string) => {});
ws.on('memory:quota-warning', (usage: QuotaUsage) => {});
```

### 4. Cleanup Strategies

#### Subscription-Based Limits
```typescript
const SUBSCRIPTION_LIMITS = {
  free: {
    maxConversations: 10,
    maxMessagesPerConversation: 100,
    maxTokensPerConversation: 4000,
    retentionDays: 7,
    summaryThreshold: 50
  },
  pro: {
    maxConversations: 100,
    maxMessagesPerConversation: 1000,
    maxTokensPerConversation: 32000,
    retentionDays: 30,
    summaryThreshold: 200
  },
  enterprise: {
    maxConversations: Infinity,
    maxMessagesPerConversation: 10000,
    maxTokensPerConversation: 128000,
    retentionDays: 365,
    summaryThreshold: 1000
  }
};
```

#### Cleanup Service
```typescript
class CleanupService {
  async runCleanup(): Promise<CleanupReport> {
    const report: CleanupReport = {
      conversationsDeleted: 0,
      messagesCompressed: 0,
      bytesFreed: 0,
      startTime: Date.now()
    };
    
    // 1. Delete expired conversations
    report.conversationsDeleted = await this.deleteExpiredConversations();
    
    // 2. Compress old messages
    report.messagesCompressed = await this.compressOldMessages();
    
    // 3. Archive to cold storage
    await this.archiveToColdStorage();
    
    // 4. Enforce quota limits
    await this.enforceQuotaLimits();
    
    report.endTime = Date.now();
    report.bytesFreed = await this.calculateFreedSpace();
    
    return report;
  }
  
  private async deleteExpiredConversations(): Promise<number> {
    // Implementation for time-based deletion
  }
  
  private async compressOldMessages(): Promise<number> {
    // Implementation for message compression
  }
  
  private async archiveToColdStorage(): Promise<void> {
    // Move old data to S3
  }
  
  private async enforceQuotaLimits(): Promise<void> {
    // Enforce subscription-based limits
  }
}
```

## Integration Requirements

### Dependencies on Other Services

1. **Subscription Service (Arya Sharma)**
   - Real-time quota checking
   - Tier upgrade/downgrade handling
   - Usage metering integration

2. **Chrome Extension (Jessica Park)**
   - Browser-based memory sync
   - Offline memory caching
   - Extension-specific quotas

3. **Data Processing (Maya Rodriguez)**
   - Bulk import/export capabilities
   - CSV memory dumps
   - Data transformation pipelines

## Performance Requirements

- Read latency: < 50ms for active conversations
- Write latency: < 100ms for message append
- Cleanup execution: < 5 minutes for 10,000 conversations
- Memory usage: < 100MB per 1000 active conversations
- Concurrent connections: Support 10,000 simultaneous WebSocket connections

## Security Considerations

1. **Data Encryption**
   - At-rest encryption for all storage layers
   - TLS 1.3 for data in transit
   - Field-level encryption for sensitive data

2. **Access Control**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - API rate limiting per tier

3. **Data Privacy**
   - GDPR-compliant data deletion
   - User data export capabilities
   - Audit logging for all operations

## Monitoring & Observability

### Key Metrics
- Memory usage per user/tier
- API response times
- Cleanup job performance
- Storage utilization
- Cache hit rates

### Alerts
- Memory quota exceeded (>90% usage)
- Cleanup job failures
- High API latency (>500ms)
- Storage capacity warnings (>80% full)

## Implementation Phases

### Phase 1: Core Memory Management (Week 1)
- Redis persistence layer
- Basic CRUD operations
- Simple cleanup strategies

### Phase 2: Advanced Features (Week 2)
- PostgreSQL integration
- Memory optimization
- WebSocket real-time updates

### Phase 3: Enterprise Features (Week 3)
- S3 archival
- Advanced analytics
- ML-based importance scoring

### Phase 4: Performance & Scale (Week 4)
- Performance optimization
- Load testing
- Production deployment

## Task Delegation

### Maya Rodriguez (Data Processing Expert)
- Implement CSV import/export for memory dumps
- Create data transformation pipelines
- Build bulk memory operations

### Arya Sharma (Subscription Expert)
- Integrate subscription tier checking
- Implement usage metering
- Create billing integration

### Jessica Park (Chrome Extension Expert)
- Build browser memory sync
- Implement offline caching
- Create extension-specific APIs

### Jordan Kim (Monorepo Specialist)
- Set up memory package structure
- Configure build pipelines
- Implement shared types

## Success Criteria

1. Successfully store and retrieve 10,000 concurrent conversations
2. Maintain sub-100ms response times under load
3. Achieve 99.9% uptime for memory services
4. Implement all subscription tier limits
5. Pass security audit requirements

## Conclusion

This architecture provides a robust, scalable, and efficient memory management system that meets all P0 requirements while providing a foundation for future enhancements. The modular design allows for parallel development by team specialists while maintaining architectural integrity.

---
*Document prepared by: Ryan Mitchell, Lead Developer Architect*
*Date: 2025-08-17*
*Issue: #7 (P0 Priority)*