/**
 * @package mcp-manager/tests/fixtures
 * MCP prompts protocol fixtures
 */

import { BaseFixtureFactory } from './base-factory';
import { JsonRpcRequest, JsonRpcResponse, McpPrompt } from './types';

export class PromptsFixtures extends BaseFixtureFactory {
  /**
   * Generate valid prompts requests
   */
  static generatePromptsRequests(): JsonRpcRequest[] {
    return [
      this.createRequest('prompts/list'),
      this.createRequest('prompts/get', {
        name: 'test_prompt',
        arguments: {
          context: 'test context'
        }
      }),
      this.createRequest('prompts/get', {
        name: 'code_review',
        arguments: {
          language: 'typescript',
          file_path: '/src/components/test.tsx'
        }
      })
    ];
  }

  /**
   * Generate sample prompt definitions
   */
  static generatePromptDefinitions(): McpPrompt[] {
    return [
      {
        name: 'test_prompt',
        description: 'A simple test prompt',
        arguments: [
          {
            name: 'context',
            description: 'The context for the prompt',
            required: true
          }
        ]
      },
      {
        name: 'code_review',
        description: 'Review code for quality and best practices',
        arguments: [
          {
            name: 'language',
            description: 'Programming language',
            required: true
          },
          {
            name: 'file_path',
            description: 'Path to the file being reviewed',
            required: true
          },
          {
            name: 'focus_areas',
            description: 'Specific areas to focus on',
            required: false
          }
        ]
      },
      {
        name: 'documentation_generator',
        description: 'Generate documentation for code',
        arguments: [
          {
            name: 'code_content',
            description: 'The code to document',
            required: true
          },
          {
            name: 'format',
            description: 'Documentation format (markdown, jsdoc, etc.)',
            required: false
          }
        ]
      }
    ];
  }

  /**
   * Generate prompts responses
   */
  static generatePromptsResponses(): JsonRpcResponse[] {
    return [
      this.createResponse(1, {
        prompts: this.generatePromptDefinitions()
      }),
      this.createResponse(2, {
        description: 'A simple test prompt',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'You are a helpful assistant. Context: test context'
            }
          }
        ]
      }),
      this.createResponse(3, {
        description: 'Review code for quality and best practices',
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: 'You are a senior code reviewer. Focus on TypeScript best practices.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please review this TypeScript file: /src/components/test.tsx'
            }
          }
        ]
      })
    ];
  }

  /**
   * Generate prompts error scenarios
   */
  static generatePromptsErrors(): JsonRpcResponse[] {
    return [
      this.createErrorResponse(1, -32601, 'Prompt not found'),
      this.createErrorResponse(2, -32602, 'Missing required prompt arguments'),
      this.createErrorResponse(3, -32000, 'Prompt generation failed')
    ];
  }
}