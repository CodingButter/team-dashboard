/**
 * WebSocket Server Entry Point
 * @deprecated - Use modular imports from ./websocket/ instead
 * This file now provides a compatibility layer for the refactored server
 */

// Import the new modular server
import { DashboardWebSocketServer } from './websocket';

// Re-export for backward compatibility
export { DashboardWebSocketServer } from './websocket';

// Start server if run directly
if (require.main === module) {
  const server = new DashboardWebSocketServer(3001);
  server.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[WS] Shutting down...');
    server.stop();
    process.exit(0);
  });
}