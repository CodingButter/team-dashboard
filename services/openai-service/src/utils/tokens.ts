import { encoding_for_model, Tiktoken } from 'tiktoken';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';
import { TOKEN_PRICING } from '../config';
import type { OpenAIConfig } from '../types';

let encoder: Tiktoken | null = null;

export function getTokenEncoder(model: OpenAIConfig['model']): Tiktoken {
  if (!encoder) {
    try {
      encoder = encoding_for_model(model as any);
    } catch {
      // Fallback to gpt-4 encoding for unknown models
      encoder = encoding_for_model('gpt-4');
    }
  }
  return encoder;
}

export function countTokens(text: string, model: OpenAIConfig['model']): number {
  const tokenizer = getTokenEncoder(model);
  return tokenizer.encode(text).length;
}

export function countMessageTokens(
  messages: ChatCompletionMessageParam[], 
  model: OpenAIConfig['model']
): number {
  const tokenizer = getTokenEncoder(model);
  let totalTokens = 0;

  for (const message of messages) {
    // Count role tokens (approximately 4 tokens per message for role formatting)
    totalTokens += 4;
    
    if (typeof message.content === 'string') {
      totalTokens += tokenizer.encode(message.content).length;
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === 'text') {
          totalTokens += tokenizer.encode(content.text).length;
        }
      }
    }

    if ('name' in message && message.name) {
      totalTokens += tokenizer.encode(message.name).length;
    }
  }

  // Add tokens for conversation priming
  totalTokens += 2;
  
  return totalTokens;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: OpenAIConfig['model']
): number {
  const pricing = TOKEN_PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model pricing for: ${model}`);
  }

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return Number((inputCost + outputCost).toFixed(6));
}

export function optimizeMessages(
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
  model: OpenAIConfig['model']
): ChatCompletionMessageParam[] {
  if (messages.length <= 2) return messages;

  const totalTokens = countMessageTokens(messages, model);
  if (totalTokens <= maxTokens) return messages;

  // Keep system message and last few user/assistant pairs
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  // Start with system messages
  let optimizedMessages: ChatCompletionMessageParam[] = [...systemMessages];
  let currentTokens = countMessageTokens(optimizedMessages, model);

  // Add conversation messages from most recent
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const message = conversationMessages[i];
    const messageTokens = countMessageTokens([message], model);
    
    if (currentTokens + messageTokens > maxTokens * 0.8) { // Use 80% of max tokens
      break;
    }
    
    optimizedMessages.push(message);
    currentTokens += messageTokens;
  }

  // Reverse to maintain chronological order (except system messages)
  const systemCount = systemMessages.length;
  const conversationPart = optimizedMessages.slice(systemCount).reverse();
  
  return [...systemMessages, ...conversationPart];
}

export function cleanup(): void {
  if (encoder) {
    encoder.free();
    encoder = null;
  }
}