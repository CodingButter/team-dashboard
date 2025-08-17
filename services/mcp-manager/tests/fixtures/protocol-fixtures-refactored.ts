/**
 * @package mcp-manager/tests/fixtures
 * Refactored MCP protocol fixtures - main entry point
 */

export * from './types';
export * from './base-factory';
export * from './initialization-fixtures';
export * from './tools-fixtures';
export * from './resources-fixtures';
export * from './prompts-fixtures';

import { JsonRpcRequest, JsonRpcResponse } from './types';
import { InitializationFixtures } from './initialization-fixtures';
import { ToolsFixtures } from './tools-fixtures';
import { ResourcesFixtures } from './resources-fixtures';
import { PromptsFixtures } from './prompts-fixtures';

/**
 * Main protocol fixtures class - maintains backward compatibility
 * while delegating to specialized fixture classes
 */
export class McpProtocolFixtures {
  /**
   * Generate all valid requests across all MCP protocol areas
   */
  static generateValidRequests(): JsonRpcRequest[] {
    return [
      ...InitializationFixtures.generateInitializationRequests(),
      ...ToolsFixtures.generateToolsRequests(),
      ...ResourcesFixtures.generateResourcesRequests(),
      ...PromptsFixtures.generatePromptsRequests()
    ];
  }

  /**
   * Generate all valid responses across all MCP protocol areas
   */
  static generateValidResponses(): JsonRpcResponse[] {
    return [
      ...InitializationFixtures.generateInitializationResponses(),
      ...ToolsFixtures.generateToolsResponses(),
      ...ResourcesFixtures.generateResourcesResponses(),
      ...PromptsFixtures.generatePromptsResponses()
    ];
  }

  /**
   * Generate all error responses across all MCP protocol areas
   */
  static generateErrorResponses(): JsonRpcResponse[] {
    return [
      ...InitializationFixtures.generateInitializationErrors(),
      ...ToolsFixtures.generateToolsErrors(),
      ...ResourcesFixtures.generateResourcesErrors(),
      ...PromptsFixtures.generatePromptsErrors()
    ];
  }

  /**
   * Generate fixtures for a specific protocol area
   */
  static generateForProtocolArea(area: 'initialization' | 'tools' | 'resources' | 'prompts') {
    switch (area) {
      case 'initialization':
        return {
          requests: InitializationFixtures.generateInitializationRequests(),
          responses: InitializationFixtures.generateInitializationResponses(),
          errors: InitializationFixtures.generateInitializationErrors()
        };
      
      case 'tools':
        return {
          requests: ToolsFixtures.generateToolsRequests(),
          responses: ToolsFixtures.generateToolsResponses(),
          errors: ToolsFixtures.generateToolsErrors(),
          definitions: ToolsFixtures.generateToolDefinitions()
        };
      
      case 'resources':
        return {
          requests: ResourcesFixtures.generateResourcesRequests(),
          responses: ResourcesFixtures.generateResourcesResponses(),
          errors: ResourcesFixtures.generateResourcesErrors(),
          definitions: ResourcesFixtures.generateResourceDefinitions()
        };
      
      case 'prompts':
        return {
          requests: PromptsFixtures.generatePromptsRequests(),
          responses: PromptsFixtures.generatePromptsResponses(),
          errors: PromptsFixtures.generatePromptsErrors(),
          definitions: PromptsFixtures.generatePromptDefinitions()
        };
      
      default:
        throw new Error(`Unknown protocol area: ${area}`);
    }
  }

  /**
   * Generate a complete test scenario with request/response pairs
   */
  static generateTestScenario(protocolArea: string, scenarioType: 'success' | 'error' = 'success') {
    const area = protocolArea as 'initialization' | 'tools' | 'resources' | 'prompts';
    const fixtures = this.generateForProtocolArea(area);
    
    if (scenarioType === 'error') {
      return {
        requests: fixtures.requests,
        responses: fixtures.errors
      };
    }
    
    return {
      requests: fixtures.requests,
      responses: fixtures.responses
    };
  }
}