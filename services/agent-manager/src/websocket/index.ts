/**
 * WebSocket Module Index
 * Exports for the organized WebSocket server modules
 */

export * from './connection';
export * from './message-handler';
export * from './agent-manager';
export * from './server';

// Main export for easy server instantiation
export { DashboardWebSocketServer as WebSocketServer } from './server';