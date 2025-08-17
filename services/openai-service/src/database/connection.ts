import { Pool, PoolConfig } from 'pg';
import fs from 'fs/promises';
import path from 'path';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseConnection {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (error: Error) => {
      console.error('Unexpected database error:', error);
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (query: (text: string, params?: any[]) => Promise<any[]>) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const transactionQuery = async (text: string, params?: any[]) => {
        const result = await client.query(text, params);
        return result.rows;
      };
      
      const result = await callback(transactionQuery);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    console.log('Running database migrations...');
    
    // Create migrations table if it doesn't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    try {
      const migrationFiles = await fs.readdir(migrationsDir);
      const sqlFiles = migrationFiles
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of sqlFiles) {
        const version = file.replace('.sql', '');
        
        // Check if migration already executed
        const existing = await this.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [version]
        );

        if (existing.length === 0) {
          console.log(`Running migration: ${file}`);
          const migrationSQL = await fs.readFile(
            path.join(migrationsDir, file),
            'utf-8'
          );

          await this.transaction(async (query) => {
            // Execute migration
            await query(migrationSQL);
            
            // Record migration
            await query(
              'INSERT INTO schema_migrations (version) VALUES ($1)',
              [version]
            );
          });

          console.log(`Migration completed: ${file}`);
        }
      }
    } catch (error) {
      console.error('Migration directory not found or error reading migrations:', error);
    }

    console.log('Migrations completed successfully');
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  async getStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    waitingConnections: number;
  }> {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingConnections: this.pool.waitingCount,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Default database configuration from environment
export function createDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'team_dashboard',
    username: process.env.POSTGRES_USER || 'dashboard_user',
    password: process.env.POSTGRES_PASSWORD || 'dashboard_pass',
    ssl: process.env.POSTGRES_SSL === 'true',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '5000'),
  };
}