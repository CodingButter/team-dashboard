/**
 * @package agent-manager/tests
 * Lifecycle Management Test Suite - Refactored for maintainability
 * 
 * Original 628+ lines broken down into focused test modules:
 * - lifecycle-manager.test.ts
 * - health-monitor.test.ts  
 * - resource-monitor.test.ts
 * - event-logger.test.ts
 * - integrated-manager.test.ts
 * - spawner-integration.test.ts
 * - performance-validation.test.ts
 */

// Import all test suites - Vitest will automatically discover and run them
import './lifecycle/lifecycle-manager.test.js'
import './lifecycle/health-monitor.test.js'
import './lifecycle/resource-monitor.test.js'
import './lifecycle/event-logger.test.js'
import './lifecycle/integrated-manager.test.js'
import './lifecycle/spawner-integration.test.js'
import './lifecycle/performance-validation.test.js'

// This file serves as the entry point for the lifecycle test suite
// Individual test files are organized by component responsibility