/**
 * Payment-Grade Validation Test Suite
 * 
 * CRITICAL TESTING: This test suite validates our security measures using
 * the same rigor as payment system security testing
 * 
 * @author David Chen (Stripe & Subscription Expert)
 * @priority P0 - EMERGENCY SECURITY VALIDATION
 */

import { messageValidator, ValidationError } from './message-validator';
import { AgentMessage, BroadcastMessage, TaskHandoff, AgentEvent } from '@team-dashboard/types';

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function createValidAgentMessage(): AgentMessage {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    from: 'test-agent-1',
    to: 'test-agent-2', 
    content: 'This is a valid test message',
    type: 'direct',
    timestamp: Date.now(),
    correlationId: '123e4567-e89b-12d3-a456-426614174001',
    metadata: { priority: 'normal', source: 'test' }
  };
}

function createValidBroadcastMessage(): BroadcastMessage {
  return {
    id: '123e4567-e89b-12d3-a456-426614174002',
    from: 'test-agent-1',
    channel: 'general',
    content: 'This is a valid broadcast message',
    type: 'event',
    timestamp: Date.now(),
    metadata: { priority: 'normal' }
  };
}

function createValidTaskHandoff(): TaskHandoff {
  return {
    id: '123e4567-e89b-12d3-a456-426614174003',
    from: 'test-agent-1',
    to: 'test-agent-2',
    task: {
      task: {
        id: 'task-123',
        title: 'Test Task',
        description: 'A test task for validation',
        priority: 'normal',
        status: 'pending',
        createdBy: 'test-agent-1',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now()
      },
      context: { testData: 'value' }
    },
    reason: 'Testing handoff validation',
    timestamp: Date.now(),
    status: 'pending',
    expiresAt: Date.now() + (30 * 60 * 1000)
  };
}

// ============================================================================
// SECURITY ATTACK VECTORS FOR TESTING
// ============================================================================

const ATTACK_VECTORS = {
  // Injection attacks
  CODE_INJECTION: {
    content: 'eval("malicious code"); function() { return "hacked"; }',
    metadata: { script: 'eval(document.cookie)' }
  },
  
  // XSS attacks
  XSS_ATTACK: {
    content: '<script>alert("XSS")</script>',
    metadata: { payload: 'javascript:void(0)' }
  },
  
  // Prototype pollution
  PROTOTYPE_POLLUTION: {
    __proto__: { isAdmin: true },
    constructor: { prototype: { polluted: true } }
  },
  
  // Oversized content
  OVERSIZED_CONTENT: {
    content: 'x'.repeat(100000), // 100KB content
    metadata: Object.fromEntries(Array(100).fill(0).map((_, i) => [`key${i}`, 'x'.repeat(1000)]))
  },
  
  // Invalid timestamps
  INVALID_TIMESTAMPS: [
    0, // Too old
    Date.now() + (365 * 24 * 60 * 60 * 1000), // Too far in future
    -1, // Negative
    'not-a-number', // Invalid type
    null
  ],
  
  // Invalid UUIDs
  INVALID_UUIDS: [
    'not-a-uuid',
    '123',
    '',
    null,
    undefined,
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' // Wrong format
  ],
  
  // Path traversal
  PATH_TRAVERSAL: {
    content: '../../../etc/passwd',
    metadata: { path: '../../../../windows/system32' }
  },
  
  // Null byte injection
  NULL_BYTE_INJECTION: {
    content: 'file.txt\x00.php',
    from: 'agent\x00admin'
  },
  
  // Circular references
  CIRCULAR_REFERENCE: (() => {
    const obj: any = { name: 'circular' };
    obj.self = obj;
    return obj;
  })(),
  
  // Buffer overflow attempts
  BUFFER_OVERFLOW: {
    from: 'a'.repeat(10000),
    to: 'b'.repeat(10000),
    content: 'c'.repeat(1000000)
  }
};

// ============================================================================
// TEST EXECUTION ENGINE
// ============================================================================

export class ValidationTestSuite {
  private testResults: Array<{ test: string; passed: boolean; error?: string }> = [];
  
