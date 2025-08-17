/**
 * @package mcp-manager/tests/fixtures/protocol
 * Notification message fixtures for MCP testing
 */

import { JsonRpcRequest } from './types.js';

export class NotificationFixtures {
  /**
   * Generate notification messages (no response expected)
   */
  static generateNotifications(): Array<Omit<JsonRpcRequest, 'id'>> {
    return [
      {
        jsonrpc: '2.0',
        method: 'notifications/cancelled',
        params: {
          requestId: 123,
          reason: 'User cancelled operation',
        },
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken: 'token_123',
          value: {
            kind: 'report',
            message: 'Processing...',
            percentage: 50,
          },
        },
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/resources/updated',
        params: {
          uri: 'file://config.json',
        },
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed',
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/prompts/list_changed',
      },
    ];
  }
}