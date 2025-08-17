# Memory Management API Specification

## API Version: 1.0.0

### Base URL
```
Production: https://api.team-dashboard.com/v1/memory
Staging: https://staging-api.team-dashboard.com/v1/memory
Development: http://localhost:3001/api/v1/memory
```

## Authentication
All requests require JWT authentication token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## REST API Endpoints

### Conversation Management

#### Create Conversation
```http
POST /conversations
```

**Request Body:**
```json
{
  "agentId": "agent-123",
  "metadata": {
    "tags": ["support", "technical"],
    "priority": 1
  }
}
```

**Response (201 Created):**
```json
{
  "sessionId": "conv-abc123",
  "agentId": "agent-123",
  "userId": "user-456",
  "subscriptionTier": "pro",
  "createdAt": 1755393226000,
  "metadata": {
    "tags": ["support", "technical"],
    "priority": 1
  }
}
```

#### Get Conversation
```http
GET /conversations/:sessionId
```

**Query Parameters:**
- `includeMessages` (boolean): Include full message history
- `includeSummary` (boolean): Include conversation summary
- `limit` (number): Limit number of messages returned

**Response (200 OK):**
```json
{
  "sessionId": "conv-abc123",
  "agentId": "agent-123",
  "userId": "user-456",
  "subscriptionTier": "pro",
  "messages": [...],
  "summary": {...},
  "metadata": {
    "totalTokens": 2500,
    "totalCost": 0.05,
    "createdAt": 1755393226000,
    "updatedAt": 1755393326000
  }
}
```

#### Update Conversation
```http
PUT /conversations/:sessionId
```

**Request Body:**
```json
{
  "metadata": {
    "tags": ["resolved"],
    "priority": 0
  }
}
```

**Response (200 OK):**
```json
{
  "sessionId": "conv-abc123",
  "updated": true,
  "updatedAt": 1755393426000
}
```

#### Delete Conversation
```http
DELETE /conversations/:sessionId
```

**Response (204 No Content)**

### Message Management

#### Add Message
```http
POST /conversations/:sessionId/messages
```

**Request Body:**
```json
{
  "role": "user",
  "content": "How do I reset my password?",
  "metadata": {
    "source": "web-chat"
  }
}
```

**Response (201 Created):**
```json
{
  "messageId": "msg-xyz789",
  "sessionId": "conv-abc123",
  "role": "user",
  "content": "How do I reset my password?",
  "tokens": 8,
  "timestamp": 1755393526000
}
```

#### Add Multiple Messages
```http
POST /conversations/:sessionId/messages/batch
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "First message"
    },
    {
      "role": "assistant",
      "content": "Response message"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "sessionId": "conv-abc123",
  "messagesAdded": 2,
  "totalTokens": 125,
  "optimized": false
}
```

#### Get Messages
```http
GET /conversations/:sessionId/messages
```

**Query Parameters:**
- `limit` (number): Maximum messages to return (default: 100)
- `offset` (number): Skip first N messages
- `since` (timestamp): Messages after this timestamp
- `until` (timestamp): Messages before this timestamp

**Response (200 OK):**
```json
{
  "sessionId": "conv-abc123",
  "messages": [
    {
      "id": "msg-001",
      "role": "system",
      "content": "You are a helpful assistant",
      "tokens": 6,
      "timestamp": 1755393226000
    },
    {
      "id": "msg-002",
      "role": "user",
      "content": "Hello",
      "tokens": 1,
      "timestamp": 1755393326000
    }
  ],
  "total": 45,
  "hasMore": true
}
```

### Analytics & Search

#### Search Conversations
```http
GET /search
```

**Query Parameters:**
- `q` (string): Search query
- `agentId` (string): Filter by agent
- `userId` (string): Filter by user
- `tags` (string[]): Filter by tags
- `from` (timestamp): Start date
- `to` (timestamp): End date
- `limit` (number): Results per page
- `offset` (number): Pagination offset

**Response (200 OK):**
```json
{
  "results": [
    {
      "sessionId": "conv-abc123",
      "agentId": "agent-123",
      "snippet": "...password reset...",
      "relevanceScore": 0.95,
      "updatedAt": 1755393326000
    }
  ],
  "total": 15,
  "facets": {
    "agents": {...},
    "tags": {...}
  }
}
```

#### Get Usage Analytics
```http
GET /analytics/usage
```

**Query Parameters:**
- `period` (string): "hour", "day", "week", "month"
- `from` (timestamp): Start date
- `to` (timestamp): End date

