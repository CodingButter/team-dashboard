/**
 * @package mcp-manager/tests/fixtures
 * MCP initialization protocol fixtures
 */

import { BaseFixtureFactory } from './base-factory';
import { JsonRpcRequest, JsonRpcResponse } from './types';

export class InitializationFixtures extends BaseFixtureFactory {
  /**
   * Generate valid initialization requests
   */
  static generateInitializationRequests(): JsonRpcRequest[] {
    return [
      this.createRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }),
      this.createRequest('notifications/initialized'),
      this.createRequest('ping')
    ];
  }

  /**
   * Generate valid initialization responses
   */
  static generateInitializationResponses(): JsonRpcResponse[] {
    return [
      this.createResponse(1, {
        protocolVersion: '2024-11-05',
        capabilities: {
          logging: {},
          prompts: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true }
        },
        serverInfo: {
          name: 'test-server',
          version: '1.0.0'
        }
      }),
      this.createResponse(2, {}),
      this.createResponse(3, {})
    ];
  }

  /**
   * Generate initialization error scenarios
   */
  static generateInitializationErrors(): JsonRpcResponse[] {
    return [
      this.createErrorResponse(1, -32602, 'Invalid protocol version'),
      this.createErrorResponse(2, -32603, 'Server initialization failed'),
      this.createErrorResponse(3, -32000, 'Connection timeout')
    ];
  }
}