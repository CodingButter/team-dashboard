/**
 * Enterprise SSO Service
 * Provides SAML 2.0, LDAP, multi-tenant authentication with compliance features
 */

import { config } from './config/index.js';
import { SSOServer } from './server.js';
import { logger } from './utils/logger.js';
import { DatabaseManager } from './utils/database.js';
import { RedisManager } from './utils/redis.js';
import { ComplianceManager } from './compliance/compliance-manager.js';

class SSOService {
  private server: SSOServer;
  private database: DatabaseManager;
  private redis: RedisManager;
  private compliance: ComplianceManager;

  constructor() {
    this.database = new DatabaseManager(config.database);
    this.redis = new RedisManager(config.redis);
    this.compliance = new ComplianceManager(config.compliance);
    this.server = new SSOServer(config.server, {
      database: this.database,
      redis: this.redis,
      compliance: this.compliance
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Enterprise SSO Service...');
      
      // Initialize database connections
      await this.database.connect();
      logger.info('Database connected successfully');
      
      // Initialize Redis connections
      await this.redis.connect();
      logger.info('Redis connected successfully');
      
      // Initialize compliance systems
      await this.compliance.initialize();
      logger.info('Compliance systems initialized');
      
      // Start the HTTP server
      await this.server.start();
      logger.info(`SSO Service started on port ${config.server.port}`);
      
      // Log successful startup
      await this.compliance.auditLog({
        eventType: 'system_startup',
        action: 'service_started',
        resource: 'sso_service',
        outcome: 'success',
        details: {
          version: '1.0.0',
          port: config.server.port,
          environment: config.server.environment
        }
      });
      
    } catch (error) {
      logger.error('Failed to start SSO Service:', error);
      await this.stop();
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping Enterprise SSO Service...');
      
      // Stop HTTP server
      await this.server.stop();
      
      // Close database connections
      await this.database.disconnect();
      
      // Close Redis connections
      await this.redis.disconnect();
      
      logger.info('SSO Service stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping SSO Service:', error);
    }
  }

  // Graceful shutdown handling
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        await this.stop();
        process.exit(0);
      });
    });
    
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled Rejection:', reason);
      await this.stop();
      process.exit(1);
    });
  }
}

// Start the service
const ssoService = new SSOService();
ssoService.setupGracefulShutdown();

// Start the service
ssoService.start().catch((error) => {
  logger.error('Failed to start SSO Service:', error);
  process.exit(1);
});

export { SSOService };