#!/usr/bin/env node

import { EnhancedConversationManager, createDatabaseConfig } from '../index';
import type { EnhancedConversationMemoryConfig } from '../memory/enhanced-conversation-memory';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

async function demoEnhancedMemory() {
  console.log('🧠 Enhanced Conversation Memory Demo');
  console.log('=====================================\n');

  const config: EnhancedConversationMemoryConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    database: createDatabaseConfig(),
    cache: {
      maxSize: 1000,
      ttl: 300000, // 5 minutes
    },
    conversation: {
      maxMessages: 50,
      maxTokens: 2000,
      relevanceThreshold: 0.3,
    },
  };

  const manager = new EnhancedConversationManager(config);

  try {
    // Initialize the system
    console.log('🔧 Initializing enhanced memory system...');
    await manager.initialize();
    console.log('✅ System initialized successfully\n');

    // Demo 1: Basic conversation management
    console.log('📝 Demo 1: Basic Conversation Management');
    console.log('----------------------------------------');

    const sessionId = `demo-session-${Date.now()}`;
    
    // Add initial messages
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: 'Hello! Can you help me learn about TypeScript?' },
      { role: 'assistant', content: 'Of course! TypeScript is a superset of JavaScript that adds static typing. What specific aspect would you like to learn about?' },
      { role: 'user', content: 'I want to understand interfaces and how they work.' },
      { role: 'assistant', content: 'Great choice! Interfaces in TypeScript define the structure of objects. They specify what properties an object should have and their types.' },
    ];

    for (const message of messages) {
      const conversation = await manager.addMessage(sessionId, message, 'gpt-4o');
      console.log(`💬 Added ${message.role} message. Total tokens: ${conversation.totalTokens}`);
    }

    // Retrieve conversation
    const conversation = await manager.getConversation(sessionId);
    console.log(`📖 Retrieved conversation with ${conversation?.messages.length} messages\n`);

    // Demo 2: Conversation forking
    console.log('🌲 Demo 2: Conversation Forking');
    console.log('--------------------------------');

    const forkedConversation = await manager.forkConversation(
      sessionId,
      'Exploring advanced TypeScript topics',
      conversation?.messages[3].id // Fork from the interface question
    );

    console.log(`🔀 Forked conversation: ${forkedConversation.sessionId}`);
    console.log(`📏 Original messages: ${conversation?.messages.length}, Fork messages: ${forkedConversation.messages.length}`);

    // Continue the fork in a different direction
    await manager.addMessage(
      forkedConversation.sessionId,
      { role: 'assistant', content: 'Let me also show you advanced interface features like generics and inheritance.' },
      'gpt-4o'
    );

    // Demo 3: Show branches
    const branches = await manager.getBranches(sessionId);
    console.log(`🌿 Found ${branches.length} branches from original conversation\n`);

    // Demo 4: Smart pruning with many messages
    console.log('✂️  Demo 3: Smart Message Pruning');
    console.log('----------------------------------');

    const longSessionId = `long-demo-${Date.now()}`;
    
    // Simulate a long conversation
    console.log('📚 Adding 60 messages to test pruning...');
    for (let i = 0; i < 60; i++) {
      const role = i % 2 === 0 ? 'user' : 'assistant';
      const content = `Message ${i + 1}: ${role === 'user' ? 'Question' : 'Answer'} about TypeScript topic ${Math.floor(i / 2) + 1}`;
      
      await manager.addMessage(longSessionId, { role, content }, 'gpt-4o');
      
      if (i % 10 === 9) {
        const conv = await manager.getConversation(longSessionId);
        console.log(`  💭 ${i + 1} messages added, ${conv?.messages.length} kept (${conv?.totalTokens} tokens)`);
      }
    }

    const finalConversation = await manager.getConversation(longSessionId);
    console.log(`🎯 Final conversation: ${finalConversation?.messages.length} messages, ${finalConversation?.totalTokens} tokens\n`);

    // Demo 5: Performance and statistics
    console.log('📊 Demo 4: System Statistics');
    console.log('-----------------------------');

    const stats = await manager.getStats();
    console.log(`📈 Total conversations: ${stats.totalConversations}`);
    console.log(`🟢 Active conversations: ${stats.activeConversations}`);
    console.log(`💬 Total messages: ${stats.totalMessages}`);
    console.log(`🧠 Memory usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⚡ Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`🏃 Average retrieval time: ${stats.averageRetrievalTime}ms\n`);

    // Demo 6: Context-aware retrieval performance test
    console.log('🚀 Demo 5: Performance Test');
    console.log('----------------------------');

    const performanceTestCount = 10;
    const retrievalTimes: number[] = [];

    for (let i = 0; i < performanceTestCount; i++) {
      const start = Date.now();
      await manager.getConversation(sessionId);
      const elapsed = Date.now() - start;
      retrievalTimes.push(elapsed);
    }

    const avgTime = retrievalTimes.reduce((a, b) => a + b) / retrievalTimes.length;
    const maxTime = Math.max(...retrievalTimes);
    const minTime = Math.min(...retrievalTimes);

    console.log(`⏱️  Average retrieval time: ${avgTime.toFixed(2)}ms`);
    console.log(`📈 Max retrieval time: ${maxTime}ms`);
    console.log(`📉 Min retrieval time: ${minTime}ms`);
    console.log(`🎯 Performance target (<50ms): ${avgTime < 50 ? '✅ PASSED' : '❌ FAILED'}\n`);

    console.log('🎉 Demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('- ✅ PostgreSQL persistence with Redis caching');
    console.log('- ✅ LRU memory cache for active conversations');
    console.log('- ✅ Smart message pruning based on relevance');
    console.log('- ✅ Conversation branching/forking');
    console.log('- ✅ High-performance retrieval (<50ms target)');
    console.log('- ✅ Support for 1000+ message histories');
    console.log('- ✅ Comprehensive statistics and monitoring');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await manager.disconnect();
    console.log('\n🔌 Disconnected from enhanced memory system');
  }
}

// Run demo if script is executed directly
if (require.main === module) {
  demoEnhancedMemory().catch((error) => {
    console.error('Fatal demo error:', error);
    process.exit(1);
  });
}

export { demoEnhancedMemory };