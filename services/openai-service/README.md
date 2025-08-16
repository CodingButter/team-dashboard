# OpenAI Streaming Service

A high-performance OpenAI client implementation with streaming support and function calling capabilities for the Team Dashboard project.

## Features

- ✅ **Streaming Chat Completions**: Real-time token-by-token responses
- ✅ **Function Calling**: Built-in tools for file operations, bash execution, and git operations
- ✅ **Performance Optimization**: Token counting, cost tracking, and conversation memory management
- ✅ **Error Handling**: Exponential backoff retry logic with configurable parameters
- ✅ **Metrics Collection**: Prometheus-compatible metrics for monitoring
- ✅ **Redis Integration**: Conversation memory persistence and optimization
- ✅ **TypeScript Support**: Full type safety with comprehensive interfaces

## Installation

```bash
pnpm install
```

## Usage

### Basic Setup

```typescript
import { OpenAIService, createOpenAIConfig } from '@team-dashboard/openai-service';

const config = createOpenAIConfig({
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o',
  maxTokens: 4096,
  temperature: 0.1
});

const openaiService = new OpenAIService(config);
```

### Streaming Responses

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, how are you?' }
];

for await (const chunk of openaiService.streamCompletion(messages, 'session-123')) {
  switch (chunk.type) {
    case 'content':
      console.log('Content:', chunk.content);
      break;
    case 'tool_call':
      console.log('Tool called:', chunk.toolCall);
      break;
    case 'done':
      console.log('Cost:', chunk.metadata?.cost);
      break;
    case 'error':
      console.error('Error:', chunk.error);
      break;
  }
}
```

### Function Calling

```typescript
// Built-in tools are automatically registered
const toolCalls = await openaiService.completeWithTools(messages, 'session-123');

// Register custom tools
openaiService.registerTool({
  type: 'function',
  function: {
    name: 'custom_tool',
    description: 'A custom tool',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input parameter' }
      },
      required: ['input']
    }
  },
  handler: async (args) => {
    return { result: `Processed: ${args.input}` };
  }
});
```

### Conversation Memory Management

```typescript
import { ConversationManager } from '@team-dashboard/openai-service';

const memoryConfig = {
  redis: {
    host: 'localhost',
    port: 6379
  },
  ttl: 3600, // 1 hour
  maxMessages: 100,
  maxTokens: 4000
};

const conversationManager = new ConversationManager(memoryConfig);

// Add messages to conversation history
await conversationManager.addMessage('session-123', {
  role: 'user',
  content: 'Hello!'
}, 'gpt-4o');

// Get conversation history
const conversation = await conversationManager.getConversation('session-123');
```

## Built-in Tools

### File Operations
- `read_file`: Read file contents with encoding support
- `write_file`: Write content to files with directory creation

### System Operations
- `execute_bash`: Execute bash commands with timeout and error handling
- `git_operation`: Git version control operations (status, add, commit, etc.)

## Performance Features

### Token Optimization
- Automatic conversation pruning to fit context windows
- Token counting with tiktoken for accurate billing
- Cost calculation with real-time pricing

### Monitoring
- Prometheus metrics for request latency, token usage, and errors
- Performance tracking with detailed timing information
- Memory and CPU usage monitoring

### Error Handling
- Exponential backoff for retryable errors (rate limits, server errors)
- Configurable retry strategies
- Graceful degradation for network issues

## Configuration

### OpenAI Configuration
```typescript
interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
  maxTokens?: number;
  temperature?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeout?: number;
  retries?: number;
}
```

### Retry Configuration
```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}
```

## Performance Targets

- **First Token Latency**: < 1 second
- **Streaming Latency**: < 100ms per chunk  
- **Tokens per Second**: 50+ throughput
- **Memory Usage**: < 512MB per agent
- **Error Rate**: < 1%

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Build the service
pnpm build
```

## Cost Optimization

### Token Pricing (per 1K tokens)
- **GPT-4o**: $0.015 input, $0.06 output
- **GPT-4o-mini**: $0.00015 input, $0.0006 output
- **GPT-3.5-turbo**: $0.0015 input, $0.002 output

### Optimization Strategies
- Conversation context pruning
- System message preservation
- Recent message prioritization
- Token-aware response limits

## Architecture

```
OpenAIService
├── Streaming Chat Completions
├── Function Tool Management
├── Token Optimization
├── Cost Tracking
├── Performance Monitoring
└── Error Handling

ConversationManager
├── Redis Storage
├── Message Optimization
├── TTL Management
└── Memory Cleanup
```

## Contributing

1. Follow TypeScript best practices
2. Maintain test coverage above 80%
3. Use conventional commit messages
4. Update documentation for new features
5. Monitor performance impact

## License

Private - Team Dashboard Project