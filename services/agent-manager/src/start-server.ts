/**
 * WebSocket Server Start Script
 * Starts the WebSocket server on a configurable port
 */

import { DashboardWebSocketServer } from './websocket';

// Get port from environment or use default
const port = parseInt(process.env.WS_PORT || '3001', 10);

// Create and start server
const server = new DashboardWebSocketServer(port);
server.start();

console.log(`[WS] WebSocket server starting on port ${port}...`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[WS] Shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[WS] Received SIGTERM, shutting down...');
  server.stop();
  process.exit(0);
});

// Log server stats periodically
setInterval(() => {
  const stats = server.getStats();
  console.log(`[WS] Server stats - Connections: ${stats.connections}, Agents: ${stats.agents}`);
}, 60000); // Every minute