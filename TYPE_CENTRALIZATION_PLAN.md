# Type Centralization Plan - Issue #79

## Current Analysis

### Problems Identified
1. **Multiple Agent Interfaces**: 4+ different Agent interfaces across:
   - `/apps/dashboard/src/app/page.tsx`
   - `/apps/dashboard/src/app/agents/mock-data.ts`
   - `/apps/dashboard/src/components/agents/agent-card.tsx`
   - `/packages/types/src/api/agents.ts` (canonical)

2. **Scattered Service Types**:
   - `/services/agent-manager/src/workflow/types.ts` (Workflow, Task, WorkflowState)
   - `/services/openai-service/src/types/index.ts` (OpenAI-specific types)
   - Test fixtures with mock types that don't match production

3. **Backup File Pollution**:
   - `.backup` files with outdated definitions
   - Duplicate exports in multiple index files

## Proposed Architecture

### Phase 1: Consolidate Core Types
```
packages/types/src/
├── index.ts                    # Main entry point with strict exports
├── core/                       # Core domain types
│   ├── agent.ts               # Unified Agent interface
│   ├── workflow.ts             # Workflow and Task types
│   └── system.ts               # System-wide types
├── api/                        # API contracts by domain
│   ├── index.ts               # API type aggregator
│   ├── agents.ts              # Agent management APIs
│   ├── mcp.ts                 # MCP server APIs
│   └── common.ts              # Shared API types
├── models/                     # Domain models
├── websocket/                  # WebSocket message types
└── testing/                    # Test-specific types
    ├── index.ts
    ├── mocks.ts               # Type-safe mocks
    └── fixtures.ts            # Test fixtures
```

### Phase 2: Service-Specific Type Modules
```
packages/types/src/services/
├── agent-manager.ts           # Agent manager specific types
├── openai-service.ts          # OpenAI service types
└── mcp-manager.ts             # MCP manager types
```

### Phase 3: Strict Export Strategy
- Single source of truth through index.ts
- Service-specific exports through namespaced modules
- Type compatibility validation
- Automated migration tools

## Implementation Steps

1. **Create Unified Core Types** ✅ In Progress
2. **Migrate Service Types** 🔄 Next
3. **Update Import Statements** 🔄 Next
4. **Add Type Validation** 🔄 Next
5. **Clean Backup Files** 🔄 Next
6. **CI/CD Integration** 🔄 Next

## Benefits
- Single source of truth for all types
- Automatic type synchronization across services
- Reduced build errors
- Better IDE support and autocomplete
- Type-safe refactoring capabilities