/**
 * Workflow Persistence Layer
 * Handles PostgreSQL storage and recovery of workflow state
 */

import { Pool, PoolClient } from 'pg';
import { Workflow, Task, WorkflowState } from './types';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'team_dashboard',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export class WorkflowPersistence {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor() {
    this.pool = new Pool(DB_CONFIG);
  }

  /**
   * Initialize database connection and create tables if needed
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.createTables();
      this.isInitialized = true;
      console.log('[WorkflowPersistence] Database initialized');
    } catch (error) {
      console.error('[WorkflowPersistence] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create necessary tables if they don't exist
   */
  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Workflows table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          current_task_id VARCHAR(255),
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          metadata JSONB
        )
      `);
      
      // Tasks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(255) PRIMARY KEY,
          workflow_id VARCHAR(255) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          state VARCHAR(50) NOT NULL,
          assigned_agent VARCHAR(255),
          dependencies TEXT[],
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)
      `);
      
      // State transitions table for audit
      await client.query(`
        CREATE TABLE IF NOT EXISTS state_transitions (
          id SERIAL PRIMARY KEY,
          workflow_id VARCHAR(255) NOT NULL,
          task_id VARCHAR(255) NOT NULL,
          from_state VARCHAR(50) NOT NULL,
          to_state VARCHAR(50) NOT NULL,
          agent_id VARCHAR(255),
          reason TEXT,
          timestamp TIMESTAMP NOT NULL
        )
      `);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save a workflow to the database
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert workflow
      await client.query(
        `INSERT INTO workflows (id, name, status, current_task_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          workflow.id,
          workflow.name,
          workflow.status,
          workflow.currentTaskId,
          workflow.createdAt,
          workflow.updatedAt
        ]
      );
      
      // Insert tasks
      for (const [_, task] of workflow.tasks) {
        await client.query(
          `INSERT INTO tasks (
            id, workflow_id, name, description, state, assigned_agent, 
            dependencies, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            task.id,
            workflow.id,
            task.name,
            task.description,
            task.state,
            task.assignedAgent,
            task.dependencies || [],
            JSON.stringify(task.metadata || {}),
            task.createdAt,
            task.updatedAt
          ]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a task in the database
   */
  async updateTask(workflowId: string, task: Task): Promise<void> {
    await this.pool.query(
      `UPDATE tasks 
       SET state = $1, assigned_agent = $2, metadata = $3, updated_at = $4
       WHERE id = $5 AND workflow_id = $6`,
      [
        task.state,
        task.assignedAgent,
        JSON.stringify(task.metadata || {}),
        task.updatedAt,
        task.id,
        workflowId
      ]
    );
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    workflowId: string, 
    status: 'active' | 'completed' | 'paused'
  ): Promise<void> {
    await this.pool.query(
      `UPDATE workflows 
       SET status = $1, updated_at = $2
       WHERE id = $3`,
      [status, new Date(), workflowId]
    );
  }

  /**
   * Record a state transition
   */
  async recordTransition(
    workflowId: string,
    taskId: string,
    fromState: WorkflowState,
    toState: WorkflowState,
    agentId?: string,
    reason?: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO state_transitions 
       (workflow_id, task_id, from_state, to_state, agent_id, reason, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [workflowId, taskId, fromState, toState, agentId, reason, new Date()]
    );
  }

  /**
   * Recover active workflows from database
   */
  async recoverActiveWorkflows(): Promise<Workflow[]> {
    const client = await this.pool.connect();
    
    try {
      // Get active workflows
      const workflowsResult = await client.query(
        `SELECT * FROM workflows WHERE status = 'active'`
      );
      
      const workflows: Workflow[] = [];
      
      for (const row of workflowsResult.rows) {
        // Get tasks for this workflow
        const tasksResult = await client.query(
          `SELECT * FROM tasks WHERE workflow_id = $1`,
          [row.id]
        );
        
        // Reconstruct workflow
        const tasks = new Map<string, Task>();
        for (const taskRow of tasksResult.rows) {
          tasks.set(taskRow.id, {
            id: taskRow.id,
            name: taskRow.name,
            description: taskRow.description,
            state: taskRow.state as WorkflowState,
            assignedAgent: taskRow.assigned_agent,
            dependencies: taskRow.dependencies,
            metadata: taskRow.metadata,
            createdAt: taskRow.created_at,
            updatedAt: taskRow.updated_at
          });
        }
        
        workflows.push({
          id: row.id,
          name: row.name,
          tasks,
          currentTaskId: row.current_task_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: row.status
        });
      }
      
      return workflows;
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const client = await this.pool.connect();
    
    try {
      const workflowResult = await client.query(
        `SELECT * FROM workflows WHERE id = $1`,
        [workflowId]
      );
      
      if (workflowResult.rows.length === 0) {
        return null;
      }
      
      const row = workflowResult.rows[0];
      
      // Get tasks
      const tasksResult = await client.query(
        `SELECT * FROM tasks WHERE workflow_id = $1`,
        [workflowId]
      );
      
      const tasks = new Map<string, Task>();
      for (const taskRow of tasksResult.rows) {
        tasks.set(taskRow.id, {
          id: taskRow.id,
          name: taskRow.name,
          description: taskRow.description,
          state: taskRow.state as WorkflowState,
          assignedAgent: taskRow.assigned_agent,
          dependencies: taskRow.dependencies,
          metadata: taskRow.metadata,
          createdAt: taskRow.created_at,
          updatedAt: taskRow.updated_at
        });
      }
      
      return {
        id: row.id,
        name: row.name,
        tasks,
        currentTaskId: row.current_task_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get transition history
   */
  async getTransitionHistory(
    workflowId?: string, 
    taskId?: string
  ): Promise<any[]> {
    let query = 'SELECT * FROM state_transitions WHERE 1=1';
    const params: any[] = [];
    
    if (workflowId) {
      params.push(workflowId);
      query += ` AND workflow_id = $${params.length}`;
    }
    
    if (taskId) {
      params.push(taskId);
      query += ` AND task_id = $${params.length}`;
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}