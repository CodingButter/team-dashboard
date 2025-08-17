/**
 * @package mcp-manager/tests/fixtures/protocol
 * Batch requests and large payload fixtures for MCP testing
 */

import { JsonRpcRequest, JsonRpcResponse } from './types.js';

export class BatchAndLargeFixtures {
  /**
   * Generate batch requests for testing batch processing
   */
  static generateBatchRequests(): JsonRpcRequest[] {
    return [
      {
        jsonrpc: '2.0',
        id: 'batch_1',
        method: 'tools/list',
      },
      {
        jsonrpc: '2.0',
        id: 'batch_2',
        method: 'resources/list',
      },
      {
        jsonrpc: '2.0',
        id: 'batch_3',
        method: 'prompts/list',
      },
      {
        jsonrpc: '2.0',
        id: 'batch_4',
        method: 'ping',
      },
    ];
  }

  /**
   * Generate large request for payload testing
   */
  static generateLargeRequest(): JsonRpcRequest {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `item_${i}`,
      data: 'x'.repeat(100),
      metadata: {
        created: new Date().toISOString(),
        tags: [`tag_${i % 10}`],
      },
    }));

    return {
      jsonrpc: '2.0',
      id: 'large_request',
      method: 'tools/call',
      params: {
        name: 'process_large_dataset',
        arguments: {
          dataset: largeData,
        },
      },
    };
  }

  /**
   * Generate streaming response for testing streaming capabilities
   */
  static generateStreamingResponse(): Array<Partial<JsonRpcResponse>> {
    return [
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'progress',
          message: 'Starting processing...',
          percentage: 0,
        },
      },
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'progress',
          message: 'Processing data...',
          percentage: 25,
        },
      },
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'progress',
          message: 'Analyzing results...',
          percentage: 75,
        },
      },
      {
        jsonrpc: '2.0',
        id: 'stream_1',
        result: {
          type: 'complete',
          message: 'Processing completed',
          percentage: 100,
          data: {
            processed: 1000,
            errors: 0,
            duration: 5.2,
          },
        },
      },
    ];
  }
}