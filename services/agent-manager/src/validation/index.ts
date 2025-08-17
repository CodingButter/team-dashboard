/**
 * Data Validation Pipeline - Public API
 * 
 * CRITICAL SECURITY MODULE: This is the main entry point for the payment-grade
 * validation system that protects all agent communication.
 * 
 * @author David Chen (Stripe & Subscription Expert) + Maya Rodriguez (Data Expert)
 * @priority P0 - EMERGENCY SECURITY FIX
 */

// Export the secure message broker as the default communication layer
export { SecureMessageBroker } from './secure-message-broker';

// Export the validation utilities for custom validation needs
export { 
  MessageValidator,
  messageValidator,
  validateMessageOrThrow,
  VALIDATION_LIMITS
} from './message-validator';
import { ValidationError } from '@team-dashboard/utils';
export { ValidationError };

// Export test utilities for verification
export { 
  ValidationTestSuite,
  runSecurityValidationTests,
  quickSecurityCheck
} from './validation-tests';

// Export types for TypeScript integration
export type { 
  SecurityViolation,
  SecurityMetrics
} from './secure-message-broker';
import type { ValidationResult } from '@team-dashboard/utils';
export type { ValidationResult };

/**
 * Quick setup function to replace MessageBroker with SecureMessageBroker
 * 
 * Usage:
 * ```typescript
 * import { createSecureMessageBroker } from './validation';
 * 
 * const broker = createSecureMessageBroker(config);
 * await broker.connect();
 * ```
 */
export function createSecureMessageBroker(config: any) {
  const { SecureMessageBroker } = require('./secure-message-broker');
  return new SecureMessageBroker(config);
}

/**
 * Initialize validation system and run security checks
 */
export async function initializeValidationSystem(runTests: boolean = false): Promise<boolean> {
  console.log('🔒 Initializing Payment-Grade Validation System...');
  
  try {
    // Import test functions
    const { quickSecurityCheck, runSecurityValidationTests } = await import('./validation-tests');
    
    // Run quick security check
    const quickCheckPassed = quickSecurityCheck();
    if (!quickCheckPassed) {
      console.error('❌ Quick security check failed! System may be compromised.');
      return false;
    }
    
    // Run full test suite if requested
    if (runTests) {
      console.log('🧪 Running full security test suite...');
      const fullTestsPassed = await runSecurityValidationTests();
      if (!fullTestsPassed) {
        console.error('❌ Full security tests failed! Review validation implementation.');
        return false;
      }
    }
    
    console.log('✅ Validation system initialized successfully');
    console.log('🛡️ All agent communications are now protected with payment-grade security');
    
    return true;
  } catch (error) {
    console.error('🚨 Failed to initialize validation system:', error);
    return false;
  }
}

/**
 * Emergency validation bypass (USE WITH EXTREME CAUTION)
 * 
 * This function should ONLY be used in development or emergency situations
 * where the validation system needs to be temporarily disabled.
 */
export function createBypassMessageBroker(config: any, reason: string) {
  console.warn('🚨 WARNING: Creating UNPROTECTED message broker!');
  console.warn(`🚨 Reason: ${reason}`);
  console.warn('🚨 This bypass should NEVER be used in production!');
  
  const { MessageBroker } = require('../communication/message-broker');
  return new MessageBroker(config);
}

/**
 * Validation system status and health check
 */
export async function getValidationSystemStatus() {
  const { messageValidator } = await import('./message-validator');
  
  return {
    timestamp: Date.now(),
    validationActive: true,
    validationStats: messageValidator.getValidationStats(),
    securityLevel: 'payment-grade',
    protectedOperations: [
      'sendMessage',
      'broadcast', 
      'initiateHandoff',
      'respondToHandoff',
      'publishEvent'
    ]
  };
}

// Default export for easy importing
export default {
  SecureMessageBroker,
  messageValidator,
  createSecureMessageBroker,
  initializeValidationSystem,
  getValidationSystemStatus,
  runSecurityValidationTests,
  quickSecurityCheck
};