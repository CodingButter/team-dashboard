# Type Centralization Plan - Issue #79

## PRIORITY: P1 URGENT
**Assigned to: Jordan Kim (Monorepo Architecture Specialist)**
**Deadline: 3 PM TODAY**

## Current State Analysis

### Problems Identified:
1. `ConversationMemory` type defined in `services/openai-service/src/types/` instead of `packages/types`
2. Memory-related types not centralized for the new memory management system
3. No shared validation types across services
4. Missing memory quota and analytics types

### Existing Type Organization:
```
packages/types/src/
├── api/           ✅ Good structure
├── models/        ✅ Good structure  
├── websocket/     ✅ Good structure
├── mcp/           ✅ Good structure
├── prompts/       ✅ Good structure
└── [missing]/
    ├── memory/    ❌ Needs creation
    ├── validation/❌ Needs creation
    └── subscription/ ❌ Needs creation
```

## Implementation Plan

### Phase 1: Create Memory Types Package (IMMEDIATE)
**Location:** `packages/types/src/memory/`

#### 1. Create Core Memory Types
```typescript
// packages/types/src/memory/conversation.ts
export interface ConversationMemory {
  sessionId: string;
  agentId: string;
  userId: string;
  subscriptionTier: SubscriptionTier;
  messages: Message[];
  summary?: ConversationSummary;
  metadata: ConversationMetadata;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  tokens: number;
  embeddings?: number[];
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  text: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  generatedAt: number;
}

export interface ConversationMetadata {
  totalTokens: number;
  totalCost: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  priority: number;
  tags: string[];
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'function';
```

#### 2. Create Quota Types
```typescript
// packages/types/src/memory/quota.ts
export interface QuotaLimits {
  maxConversations: number;
  maxMessagesPerConversation: number;
  maxTokensPerConversation: number;
  retentionDays: number;
  summaryThreshold: number;
}

export interface QuotaUsage {
  conversations: {
    used: number;
    limit: number;
    percentage: number;
  };
  tokens: {
    used: number;
    limit: number;
    percentage: number;
  };
  storage: {
    usedBytes: number;
    limitBytes: number;
    percentage: number;
  };
}

export interface QuotaWarning {
  level: 'info' | 'warning' | 'critical';
  metric: 'conversations' | 'tokens' | 'storage';
  usage: number;
  limit: number;
  message: string;
}
```

#### 3. Create Analytics Types
```typescript
// packages/types/src/memory/analytics.ts
export interface MemoryAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  usage: UsageMetrics;
  trends: TrendMetrics;
  quotaUsage: QuotaUsage;
}

export interface UsageMetrics {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  storageUsedBytes: number;
}

export interface TrendMetrics {
  conversationsGrowth: number;
  tokensGrowth: number;
  costGrowth: number;
  storageGrowth: number;
}

export interface CleanupReport {
  jobId: string;
  conversationsDeleted: number;
  messagesCompressed: number;
  bytesFreed: number;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}
```

#### 4. Create Index File
```typescript
// packages/types/src/memory/index.ts
export * from './conversation';
export * from './quota';
export * from './analytics';
export * from './websocket-events';
```

### Phase 2: Create Subscription Types (1 PM)
**Location:** `packages/types/src/subscription/`

```typescript
// packages/types/src/subscription/index.ts
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  limits: QuotaLimits;
  features: string[];
  price: number;
  billingPeriod: 'monthly' | 'yearly';
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'expired';
  startDate: Date;
  endDate?: Date;
  usage: QuotaUsage;
}
```

### Phase 3: Update Existing Services (2 PM)

#### Services to Update:
1. **openai-service**
   - Remove local `ConversationMemory` type
   - Import from `@team-dashboard/types/memory`
   
2. **agent-manager**
   - Update to use centralized memory types
   - Add memory event types

3. **mcp-manager**
   - Use centralized types for memory integration

4. **dashboard app**
   - Import memory types for UI components

### Phase 4: Add to Main Index (2:30 PM)

```typescript
// packages/types/src/index.ts
// Add new exports
export * from './memory';
export * from './subscription';
export * from './validation';
```

## Migration Steps

### Step 1: Create New Type Files
```bash
# In your worktree
mkdir -p packages/types/src/memory
mkdir -p packages/types/src/subscription
mkdir -p packages/types/src/validation
```

### Step 2: Move Existing Types
1. Move `ConversationMemory` from `services/openai-service/src/types/`
2. Update all imports in openai-service
3. Verify no type errors

### Step 3: Update Service Imports
```typescript
// Before
import { ConversationMemory } from '../types';

// After
import { ConversationMemory } from '@team-dashboard/types/memory';
```

### Step 4: Run Type Checks
```bash
pnpm typecheck
```

## Testing Requirements

1. **Type Compatibility Tests**
   ```typescript
   // packages/types/tests/memory.test.ts
   import { ConversationMemory, Message } from '../src/memory';
   
   describe('Memory Types', () => {
     it('should be compatible with API responses', () => {
       // Test type compatibility
     });
   });
   ```

2. **Build Verification**
   - Ensure all services build successfully
   - No TypeScript errors
   - Proper module resolution

## Success Criteria

- [ ] All memory types centralized in `packages/types/src/memory/`
- [ ] Subscription types created in `packages/types/src/subscription/`
- [ ] OpenAI service updated to use central types
- [ ] All services building without type errors
- [ ] Type exports properly organized in index files
- [ ] Documentation updated with type usage examples

## Coordination Required

- **Maya Rodriguez**: Will use memory types for CSV operations
- **Arya Sharma**: Will use subscription types for quota management
- **Alex Thompson**: Will use memory types for UI components
- **Jessica Park**: Will use memory types for Chrome extension

## Timeline

- **12:30 PM**: Start type centralization
- **1:00 PM**: Memory types complete
- **1:30 PM**: Subscription types complete
- **2:00 PM**: Service updates complete
- **2:30 PM**: Testing and verification
- **3:00 PM**: Complete and report to Ryan

## Notes for Jordan

1. Start with memory types - they're most critical
2. Ensure backward compatibility where possible
3. Use strict TypeScript settings
4. Document any breaking changes
5. Coordinate with Maya if she needs types immediately

---
*Prepared by: Ryan Mitchell*
*Time: 11:35 AM*
*Issue: #79 - Centralized Type Definition Management*