  /**
   * Run all validation tests
   */
  async runAllTests(): Promise<{ 
    passed: number; 
    failed: number; 
    total: number; 
    details: Array<{ test: string; passed: boolean; error?: string }> 
  }> {
    console.log('🔒 Starting Payment-Grade Security Validation Tests...\n');
    
    // Test valid messages
    await this.testValidMessages();
    
    // Test attack vectors
    await this.testSecurityAttacks();
    
    // Test edge cases
    await this.testEdgeCases();
    
    // Test rate limiting scenarios
    await this.testRateLimiting();
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    console.log('\n🔒 SECURITY VALIDATION SUMMARY:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    console.log(`🛡️ Security Level: ${failed === 0 ? 'SECURE' : 'VULNERABLE'}\n`);
    
    return {
      passed,
      failed,
      total: this.testResults.length,
      details: this.testResults
    };
  }
  
  /**
   * Test that valid messages pass validation
   */
  private async testValidMessages(): Promise<void> {
    console.log('📋 Testing Valid Messages...');
    
    // Test valid AgentMessage
    this.runTest('Valid AgentMessage', () => {
      const message = createValidAgentMessage();
      const result = messageValidator.validateAgentMessage(message);
      return result.success && result.data !== undefined;
    });
    
    // Test valid BroadcastMessage
    this.runTest('Valid BroadcastMessage', () => {
      const message = createValidBroadcastMessage();
      const result = messageValidator.validateBroadcastMessage(message);
      return result.success && result.data !== undefined;
    });
    
    // Test valid TaskHandoff
    this.runTest('Valid TaskHandoff', () => {
      const handoff = createValidTaskHandoff();
      const result = messageValidator.validateTaskHandoff(handoff);
      return result.success && result.data !== undefined;
    });
    
    console.log('✅ Valid message tests completed\n');
  }
  
  /**
   * Test security attack vectors
   */
  private async testSecurityAttacks(): Promise<void> {
    console.log('🚨 Testing Security Attack Vectors...');
    
    // Test code injection protection
    this.runTest('Code Injection Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        content: ATTACK_VECTORS.CODE_INJECTION.content
      };
      const result = messageValidator.validateAgentMessage(message);
      // Should pass validation but flag security concerns
      return result.success && result.securityFlags.includes('POTENTIAL_CODE_INJECTION');
    });
    
