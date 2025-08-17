/**
 * @package mcp-manager/tests/fixtures
 * MCP resources protocol fixtures
 */

import { BaseFixtureFactory } from './base-factory';
import { JsonRpcRequest, JsonRpcResponse, McpResource } from './types';

export class ResourcesFixtures extends BaseFixtureFactory {
  /**
   * Generate valid resources requests
   */
  static generateResourcesRequests(): JsonRpcRequest[] {
    return [
      this.createRequest('resources/list'),
      this.createRequest('resources/read', {
        uri: 'file://test.txt'
      }),
      this.createRequest('resources/subscribe', {
        uri: 'file://watched.txt'
      }),
      this.createRequest('resources/unsubscribe', {
        uri: 'file://watched.txt'
      })
    ];
  }

  /**
   * Generate sample resource definitions
   */
  static generateResourceDefinitions(): McpResource[] {
    return [
      {
        uri: 'file://test.txt',
        name: 'Test File',
        description: 'A simple test file',
        mimeType: 'text/plain'
      },
      {
        uri: 'file://config.json',
        name: 'Configuration',
        description: 'Application configuration file',
        mimeType: 'application/json'
      },
      {
        uri: 'memory://session_data',
        name: 'Session Data',
        description: 'Current session information'
      },
      {
        uri: 'http://api.example.com/data',
        name: 'External API',
        description: 'Remote data source',
        mimeType: 'application/json'
      }
    ];
  }

  /**
   * Generate resources responses
   */
  static generateResourcesResponses(): JsonRpcResponse[] {
    return [
      this.createResponse(1, {
        resources: this.generateResourceDefinitions()
      }),
      this.createResponse(2, {
        contents: [
          {
            uri: 'file://test.txt',
            mimeType: 'text/plain',
            text: 'This is test file content.'
          }
        ]
      }),
      this.createResponse(3, {}),
      this.createResponse(4, {})
    ];
  }

  /**
   * Generate resources error scenarios
   */
  static generateResourcesErrors(): JsonRpcResponse[] {
    return [
      this.createErrorResponse(1, -32601, 'Resource not found'),
      this.createErrorResponse(2, -32000, 'Permission denied'),
      this.createErrorResponse(3, -32000, 'Resource unavailable'),
      this.createErrorResponse(4, -32602, 'Invalid resource URI')
    ];
  }
}