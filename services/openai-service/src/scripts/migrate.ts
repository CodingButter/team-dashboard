#!/usr/bin/env node

import { DatabaseConnection, createDatabaseConfig } from '../database/connection';

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  const config = createDatabaseConfig();
  const db = new DatabaseConnection(config);
  
  try {
    console.log(`📡 Connecting to database: ${config.host}:${config.port}/${config.database}`);
    
    const isConnected = await db.checkConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    
    console.log('✅ Database connection established');
    
    await db.runMigrations();
    
    console.log('🎉 All migrations completed successfully!');
    
    // Verify tables were created
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('conversations', 'messages', 'conversation_branches', 'schema_migrations')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Show migration history
    const migrations = await db.query(`
      SELECT version, executed_at 
      FROM schema_migrations 
      ORDER BY executed_at DESC
    `);
    
    console.log('📝 Migration history:');
    migrations.forEach(migration => {
      console.log(`  - ${migration.version} (${migration.executed_at})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Check if script is run directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runMigrations };