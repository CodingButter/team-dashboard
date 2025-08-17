/**
 * @package mcp-manager/tests/fixtures/protocol
 * Central export for all MCP protocol fixtures
 */

export * from './types.js';
export * from './valid-requests.js';
export * from './valid-responses.js';
export * from './invalid-requests.js';
export * from './notifications.js';
export * from './error-responses.js';
export * from './batch-and-large.js';
export * from './validation.js';

// Re-export as factory class for backward compatibility
export class McpProtocolFixtures {
  static generateValidRequests = ValidRequestFixtures.generateValidRequests;
  static generateValidResponses = ValidResponseFixtures.generateValidResponses;
  static generateInvalidRequests = InvalidRequestFixtures.generateInvalidRequests;
  static generateNotifications = NotificationFixtures.generateNotifications;
  static generateErrorResponses = ErrorResponseFixtures.generateErrorResponses;
  static generateBatchRequests = BatchAndLargeFixtures.generateBatchRequests;
  static generateLargeRequest = BatchAndLargeFixtures.generateLargeRequest;
  static generateStreamingResponse = BatchAndLargeFixtures.generateStreamingResponse;
  static validateRequest = ValidationFixtures.validateRequest;
  static validateResponse = ValidationFixtures.validateResponse;
}

import { ValidRequestFixtures } from './valid-requests.js';
import { ValidResponseFixtures } from './valid-responses.js';
import { InvalidRequestFixtures } from './invalid-requests.js';
import { NotificationFixtures } from './notifications.js';
import { ErrorResponseFixtures } from './error-responses.js';
import { BatchAndLargeFixtures } from './batch-and-large.js';
import { ValidationFixtures } from './validation.js';