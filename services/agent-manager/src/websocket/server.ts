/**
 * Main WebSocket Server
 * Orchestrates connection management, message handling, and agent operations
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionManager } from './connection';
import { MessageHandler } from './message-handler';
import { AgentManager } from './agent-manager';

/**
 * Main WebSocket server class that coordinates all WebSocket operations
 */
export class DashboardWebSocketServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private connectionManager: ConnectionManager;
  private agentManager: AgentManager;
  private messageHandler: MessageHandler;
  private readonly maxConnections: number = 1000;
  private readonly rateLimitMap: Map<string, number[]> = new Map();
  private readonly blockedIPs: Map<string, number> = new Map(); // IP -> block expiry timestamp
  private readonly connectionAttempts: Map<string, number> = new Map(); // IP -> failed attempts
  private performanceMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messageCount: 0,
    avgLatency: 0,
    blockedConnections: 0,
    rateLimitedConnections: 0
  };
  
  constructor(private port: number = 3001) {
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ 
      server: this.httpServer,
      maxPayload: 1024 * 1024, // 1MB max message size
      backlog: 100 // Connection backlog
    });
    
    // Initialize managers
    this.connectionManager = new ConnectionManager();
    this.agentManager = new AgentManager(this.connectionManager);
    this.messageHandler = new MessageHandler(this.agentManager);
    
    this.setupServer();
    this.startPerformanceMonitoring();
  }
  
  /**
   * Initialize WebSocket server and event handlers
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const clientIp = req.socket.remoteAddress;
      
      // Check connection limits
      if (this.connectionManager.getConnectionCount() >= this.maxConnections) {
        console.warn(`[WS] Connection limit reached, rejecting: ${clientIp}`);
        ws.close(1013, 'Server overloaded');
        return;
      }
      
      // Check if IP is blocked
      if (this.isIPBlocked(clientIp)) {
        // Silently drop connection without logging to prevent log spam
        ws.close(1008, 'Blocked');
        this.performanceMetrics.blockedConnections++;
        return;
      }
      
      // Check rate limiting
      if (this.isRateLimited(clientIp)) {
        this.handleRateLimitViolation(clientIp);
        ws.close(1008, 'Rate limited - Please wait before reconnecting');
        this.performanceMetrics.rateLimitedConnections++;
        return;
      }
      
      const client = this.connectionManager.addClient(ws);
      this.performanceMetrics.totalConnections++;
      this.performanceMetrics.activeConnections++;
      
      console.log(`[WS] New connection: ${client.id} from ${clientIp} (${this.performanceMetrics.activeConnections}/${this.maxConnections})`);
      
      // Set up event handlers with performance monitoring
      ws.on('message', (data: Buffer) => {
        const start = performance.now();
        this.messageHandler.handleMessage(client, data).finally(() => {
          const latency = performance.now() - start;
          this.updateLatencyMetrics(latency);
          this.performanceMetrics.messageCount++;
        });
      });
      
      ws.on('close', () => {
        this.handleDisconnect(client.id);
        this.performanceMetrics.activeConnections--;
      });
      
      ws.on('error', (error) => {
        console.error(`[WS] Client error ${client.id}:`, error);
      });
      
      // Start authentication timeout with shorter timeout for performance
      client.startAuthTimeout(() => {
        if (!client.isAuthenticated) {
          console.log(`[WS] Authentication timeout for client ${client.id}`);
          ws.close(4001, 'Authentication timeout');
        }
      }, 3000); // 3 second timeout for faster cleanup
      
      // Set up optimized heartbeat
      this.setupHeartbeat(client);
    });
  }
  
  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    console.log(`[WS] Client disconnected: ${clientId}`);
    this.connectionManager.removeClient(clientId);
  }
  
  /**
   * Set up heartbeat mechanism
   */
  private setupHeartbeat(client: any): void {
    const interval = setInterval(() => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.send({
          id: uuidv4(),
          type: 'ping',
          timestamp: Date.now(),
          payload: { timestamp: Date.now() }
        });
      } else {
        clearInterval(interval);
      }
    }, 30000); // 30 seconds
    
    client.heartbeatInterval = interval;
  }
  
  /**
   * Check if IP is blocked
   */
  private isIPBlocked(clientIp: string): boolean {
    const blockExpiry = this.blockedIPs.get(clientIp);
    if (!blockExpiry) return false;
    
    const now = Date.now();
    if (now < blockExpiry) {
      return true;
    }
    
    // Block expired, remove it
    this.blockedIPs.delete(clientIp);
    this.connectionAttempts.delete(clientIp);
    return false;
  }
  
  /**
   * Handle rate limit violations with progressive blocking
   */
  private handleRateLimitViolation(clientIp: string): void {
    const attempts = (this.connectionAttempts.get(clientIp) || 0) + 1;
    this.connectionAttempts.set(clientIp, attempts);
    
    // Progressive blocking: 1 min, 5 min, 15 min, 1 hour, 24 hours
    const blockDurations = [60000, 300000, 900000, 3600000, 86400000];
    const blockIndex = Math.min(attempts - 1, blockDurations.length - 1);
    
    if (attempts >= 3) { // Start blocking after 3 violations
      const blockDuration = blockDurations[blockIndex];
      const blockExpiry = Date.now() + blockDuration;
      this.blockedIPs.set(clientIp, blockExpiry);
      
      // Only log the first time we block, not on every attempt
      if (attempts === 3) {
        console.warn(`[WS] Blocking IP ${clientIp} for ${blockDuration / 1000} seconds due to repeated rate limit violations`);
      }
    }
  }
  
  /**
   * Check if client IP is rate limited
   */
  private isRateLimited(clientIp: string): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxConnections = 5; // Reduced to 5 connections per minute per IP
    
    const timestamps = this.rateLimitMap.get(clientIp) || [];
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (recentTimestamps.length >= maxConnections) {
      return true;
    }
    
    recentTimestamps.push(now);
    this.rateLimitMap.set(clientIp, recentTimestamps);
    
    // Reset failed attempts on successful connection
    this.connectionAttempts.delete(clientIp);
    
    return false;
  }
  
  /**
   * Update latency metrics with exponential moving average
   */
  private updateLatencyMetrics(latency: number): void {
    const alpha = 0.1; // Smoothing factor
    this.performanceMetrics.avgLatency = this.performanceMetrics.avgLatency === 0 
      ? latency 
      : (alpha * latency) + ((1 - alpha) * this.performanceMetrics.avgLatency);
      
    // Log slow operations
    if (latency > 50) {
      console.warn(`[WS] Slow message processing: ${latency.toFixed(2)}ms`);
    }
  }
  
  /**
   * Start performance monitoring with periodic cleanup
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      // Clean up rate limit map
      const now = Date.now();
      const windowMs = 60000;
      
      for (const [ip, timestamps] of this.rateLimitMap.entries()) {
        const recent = timestamps.filter(ts => now - ts < windowMs);
        if (recent.length === 0) {
          this.rateLimitMap.delete(ip);
        } else {
          this.rateLimitMap.set(ip, recent);
        }
      }
      
      // Log performance metrics every 5 minutes
      console.log(`[WS] Performance: ${this.performanceMetrics.activeConnections} active, ` +
        `${this.performanceMetrics.messageCount} msgs, ` +
        `${this.performanceMetrics.avgLatency.toFixed(2)}ms avg latency, ` +
        `${this.performanceMetrics.rateLimitedConnections} rate limited, ` +
        `${this.performanceMetrics.blockedConnections} blocked`);
      
      // Reset counters
      this.performanceMetrics.rateLimitedConnections = 0;
      this.performanceMetrics.blockedConnections = 0;
        
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  /**
   * Start the WebSocket server
   */
  public start(): void {
    this.httpServer.listen(this.port, () => {
      console.log(`[WS] WebSocket server listening on port ${this.port}`);
    });
  }
  
  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    this.wss.close();
    this.httpServer.close();
    this.connectionManager.cleanup();
    this.agentManager.cleanup();
    console.log('[WS] WebSocket server stopped');
  }
  
  /**
   * Get server statistics
   */
  public getStats(): any {
    return {
      connections: {
        active: this.connectionManager.getConnectionCount(),
        total: this.performanceMetrics.totalConnections,
        max: this.maxConnections,
        authenticated: this.connectionManager.getAuthenticatedClients().length
      },
      agents: {
        count: this.agentManager.getAgentCount(),
        active: this.agentManager.listActiveAgents().length
      },
      performance: {
        messageCount: this.performanceMetrics.messageCount,
        averageLatency: Math.round(this.performanceMetrics.avgLatency * 100) / 100,
        rateLimitEntries: this.rateLimitMap.size
      },
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}