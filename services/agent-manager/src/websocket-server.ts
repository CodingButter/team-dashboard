/**
 * WebSocket Server Entry Point
 * @deprecated - Use modular imports from ./websocket/ instead
 * This file now provides a compatibility layer for the refactored server
 */

// Import the new modular server
import { DashboardWebSocketServer } from './websocket/server.js';

// Re-export for backward compatibility
export { DashboardWebSocketServer } from './websocket/server.js';

// Start server if run directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = parseInt(process.env.PORT || '3001');
  const server = new DashboardWebSocketServer(port);
  server.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[WS] Shutting down...');
    server.stop();
    process.exit(0);
  });
}