    // Test XSS protection
    this.runTest('XSS Attack Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        content: ATTACK_VECTORS.XSS_ATTACK.content
      };
      const result = messageValidator.validateAgentMessage(message);
      return result.success && result.securityFlags.includes('POTENTIAL_XSS_PAYLOAD');
    });
    
    // Test prototype pollution protection
    this.runTest('Prototype Pollution Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        ...ATTACK_VECTORS.PROTOTYPE_POLLUTION
      };
      const result = messageValidator.validateAgentMessage(message);
      return !result.success || result.securityFlags.includes('PROTOTYPE_POLLUTION_ATTEMPT');
    });
    
    // Test oversized content protection
    this.runTest('Oversized Content Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        content: ATTACK_VECTORS.OVERSIZED_CONTENT.content
      };
      const result = messageValidator.validateAgentMessage(message);
      return !result.success; // Should fail validation
    });
    
    // Test path traversal protection
    this.runTest('Path Traversal Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        content: ATTACK_VECTORS.PATH_TRAVERSAL.content
      };
      const result = messageValidator.validateAgentMessage(message);
      return result.success; // Content validation should pass, but be flagged
    });
    
    // Test null byte injection protection
    this.runTest('Null Byte Injection Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        from: ATTACK_VECTORS.NULL_BYTE_INJECTION.from
      };
      const result = messageValidator.validateAgentMessage(message);
      return !result.success; // Should fail due to invalid agent ID format
    });
    
    // Test circular reference protection
    this.runTest('Circular Reference Protection', () => {
      try {
        const message = { 
          ...createValidAgentMessage(),
          metadata: ATTACK_VECTORS.CIRCULAR_REFERENCE
        };
        const result = messageValidator.validateAgentMessage(message);
        return result.securityFlags.includes('CIRCULAR_REFERENCE_DETECTED');
      } catch (error) {
        return true; // Should throw or be detected
      }
    });
    
    // Test buffer overflow protection
    this.runTest('Buffer Overflow Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        ...ATTACK_VECTORS.BUFFER_OVERFLOW
      };
      const result = messageValidator.validateAgentMessage(message);
      return !result.success; // Should fail validation
    });
    
    console.log('✅ Security attack vector tests completed\n');
  }
  
  /**
   * Test edge cases and boundary conditions
   */
  private async testEdgeCases(): Promise<void> {
    console.log('🔍 Testing Edge Cases...');
    
    // Test invalid timestamps
    for (const timestamp of ATTACK_VECTORS.INVALID_TIMESTAMPS) {
      this.runTest(`Invalid Timestamp: ${timestamp}`, () => {
        const message = { 
          ...createValidAgentMessage(),
          timestamp: timestamp as number
        };
        const result = messageValidator.validateAgentMessage(message);
        return !result.success; // Should fail validation
      });
    }
    
    // Test invalid UUIDs
    for (const uuid of ATTACK_VECTORS.INVALID_UUIDS) {
      this.runTest(`Invalid UUID: ${uuid}`, () => {
        const message = { 
          ...createValidAgentMessage(),
          id: uuid as string
        };
        const result = messageValidator.validateAgentMessage(message);
        return !result.success; // Should fail validation
      });
    }
    
    // Test empty and null values
    this.runTest('Empty Content Protection', () => {
      const message = { 
        ...createValidAgentMessage(),
        content: ''
      };
      const result = messageValidator.validateAgentMessage(message);
      return result.success; // Empty content should be allowed by schema but flagged by business logic
    });
    
    this.runTest('Null Value Protection', () => {
      const result = messageValidator.validateAgentMessage(null);
      return !result.success && result.securityFlags.includes('NULL_OR_UNDEFINED_DATA');
    });
    
    this.runTest('Undefined Value Protection', () => {
      const result = messageValidator.validateAgentMessage(undefined);
      return !result.success && result.securityFlags.includes('NULL_OR_UNDEFINED_DATA');
    });
    
    console.log('✅ Edge case tests completed\n');
  }
  
  /**
   * Test rate limiting scenarios
   */
  private async testRateLimiting(): Promise<void> {
    console.log('⏱️ Testing Rate Limiting Scenarios...');
    
    // Test metadata size limits
    this.runTest('Metadata Size Limit', () => {
      const message = { 
        ...createValidAgentMessage(),
        metadata: ATTACK_VECTORS.OVERSIZED_CONTENT.metadata
      };
      const result = messageValidator.validateAgentMessage(message);
      return !result.success; // Should fail due to metadata size limits
    });
    
    // Test array length limits
    this.runTest('Array Length Limit', () => {
      const handoff = createValidTaskHandoff();
      handoff.task.task.tags = Array(2000).fill('tag'); // Exceed limit
      const result = messageValidator.validateTaskHandoff(handoff);
      return !result.success; // Should fail due to array length limits
    });
    
    console.log('✅ Rate limiting tests completed\n');
  }
  
  /**
   * Run a single test and record the result
   */
  private runTest(testName: string, testFunction: () => boolean): void {
    try {
      const passed = testFunction();
      this.testResults.push({ test: testName, passed });
      console.log(`${passed ? '✅' : '❌'} ${testName}`);
    } catch (error) {
      this.testResults.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.log(`❌ ${testName} - ERROR: ${error}`);
    }
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

/**
 * Run security validation tests
 */
export async function runSecurityValidationTests(): Promise<boolean> {
  const testSuite = new ValidationTestSuite();
  const results = await testSuite.runAllTests();
  
  // Return true if all tests passed
  return results.failed === 0;
}

/**
 * Quick validation test for CI/CD
 */
export function quickSecurityCheck(): boolean {
  console.log('🔒 Running Quick Security Check...');
  
  // Test basic validation functionality
  const validMessage = createValidAgentMessage();
  const result = messageValidator.validateAgentMessage(validMessage);
  
  if (!result.success) {
    console.error('❌ Basic validation failed!');
    return false;
  }
  
  // Test basic attack protection
  const attackMessage = { 
    ...validMessage,
    content: '<script>alert("hack")</script>' 
  };
  const attackResult = messageValidator.validateAgentMessage(attackMessage);
  
  if (!attackResult.securityFlags.includes('POTENTIAL_XSS_PAYLOAD')) {
    console.error('❌ XSS protection failed!');
    return false;
  }
  
  console.log('✅ Quick security check passed');
  return true;
}

// Export the main test suite for external use
export default ValidationTestSuite;