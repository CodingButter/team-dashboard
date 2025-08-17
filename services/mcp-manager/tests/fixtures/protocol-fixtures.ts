/**
 * @package mcp-manager/tests/fixtures
 * MCP protocol-specific fixtures for testing JSON-RPC communication
 * 
 * This file has been refactored for maintainability.
 * Original 715+ lines broken down into focused modules in ./protocol/
 */

// Re-export all protocol fixtures
export * from './protocol/index.js';

// Main fixtures class for backward compatibility
export { McpProtocolFixtures } from './protocol/index.js';