import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIService } from '../openai-service';
import { createOpenAIConfig } from '../config';
import type { OpenAIConfig, StreamChunk } from '../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn()
        }
      };
    }
  };
});

// Mock exponential-backoff
vi.mock('exponential-backoff', () => ({
  backOff: vi.fn((fn) => fn())
}));

describe('OpenAIService', () => {
  let service: OpenAIService;
  let config: OpenAIConfig;

  beforeEach(() => {
    config = createOpenAIConfig({
      apiKey: 'test-key',
      model: 'gpt-4o',
      maxTokens: 1000,
      temperature: 0.1
    });
    service = new OpenAIService(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(service.getConfig()).toEqual(config);
    });

    it('should register default tools', () => {
      expect(service['tools'].size).toBeGreaterThan(0);
      expect(service['tools'].has('read_file')).toBe(true);
      expect(service['tools'].has('write_file')).toBe(true);
      expect(service['tools'].has('execute_bash')).toBe(true);
      expect(service['tools'].has('git_operation')).toBe(true);
    });
  });

  describe('streamCompletion', () => {
    it('should stream content chunks', async () => {
      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: { content: ' world' } }] },
        { choices: [{ delta: {} }] }
      ]);

      vi.mocked(service['client'].chat.completions.create).mockResolvedValue(mockStream as any);

      const messages = [{ role: 'user', content: 'Hello' }] as ChatCompletionMessageParam[];
      const chunks: StreamChunk[] = [];

      for await (const chunk of service.streamCompletion(messages, 'test-session')) {
        chunks.push(chunk);
      }

      const contentChunks = chunks.filter(c => c.type === 'content');
      expect(contentChunks).toHaveLength(2);
      expect(contentChunks[0].content).toBe('Hello');
      expect(contentChunks[1].content).toBe(' world');
    });

    it('should handle tool calls', async () => {
      const mockStream = createMockStream([
        {
          choices: [{
            delta: {
              tool_calls: [{
                id: 'tool_1',
                function: {
                  name: 'read_file',
                  arguments: '{"path": "test.txt"}'
                }
              }]
            }
          }]
        }
      ]);

      vi.mocked(service['client'].chat.completions.create).mockResolvedValue(mockStream as any);

      const messages = [{ role: 'user', content: 'Read file' }] as ChatCompletionMessageParam[];
      const chunks: StreamChunk[] = [];

      for await (const chunk of service.streamCompletion(messages, 'test-session')) {
        chunks.push(chunk);
      }

      const toolChunks = chunks.filter(c => c.type === 'tool_call');
      expect(toolChunks).toHaveLength(1);
      expect(toolChunks[0].toolCall?.name).toBe('read_file');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('API Error');
      vi.mocked(service['client'].chat.completions.create).mockRejectedValue(error);

      const messages = [{ role: 'user', content: 'Hello' }] as ChatCompletionMessageParam[];
      const chunks: StreamChunk[] = [];

      for await (const chunk of service.streamCompletion(messages, 'test-session')) {
        chunks.push(chunk);
      }

      const errorChunks = chunks.filter(c => c.type === 'error');
      expect(errorChunks).toHaveLength(1);
      expect(errorChunks[0].error).toBe('API Error');
    });
  });

  describe('completeWithTools', () => {
    it('should return tool calls from completion', async () => {
      const mockStream = createMockStream([
        {
          choices: [{
            delta: {
              tool_calls: [{
                id: 'tool_1',
                function: {
                  name: 'read_file',
                  arguments: '{"path": "test.txt"}'
                }
              }]
            }
          }]
        }
      ]);

      vi.mocked(service['client'].chat.completions.create).mockResolvedValue(mockStream as any);

      const messages = [{ role: 'user', content: 'Read file' }] as ChatCompletionMessageParam[];
      const toolCalls = await service.completeWithTools(messages, 'test-session');

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe('read_file');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const updates = { temperature: 0.5, maxTokens: 2000 };
      service.updateConfig(updates);

      const updatedConfig = service.getConfig();
      expect(updatedConfig.temperature).toBe(0.5);
      expect(updatedConfig.maxTokens).toBe(2000);
    });

    it('should recreate client when API key changes', () => {
      const originalClient = service['client'];
      service.updateConfig({ apiKey: 'new-key' });
      
      expect(service['client']).not.toBe(originalClient);
    });
  });

  describe('tool management', () => {
    it('should register custom tools', () => {
      const customTool = {
        type: 'function' as const,
        function: {
          name: 'custom_tool',
          description: 'A custom tool',
          parameters: {
            type: 'object' as const,
            properties: {},
            required: []
          }
        },
        handler: vi.fn().mockResolvedValue({ success: true })
      };

      service.registerTool(customTool);
      expect(service['tools'].has('custom_tool')).toBe(true);
    });
  });

  describe('stream management', () => {
    it('should track active streams', () => {
      expect(service.getActiveStreamCount()).toBe(0);
    });

    it('should cancel streams by session', () => {
      service['activeStreams'].add('test-session-123');
      service['activeStreams'].add('other-session-456');
      
      service.cancelStream('test-session');
      
      expect(service['activeStreams'].has('test-session-123')).toBe(false);
      expect(service['activeStreams'].has('other-session-456')).toBe(true);
    });
  });
});

// Helper function to create mock stream
function createMockStream(chunks: any[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    }
  };
}