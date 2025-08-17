# URGENT MISSION: Conversation Memory Management - Issue #7

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #7 - Build conversation memory management system
**Priority**: P0 - CRITICAL
**Agent**: backend-specialist

## START CODING IMMEDIATELY!

### CREATE THIS FILE NOW:
**File**: `/services/agent-manager/src/memory/conversation-memory.ts`

```typescript
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  metadata?: any;
}

interface Conversation {
  id: string;
  agentId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  totalTokens: number;
  maxTokens: number;
}

export class ConversationMemory extends EventEmitter {
  private conversations = new Map<string, Conversation>();
  private storageDir: string;
  
  constructor(storageDir: string = './conversations') {
    super();
    this.storageDir = storageDir;
    this.initialize();
  }
  
  private async initialize() {
    await fs.mkdir(this.storageDir, { recursive: true });
    await this.loadConversations();
  }
  
  private async loadConversations() {
    const files = await fs.readdir(this.storageDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(this.storageDir, file), 'utf-8');
        const conversation = JSON.parse(data);
        this.conversations.set(conversation.id, conversation);
      }
    }
  }
  
  async createConversation(agentId: string, maxTokens: number = 100000): Promise<string> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: Conversation = {
      id,
      agentId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      totalTokens: 0,
      maxTokens
    };
    
    this.conversations.set(id, conversation);
    await this.saveConversation(id);
    this.emit('conversation:created', id);
    return id;
  }
  
  async addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
    
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
      tokens: this.estimateTokens(message.content)
    };
    
    conversation.messages.push(fullMessage);
    conversation.totalTokens += fullMessage.tokens || 0;
    conversation.updatedAt = new Date();
    
    // Trim if exceeds token limit
    while (conversation.totalTokens > conversation.maxTokens && conversation.messages.length > 1) {
      const removed = conversation.messages.shift();
      conversation.totalTokens -= removed?.tokens || 0;
    }
    
    await this.saveConversation(conversationId);
    this.emit('message:added', conversationId, fullMessage);
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
  
  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    return this.conversations.get(conversationId);
  }
  
  async getContext(conversationId: string, maxMessages: number = 20): Promise<Message[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];
    
    return conversation.messages.slice(-maxMessages);
  }
  
  async summarize(conversationId: string): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return '';
    
    // Simple summary - in production, use LLM
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    return `Conversation with ${userMessages.length} user messages, ${conversation.totalTokens} total tokens`;
  }
  
  private async saveConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    
    const filePath = path.join(this.storageDir, `${conversationId}.json`);
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
  }
  
  async deleteConversation(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
    const filePath = path.join(this.storageDir, `${conversationId}.json`);
    await fs.unlink(filePath).catch(() => {});
    this.emit('conversation:deleted', conversationId);
  }
}

// Export singleton
export const memoryManager = new ConversationMemory();
```

## START NOW! Implement the conversation memory system!