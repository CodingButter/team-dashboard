/**
 * Database Manager
 * PostgreSQL connection management with enterprise features
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger, performanceLogger } from './logger.js';
import type { Config } from '../config/index.js';

export class DatabaseManager {
  private pool: Pool;
  private config: Config['database'];
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: Config['database']) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      application_name: 'sso-service'
    });

    // Setup pool event handlers
    this.setupPoolEventHandlers();
  }

  async connect(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connected successfully', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });

      // Start health check
      this.startHealthCheck();

      // Run migrations if needed
      await this.runMigrations();

    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      await this.pool.end();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    const client = await this.pool.connect();

    try {
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        performanceLogger.slowQuery(text, duration, { params });
      }

      logger.debug('Database query executed', {
        sql: text,
        params,
        duration,
        rowCount: result.rowCount
      });

      return result;
    } catch (error) {
      logger.error('Database query error:', {
        sql: text,
        params,
        error: error.message,
        duration: Date.now() - start
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  private setupPoolEventHandlers(): void {
    this.pool.on('connect', (client) => {
      logger.debug('Database client connected', {
        processID: client.processID,
        secretKey: client.secretKey
      });
    });

    this.pool.on('acquire', (client) => {
      logger.debug('Database client acquired', {
        processID: client.processID
      });
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database client removed', {
        processID: client.processID
      });
    });

    this.pool.on('error', (error, client) => {
      logger.error('Database pool error:', {
        error: error.message,
        processID: client?.processID
      });
    });
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        logger.error('Database health check failed');
      }
    }, 30000); // Check every 30 seconds
  }

  private async runMigrations(): Promise<void> {
    try {
      // Create migrations table if not exists
      await this.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Basic SSO tables
      await this.createSSOTables();

      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Migration error:', error);
      throw error;
    }
  }

  private async createSSOTables(): Promise<void> {
    // Create tenants table
    await this.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL UNIQUE,
        subdomain VARCHAR(100),
        custom_domain VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        configuration JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create SSO providers table
    await this.query(`
      CREATE TABLE IF NOT EXISTS sso_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        configuration JSONB NOT NULL DEFAULT '{}',
        metadata JSONB NOT NULL DEFAULT '{}',
        attribute_mapping JSONB NOT NULL DEFAULT '{}',
        validation_rules JSONB NOT NULL DEFAULT '{}',
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, name)
      )
    `);

    // Create enterprise users table
    await this.query(`
      CREATE TABLE IF NOT EXISTS enterprise_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
        external_id VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        display_name VARCHAR(255),
        groups TEXT[],
        roles TEXT[],
        permissions TEXT[],
        attributes JSONB DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        last_login TIMESTAMP WITH TIME ZONE,
        compliance_flags JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, email),
        UNIQUE(tenant_id, username)
      )
    `);

    // Create enterprise sessions table
    await this.query(`
      CREATE TABLE IF NOT EXISTS enterprise_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES enterprise_users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'sso',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        ip_address INET,
        user_agent TEXT,
        device_fingerprint VARCHAR(255),
        risk_score INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Create audit logs table for compliance
    await this.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
        user_id UUID REFERENCES enterprise_users(id) ON DELETE SET NULL,
        session_id UUID REFERENCES enterprise_sessions(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        outcome VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        details JSONB DEFAULT '{}',
        risk_score INTEGER DEFAULT 0,
        compliance_flags TEXT[],
        correlation_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create security policies table
    await this.query(`
      CREATE TABLE IF NOT EXISTS security_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        configuration JSONB NOT NULL DEFAULT '{}',
        enforced BOOLEAN NOT NULL DEFAULT true,
        exceptions TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, name)
      )
    `);

    // Create compliance reports table
    await this.query(`
      CREATE TABLE IF NOT EXISTS compliance_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        framework VARCHAR(100) NOT NULL,
        report_data JSONB NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        period_end TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Create indexes for performance
    await this.query(`CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_sso_providers_tenant ON sso_providers(tenant_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_enterprise_users_tenant ON enterprise_users(tenant_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_enterprise_users_email ON enterprise_users(email)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_enterprise_sessions_user ON enterprise_sessions(user_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_enterprise_sessions_status ON enterprise_sessions(status)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_security_policies_tenant ON security_policies(tenant_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant ON compliance_reports(tenant_id)`);
  }
}