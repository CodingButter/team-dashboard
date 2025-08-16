/**
 * WebSocket Workflow Handler
 * Handles workflow-related WebSocket messages and events
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { workflowCoordinator, WorkflowEvent } from '../workflow/coordinator';
import { WorkflowState } from '../workflow/types';
import { ConnectionManager } from './connection';

export interface WorkflowMessage {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
  metadata?: {
    correlationId?: string;
    agentId?: string;
    workflowId?: string;
  };
}

export class WorkflowWebSocketHandler {
  private connectionManager: ConnectionManager;
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.setupEventListeners();
  }

  /**
   * Initialize the workflow handler
   */
  async initialize(): Promise<void> {
    await workflowCoordinator.initialize();
    console.log('[WorkflowWebSocketHandler] Initialized');
  }

  /**
   * Setup event listeners for workflow coordinator
   */
  private setupEventListeners(): void {
    workflowCoordinator.on('workflow:event', (event: WorkflowEvent) => {
      this.broadcastWorkflowEvent(event);
    });
  }

  /**
   * Handle incoming workflow message
   */
  async handleMessage(client: any, message: WorkflowMessage): Promise<void> {
    const { type, payload, metadata } = message;
    
    try {
      switch (type) {
        case 'workflow:create':
          await this.handleCreateWorkflow(client, payload, message.id);
          break;
          
        case 'workflow:assign':
          await this.handleAssignTask(client, payload, message.id);
          break;
          
        case 'workflow:start':
          await this.handleStartTask(client, payload, message.id);
          break;
          
        case 'workflow:complete':
          await this.handleCompleteTask(client, payload, message.id);
          break;
          
        case 'workflow:status':
          await this.handleGetStatus(client, payload, message.id);
          break;
          
        case 'workflow:list':
          await this.handleListWorkflows(client, message.id);
          break;
          
        case 'workflow:agent:tasks':
          await this.handleGetAgentTasks(client, payload, message.id);
          break;
          
        default:
          console.warn(`[WorkflowWebSocketHandler] Unknown message type: ${type}`);
      }
    } catch (error) {
      this.sendError(client, message.id, error);
    }
  }

  /**
   * Handle create workflow request
   */
  private async handleCreateWorkflow(
    client: any, 
    payload: any, 
    messageId: string
  ): Promise<void> {
    const { name, tasks } = payload;
    
    if (!name || !tasks || !Array.isArray(tasks)) {
      throw new Error('Invalid workflow creation request');
    }
    
    const workflow = await workflowCoordinator.createWorkflow(name, tasks);
    
    this.sendResponse(client, messageId, {
      type: 'workflow:created',
      payload: {
        workflow: this.serializeWorkflow(workflow)
      }
    });
  }

  /**
   * Handle assign task request
   */
  private async handleAssignTask(
    client: any, 
    payload: any, 
    messageId: string
  ): Promise<void> {
    const { workflowId, taskId, agentId } = payload;
    
    if (!workflowId || !taskId || !agentId) {
      throw new Error('Invalid task assignment request');
    }
    
    const task = await workflowCoordinator.assignTask(workflowId, taskId, agentId);
    
    this.sendResponse(client, messageId, {
      type: 'workflow:assigned',
      payload: { task }
    });
  }

  /**
   * Handle start task request
   */
  private async handleStartTask(
    client: any, 
    payload: any, 
    messageId: string
  ): Promise<void> {
    const { workflowId, taskId, agentId } = payload;
    
    if (!workflowId || !taskId || !agentId) {
      throw new Error('Invalid start task request');
    }
    
    const task = await workflowCoordinator.startTask(workflowId, taskId, agentId);
    
    this.sendResponse(client, messageId, {
      type: 'workflow:started',
      payload: { task }
    });
    
    // Notify agent to start work
    this.notifyAgent(agentId, {
      type: 'task:begin',
      payload: { 
        workflowId, 
        task,
        instructions: payload.instructions 
      }
    });
  }

  /**
   * Handle complete task request
   */
  private async handleCompleteTask(
    client: any, 
    payload: any, 
    messageId: string
  ): Promise<void> {
    const { workflowId, taskId, agentId, handoffData } = payload;
    
    if (!workflowId || !taskId || !agentId) {
      throw new Error('Invalid complete task request');
    }
    
    const result = await workflowCoordinator.completeTask(
      workflowId, 
      taskId, 
      agentId,
      handoffData
    );
    
    this.sendResponse(client, messageId, {
      type: 'workflow:completed',
      payload: result
    });
    
    // Handle handoff to next agent
    if (result.nextTask && result.nextTask.assignedAgent) {
      this.notifyAgent(result.nextTask.assignedAgent, {
        type: 'task:handoff',
        payload: {
          workflowId,
          task: result.nextTask,
          previousTask: result.completedTask,
          handoffData
        }
      });
    }
  }

  /**
   * Handle get workflow status request
   */
  private async handleGetStatus(
    client: any, 
    payload: any, 
    messageId: string
  ): Promise<void> {
    const { workflowId } = payload;
    
    if (!workflowId) {
      throw new Error('Invalid status request');
    }
    
    const status = await workflowCoordinator.getWorkflowStatus(workflowId);
    
    this.sendResponse(client, messageId, {
      type: 'workflow:status',
      payload: {
        ...status,
        workflow: this.serializeWorkflow(status.workflow)
      }
    });
  }

  /**
   * Handle list workflows request
   */
  private async handleListWorkflows(
    client: any, 
    messageId: string
  ): Promise<void> {
    const workflows = await workflowCoordinator.getActiveWorkflows();
    
    this.sendResponse(client, messageId, {
      type: 'workflow:list',
      payload: {
        workflows: workflows.map(w => this.serializeWorkflow(w))
      }
    });
  }

  /**
   * Handle get agent tasks request
   */
  private async handleGetAgentTasks(
    client: any, 
    payload: any, 
    messageId: string
  ): Promise<void> {
    const { agentId } = payload;
    
    if (!agentId) {
      throw new Error('Invalid agent tasks request');
    }
    
    const tasks = await workflowCoordinator.getAgentTasks(agentId);
    
    this.sendResponse(client, messageId, {
      type: 'workflow:agent:tasks',
      payload: { tasks }
    });
  }

  /**
   * Handle agent disconnect
   */
  async handleAgentDisconnect(agentId: string): Promise<void> {
    await workflowCoordinator.handleAgentDisconnect(agentId);
  }

  /**
   * Broadcast workflow event to all connected clients
   */
  private broadcastWorkflowEvent(event: WorkflowEvent): void {
    const message = {
      id: uuidv4(),
      type: 'workflow:event',
      timestamp: Date.now(),
      payload: event
    };
    
    this.connectionManager.broadcast(message);
  }

  /**
   * Notify specific agent
   */
  private notifyAgent(agentId: string, message: any): void {
    const client = this.connectionManager.getClientByAgentId(agentId);
    if (client) {
      client.send({
        id: uuidv4(),
        ...message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send response to client
   */
  private sendResponse(client: any, correlationId: string, response: any): void {
    client.send({
      id: uuidv4(),
      ...response,
      timestamp: Date.now(),
      metadata: {
        correlationId
      }
    });
  }

  /**
   * Send error to client
   */
  private sendError(client: any, correlationId: string, error: any): void {
    client.send({
      id: uuidv4(),
      type: 'workflow:error',
      timestamp: Date.now(),
      payload: {
        error: error.message || 'Unknown error',
        details: error.stack
      },
      metadata: {
        correlationId
      }
    });
  }

  /**
   * Serialize workflow for transmission (convert Map to object)
   */
  private serializeWorkflow(workflow: any): any {
    return {
      ...workflow,
      tasks: Array.from(workflow.tasks.entries()).map(([id, task]) => ({
        id,
        ...task
      }))
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    await workflowCoordinator.shutdown();
  }
}

// Export for use in WebSocket server
export default WorkflowWebSocketHandler;