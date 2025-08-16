# Memento MCP Integration

## Overview
Successfully integrated Memento MCP (Model Context Protocol) for agent memory management in the Team Dashboard project. This enables agents to maintain persistent knowledge graphs for storing and retrieving context.

## Implementation Details

### 1. Package Installation
- Installed `@gannonh/memento-mcp` v0.3.9 - Knowledge graph memory system for LLMs
- Installed `@modelcontextprotocol/sdk` v1.17.3 - MCP SDK for TypeScript

### 2. Key Components Created

#### Memento Server Configuration (`services/mcp-manager/src/servers/memento.ts`)
- Creates agent-specific Memento MCP server configurations
- Configures database paths, entity limits, and semantic search
- Provides cleanup functions for agent termination

#### Redis Persistence Adapter (`services/mcp-manager/src/servers/memento-redis.ts`)
- Optional Redis-based storage for scalable memory persistence
- Supports entity and relation CRUD operations
- Provides backup/restore functionality
- Enables cross-agent memory sharing (if needed)

#### OpenAI Agent Manager Updates (`services/agent-manager/src/agents/openai-agent-manager.ts`)
- Added `enableMemento` flag (enabled by default)
- Integrated MCP client initialization during agent spawn
- Added Memento tools to OpenAI function calling
- Proper cleanup on agent termination

### 3. Memory Capabilities

Each agent now has access to:
- **memento_create_entities** - Create entities in knowledge graph
- **memento_create_relations** - Create relationships between entities
- **memento_search_nodes** - Search for nodes by query
- **memento_semantic_search** - Semantic similarity search
- **memento_read_graph** - Read entire knowledge graph

### 4. Configuration Options

Agents can be configured with:
```typescript
{
  enableMemento: true,  // Enable/disable memory (default: true)
  mementoConfig: {
    dbPath: string,      // Custom database path
    maxEntities: 10000,  // Maximum entities limit
    maxRelations: 50000, // Maximum relations limit
    useRedis: false      // Use Redis persistence
  }
}
```

### 5. WebSocket Integration

Updated WebSocket message types to support:
- `enableMemento` flag in CreateAgentMessage
- `mementoConfig` object for custom configuration
- Automatic memory initialization on agent creation

## Testing

Created comprehensive tests in:
- `services/agent-manager/tests/memento-integration.test.ts` - Integration tests
- `services/agent-manager/test-memento.js` - Manual testing script

## Usage Example

```javascript
// Agent creation with Memento enabled
const agent = await agentManager.spawnAgent({
  id: 'agent-123',
  name: 'My Agent',
  model: 'gpt-4o-mini',
  workspace: '/workspace',
  openaiApiKey: process.env.OPENAI_API_KEY,
  enableMemento: true,  // Memory enabled
  mementoConfig: {
    maxEntities: 1000,
    useRedis: true  // Use Redis for persistence
  }
});

// Agent can now use memory operations
await agentManager.sendMessage('agent-123', [
  { 
    role: 'user', 
    content: 'Remember that Project X uses React and TypeScript' 
  }
]);
```

## Architecture Benefits

1. **Isolated Memory Spaces** - Each agent has its own memory namespace
2. **Persistent Knowledge** - Memory survives agent restarts
3. **Semantic Search** - Agents can find related information intelligently
4. **Scalable Storage** - Optional Redis backend for production deployments
5. **Knowledge Graphs** - Structured memory with entities and relationships

## Future Enhancements

- Memory visualization UI in dashboard
- Cross-agent memory sharing capabilities
- Memory export/import functionality
- Memory analytics and insights
- Automated memory cleanup policies

## Files Modified

- `/services/agent-manager/src/agents/openai-agent-manager.ts`
- `/services/mcp-manager/src/servers/memento.ts` (new)
- `/services/mcp-manager/src/servers/memento-redis.ts` (new)
- `/services/agent-manager/src/websocket/agent-manager.ts`
- `/packages/types/src/websocket/client-messages.ts`
- `/package.json` (added dependencies)

## Verification

To verify the integration:
1. Start Redis: `docker-compose up -d redis`
2. Run tests: `cd services/agent-manager && pnpm test memento-integration`
3. Manual test: `node test-memento.js`

The Memento MCP integration is now fully functional and ready for use!