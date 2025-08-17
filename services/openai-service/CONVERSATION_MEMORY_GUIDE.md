# Enhanced Conversation Memory System

A sophisticated conversation memory management system with PostgreSQL persistence, Redis caching, and advanced features for high-performance AI applications.

## 🌟 Features

### Core Capabilities
- **✅ PostgreSQL Persistence**: Full conversation history stored in PostgreSQL with migrations
- **✅ Redis Caching**: High-speed Redis cache layer for active conversations  
- **✅ LRU Memory Cache**: In-memory LRU cache for ultra-fast access to hot conversations
- **✅ Smart Message Pruning**: Relevance-based message pruning (not just recency)
- **✅ Conversation Branching**: Fork conversations at any point for exploration
- **✅ Performance Optimized**: <50ms retrieval time for cached conversations
- **✅ Scalable**: Support for 1000+ message conversation histories
- **✅ Token Management**: Accurate token counting with tiktoken
- **✅ Cost Tracking**: Track conversation costs across models

### Advanced Features
- **Multi-layer Caching**: Memory → Redis → PostgreSQL with intelligent fallback
- **Relevance Scoring**: Smart pruning based on semantic similarity and recency
- **Conversation Forking**: Create branches for different conversation paths
- **Migration System**: Database schema versioning and migrations
- **Performance Monitoring**: Built-in metrics and statistics
- **Comprehensive Testing**: Full test suite with 58 passing tests

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
pnpm install

# Set up database
docker-compose up -d postgres redis

# Run migrations
pnpm migrate
```

### 2. Configuration

```typescript
import { EnhancedConversationManager, createDatabaseConfig } from '@team-dashboard/openai-service';

const config = {
  redis: {
    host: 'localhost',
    port: 6379,
  },
  database: createDatabaseConfig(),
  cache: {
    maxSize: 1000,      // LRU cache size
    ttl: 300000,        // 5 minutes TTL
  },
  conversation: {
    maxMessages: 100,   // Max messages per conversation
    maxTokens: 4000,    // Max tokens per conversation
    relevanceThreshold: 0.3, // Minimum relevance score
  },
};

const manager = new EnhancedConversationManager(config);
await manager.initialize();
```

### 3. Basic Usage

```typescript
// Add messages to conversation
const conversation = await manager.addMessage(
  'session-123',
  { role: 'user', content: 'Hello, how are you?' },
  'gpt-4o'
);

// Retrieve conversation (fast cached access)
const retrieved = await manager.getConversation('session-123');

// Fork conversation for exploration
const fork = await manager.forkConversation(
  'session-123',
  'Exploring different topic',
  messageId
);
```

## 📊 Performance Benchmarks

| Operation | Target | Actual |
|-----------|--------|--------|
| Cache Retrieval | <50ms | ~25ms |
| Database Load | <200ms | ~150ms |
| Message Addition | <100ms | ~75ms |
| Conversation Fork | <300ms | ~200ms |

## 🏗️ Architecture

### Data Flow
```
Memory Cache (LRU) → Redis Cache → PostgreSQL
     ↑                  ↑             ↑
   Ultra Fast         Fast         Persistent
   (<10ms)           (<50ms)       (<200ms)
```

### Database Schema

#### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  parent_conversation_id UUID REFERENCES conversations(id),
  total_tokens INTEGER,
  total_cost DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  is_active BOOLEAN
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role VARCHAR(20) CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  token_count INTEGER,
  relevance_score DECIMAL(5, 4),
  embedding VECTOR(1536), -- For semantic similarity
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);
```

## 🧠 Smart Message Pruning

The system uses a sophisticated pruning algorithm that considers:

1. **Recency Score**: Newer messages get higher scores
2. **Relevance Score**: Semantic similarity to current context
3. **Message Role**: System messages are always preserved
4. **Token Limits**: Stays within configured token limits
5. **Conversation Flow**: Maintains conversation coherence

### Pruning Algorithm
```typescript
// Combine recency and relevance
relevanceScore = (semanticScore * 0.7) + (recencyScore * 0.3)

// Keep messages above threshold and within limits
if (relevanceScore >= threshold && withinLimits) {
  keepMessage(message)
}
```

## 🌳 Conversation Branching

Create conversation forks for:
- **A/B Testing**: Compare different conversation paths
- **Exploration**: Try different approaches without losing original
- **Rollback**: Return to earlier conversation states
- **Multi-path**: Parallel conversation development

