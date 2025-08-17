/**
 * Token Estimator Utility
 * 
 * Accurate token estimation for different model providers.
 */

import { ChatMessage } from '../types';

export class TokenEstimator {
  /**
   * Estimate tokens for OpenAI models
   */
  static estimateOpenAI(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      // OpenAI: ~1 token per 4 characters for English text
      const baseTokens = Math.ceil(msg.content.length / 4);
      
      // Add overhead for message structure
      const overhead = 10; // tokens for role, structure, etc.
      
      return total + baseTokens + overhead;
    }, 0);
  }

  /**
   * Estimate tokens for Anthropic Claude models
   */
  static estimateAnthropic(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      // Claude: ~1 token per 3.5 characters for English text
      const baseTokens = Math.ceil(msg.content.length / 3.5);
      
      // Add overhead for message structure
      const overhead = 8; // tokens for role, structure, etc.
      
      return total + baseTokens + overhead;
    }, 0);
  }

  /**
   * Estimate tokens for Google models
   */
  static estimateGoogle(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      // Google: ~1 token per 4 characters (similar to OpenAI)
      const baseTokens = Math.ceil(msg.content.length / 4);
      
      // Add overhead for message structure
      const overhead = 12; // tokens for role, structure, etc.
      
      return total + baseTokens + overhead;
    }, 0);
  }

  /**
   * Generic token estimation
   */
  static estimate(messages: ChatMessage[], provider: string = 'openai'): number {
    switch (provider.toLowerCase()) {
      case 'anthropic':
      case 'claude':
        return this.estimateAnthropic(messages);
      
      case 'google':
      case 'gemini':
        return this.estimateGoogle(messages);
      
      case 'openai':
      default:
        return this.estimateOpenAI(messages);
    }
  }

  /**
   * Estimate output tokens based on input
   */
  static estimateOutputTokens(inputTokens: number, ratio: number = 0.5): number {
    return Math.ceil(inputTokens * ratio);
  }

  /**
   * Check if message fits within context window
   */
  static fitsInContext(
    messages: ChatMessage[],
    contextWindow: number,
    provider: string = 'openai'
  ): boolean {
    const tokens = this.estimate(messages, provider);
    return tokens <= contextWindow;
  }

  /**
   * Truncate messages to fit context window
   */
  static truncateToFit(
    messages: ChatMessage[],
    contextWindow: number,
    provider: string = 'openai'
  ): ChatMessage[] {
    if (messages.length === 0) return messages;

    // Always keep system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    let result = systemMessage ? [systemMessage] : [];
    let currentTokens = systemMessage ? this.estimate([systemMessage], provider) : 0;
    
    // Add messages from most recent backwards
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = this.estimate([message], provider);
      
      if (currentTokens + messageTokens <= contextWindow) {
        result.unshift(message);
        currentTokens += messageTokens;
      } else {
        break;
      }
    }
    
    // If system message exists, move it to the beginning
    if (systemMessage) {
      result = [systemMessage, ...result.filter(m => m.role !== 'system')];
    }
    
    return result;
  }
}