**Response (200 OK):**
```json
{
  "period": "day",
  "usage": {
    "totalConversations": 150,
    "activeConversations": 25,
    "totalMessages": 3500,
    "totalTokens": 125000,
    "totalCost": 2.50,
    "storageUsedBytes": 5242880
  },
  "trends": {
    "conversationsGrowth": 0.15,
    "tokensGrowth": 0.22,
    "costGrowth": 0.18
  },
  "quotaUsage": {
    "conversations": {
      "used": 25,
      "limit": 100,
      "percentage": 25
    },
    "tokens": {
      "used": 125000,
      "limit": 1000000,
      "percentage": 12.5
    }
  }
}
```

### Maintenance Operations

#### Trigger Cleanup
```http
POST /cleanup
```

**Request Body:**
```json
{
  "strategy": "aggressive",
  "olderThanHours": 24,
  "dryRun": false
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "cleanup-job-123",
  "status": "running",
  "estimatedCompletion": 1755393826000
}
```

#### Archive Conversations
```http
POST /archive
```

**Request Body:**
```json
{
  "olderThanDays": 30,
  "destination": "s3",
  "compress": true
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "archive-job-456",
  "conversationsToArchive": 450,
  "estimatedSizeBytes": 104857600
}
```

#### Health Check
```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "services": {
    "redis": {
      "status": "connected",
      "latency": 2
    },
    "postgresql": {
      "status": "connected",
      "latency": 5
    },
    "s3": {
      "status": "connected",
      "latency": 15
    }
  },
  "metrics": {
    "activeConnections": 125,
    "requestsPerSecond": 50,
    "averageLatency": 45
  }
}
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://api.team-dashboard.com/v1/memory/ws');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'jwt-token'
  }));
});
```

### Events

#### Subscribe to Conversation Updates
```javascript
// Subscribe
ws.send(JSON.stringify({
  type: 'subscribe',
  sessionId: 'conv-abc123'
}));

// Receive updates
ws.on('message', (data) => {
  const event = JSON.parse(data);
  switch(event.type) {
    case 'memory:updated':
      console.log('Conversation updated:', event.data);
      break;
    case 'memory:message':
      console.log('New message:', event.data);
      break;
    case 'memory:optimized':
      console.log('Memory optimized:', event.data);
      break;
  }
});
```

#### Quota Warnings
```javascript
ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.type === 'memory:quota-warning') {
    console.warn('Quota warning:', event.data);
    // {
    //   "level": "warning",
    //   "usage": 85,
    //   "limit": 100,
    //   "metric": "conversations"
    // }
  }
});
```

## Error Responses

### Error Format
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Conversation limit exceeded for your subscription tier",
    "details": {
      "limit": 10,
      "used": 10,
      "tier": "free"
    }
  }
}
```

### Common Error Codes
- `400` - Bad Request
  - `INVALID_PARAMETERS`: Missing or invalid parameters
  - `INVALID_MESSAGE_ROLE`: Invalid message role
- `401` - Unauthorized
  - `INVALID_TOKEN`: JWT token invalid or expired
  - `NO_TOKEN`: Missing authentication token
- `403` - Forbidden
  - `QUOTA_EXCEEDED`: Subscription limit reached
  - `PERMISSION_DENIED`: No access to resource
- `404` - Not Found
  - `CONVERSATION_NOT_FOUND`: Session ID doesn't exist
  - `MESSAGE_NOT_FOUND`: Message ID doesn't exist
- `429` - Too Many Requests
  - `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `500` - Internal Server Error
  - `STORAGE_ERROR`: Database connection failed
  - `PROCESSING_ERROR`: Memory optimization failed

## Rate Limits

| Tier | Requests/Minute | Requests/Hour | Concurrent Connections |
|------|----------------|---------------|----------------------|
| Free | 60 | 1,000 | 5 |
| Pro | 300 | 10,000 | 25 |
| Enterprise | 1,000 | 100,000 | 100 |

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1755393826
```

## Pagination

Standard pagination parameters:
- `limit`: Number of items per page (max: 100)
- `offset`: Number of items to skip
- `cursor`: Cursor-based pagination token

Response headers:
```
X-Total-Count: 500
X-Page-Count: 10
Link: <...?offset=100>; rel="next", <...?offset=0>; rel="first"
```

---
*API Specification Version: 1.0.0*
*Last Updated: 2025-08-17*
*Author: Ryan Mitchell, Lead Developer Architect*