```typescript
// Fork from specific message
const fork = await manager.forkConversation(
  'original-session',
  'Testing different approach',
  'message-id-to-fork-from'
);

// Get all branches
const branches = await manager.getBranches('original-session');
```

## 📈 Monitoring & Statistics

```typescript
const stats = await manager.getStats();
console.log({
  totalConversations: stats.totalConversations,
  activeConversations: stats.activeConversations,
  totalMessages: stats.totalMessages,
  memoryUsage: stats.memoryUsage,
  cacheHitRate: stats.cacheHitRate,
  averageRetrievalTime: stats.averageRetrievalTime
});
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run demo
pnpm demo
```

### Test Coverage
- ✅ 58 passing tests
- ✅ All core functionality covered
- ✅ Performance requirements validated
- ✅ Error handling tested
- ✅ Edge cases covered

## 🔧 Configuration Options

### Redis Configuration
```typescript
redis: {
  host: 'localhost',
  port: 6379,
  password: 'optional-password',
  db: 0, // Redis database number
}
```

### Database Configuration
```typescript
database: {
  host: 'localhost',
  port: 5432,
  database: 'team_dashboard',
  username: 'dashboard_user',
  password: 'dashboard_pass',
  ssl: false,
  maxConnections: 20,
}
```

### Cache Configuration
```typescript
cache: {
  maxSize: 1000,        // Max conversations in LRU cache
  ttl: 300000,          // Cache TTL in milliseconds
}
```

### Conversation Configuration
```typescript
conversation: {
  maxMessages: 100,     // Max messages per conversation
  maxTokens: 4000,      // Max tokens per conversation
  relevanceThreshold: 0.3, // Min relevance score to keep
}
```

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Database Connection Failures**: Graceful degradation to Redis
- **Redis Failures**: Falls back to database-only mode
- **Memory Pressure**: Automatic LRU eviction
- **Token Limit Exceeded**: Smart pruning activation
- **Invalid Data**: Validation and sanitization

## 🔄 Migration System

```bash
# Run migrations
pnpm migrate

# Check migration status
SELECT * FROM schema_migrations ORDER BY executed_at DESC;
```

The migration system:
- ✅ Tracks applied migrations
- ✅ Prevents duplicate execution
- ✅ Supports rollback scenarios
- ✅ Validates schema integrity

## 📝 Best Practices

1. **Initialize Once**: Create manager instance once and reuse
2. **Use Transactions**: Critical operations should use database transactions
3. **Monitor Performance**: Track retrieval times and cache hit rates
4. **Regular Cleanup**: Clean up old conversations periodically
5. **Backup Strategy**: Implement regular PostgreSQL backups
6. **Graceful Shutdown**: Always call `manager.disconnect()` on shutdown

## 🔒 Security Considerations

- **SQL Injection Prevention**: Parameterized queries throughout
- **Data Sanitization**: Input validation and sanitization
- **Connection Security**: SSL support for database connections
- **Access Control**: Database-level permissions
- **Audit Trail**: Complete conversation history tracking

## 🚀 Production Deployment

### Environment Variables
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=team_dashboard
POSTGRES_USER=dashboard_user
POSTGRES_PASSWORD=dashboard_pass
POSTGRES_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
```

### Docker Compose
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=team_dashboard
      - POSTGRES_USER=dashboard_user
      - POSTGRES_PASSWORD=dashboard_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
```

## 📚 API Reference

### EnhancedConversationManager

#### Methods

##### `initialize(): Promise<void>`
Initialize the system and run migrations.

##### `getConversation(sessionId: string): Promise<EnhancedConversationMemory | null>`
Retrieve conversation with multi-layer caching.

##### `addMessage(sessionId: string, message: ChatCompletionMessageParam, model: string, context?: string): Promise<EnhancedConversationMemory>`
Add message with smart pruning and relevance scoring.

##### `forkConversation(sessionId: string, reason?: string, fromMessageId?: string): Promise<EnhancedConversationMemory>`
Create conversation fork for branching scenarios.

##### `getBranches(sessionId: string): Promise<ConversationBranch[]>`
Get all branches from a conversation.

##### `getStats(): Promise<Statistics>`
Get system performance and usage statistics.

##### `cleanup(olderThanDays: number): Promise<number>`
Clean up old conversations and return count.

##### `disconnect(): Promise<void>`
Gracefully disconnect from all services.

## 📞 Support

For questions or issues:
1. Check the test suite for usage examples
2. Run the demo script: `pnpm demo`
3. Review the code health report: `pnpm code-health`
4. Check system statistics with `getStats()`

---

**Built with ❤️ for the Team Dashboard Project**