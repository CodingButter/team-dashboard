# @team-dashboard/types

Centralized type definitions for the Team Dashboard monorepo.

## Installation

```bash
pnpm add @team-dashboard/types
```

## Usage

### CSV Types (for Maya - Data Processing Expert)

```typescript
import { 
  CSVImportRequest, 
  CSVImportResponse,
  CSVExportRequest,
  CSVExportResponse,
  AgentCSVRecord,
  CSVValidationRules
} from '@team-dashboard/types';

// Import agents from CSV
const importRequest: CSVImportRequest = {
  data: csvFile,
  type: 'agents',
  options: {
    validate: true,
    skipDuplicates: true,
    streaming: true,
    batchSize: 100
  }
};

// Export agents to CSV
const exportRequest: CSVExportRequest = {
  type: 'agents',
  options: {
    fields: ['name', 'model', 'status'],
    includeHeaders: true,
    delimiter: ','
  }
};

// Validate CSV data
const validationRules: CSVValidationRules = {
  required: ['name', 'model'],
  types: {
    name: 'string',
    model: 'enum',
    temperature: 'number'
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxRows: 1000
};
```

### Validation Types (for all team members)

```typescript
import { 
  ValidationBuilder, 
  ValidationSchema,
  validate,
  ValidationResult 
} from '@team-dashboard/types';

// Using ValidationBuilder
const validator = new ValidationBuilder()
  .required('Name is required')
  .string()
  .min(3, 'Name must be at least 3 characters')
  .max(50, 'Name must be at most 50 characters')
  .build();

const result = validator(value);

// Using Schema Validation
const schema: ValidationSchema = {
  fields: {
    name: {
      type: 'string',
      required: true,
      min: 3,
      max: 50
    },
    email: {
      type: 'email',
      required: true
    },
    age: {
      type: 'number',
      min: 0,
      max: 150
    }
  },
  strict: true
};

const validationResult = validate(data, schema);
if (validationResult.valid) {
  // Use validationResult.data
} else {
  // Handle validationResult.errors
}
```

### WebSocket Types

```typescript
import { 
  WebSocketMessage,
  ClientMessage,
  ServerMessage,
  createWebSocketMessage 
} from '@team-dashboard/types';

// Create typed messages
const message = createWebSocketMessage('agent:command', {
  agentId: 'agent-123',
  command: 'ls -la'
});
```

### API Types

```typescript
import { 
  AgentModel,
  AgentStatus,
  MCPServer,
  ApiClient 
} from '@team-dashboard/types';

// Use typed API contracts
const agent: AgentModel = 'claude-3-opus-20240229';
const status: AgentStatus = 'running';
```

## Type Categories

- **api/**: REST API contracts and endpoints
- **models/**: Domain models and business logic classes
- **websocket/**: Real-time communication types
- **mcp/**: MCP protocol and server types
- **prompts/**: Prompt management types
- **validation/**: Data validation utilities
- **communication/**: Inter-agent communication types

## Building

```bash
# Build the types package
pnpm build

# Watch mode for development
pnpm dev
```

## Type Safety Guidelines

1. Always import types from `@team-dashboard/types`
2. Use type guards for runtime validation
3. Leverage validation utilities for user input
4. Keep type definitions DRY - define once, use everywhere
5. Document complex types with JSDoc comments

## Team Notes

- **Maya**: CSV types are in `api/csv.ts` with full streaming support
- **Alex T**: Frontend types include React component props
- **Jessica**: Chrome extension types are exported from main index
- **Viktor**: Monorepo build types are centralized here
- **Marcus**: Refactoring utilities use validation types
- **Kenji**: Performance metrics types included
- **Arya**: Stripe/subscription types available
- **Thomas**: Code quality metrics types defined

## Support

Contact Ryan Mitchell (Lead Developer Architect) for type system questions.