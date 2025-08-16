/**
 * Workflow Coordinator
 * Manages sequential workflow execution with WebSocket integration
 */

import { EventEmitter } from 'events';
import { workflowStateMachine } from './state-machine';
import { WorkflowPersistence } from './persistence';
import { 
  Workflow, 
  Task, 
  WorkflowState, 
  WorkflowStatus 
} from './types';

export interface WorkflowEvent {
  type: 'workflow:created' | 'workflow:updated' | 'workflow:completed' | 
        'task:assigned' | 'task:started' | 'task:completed' | 'task:handoff';
  workflowId: string;
  taskId?: string;
  agentId?: string;
  data: any;
  timestamp: Date;
}

export class WorkflowCoordinator extends EventEmitter {
  private persistence: WorkflowPersistence;
  private activeWorkflows: Map<string, Workflow> = new Map();
  private agentAssignments: Map<string, string> = new Map(); // agentId -> workflowId
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.persistence = new WorkflowPersistence();
  }

  /**
   * Initialize the coordinator and recover workflows from database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[WorkflowCoordinator] Initializing...');
    await this.persistence.initialize();
    
    // Recover active workflows from database
    const recovered = await this.persistence.recoverActiveWorkflows();
    for (const workflow of recovered) {
      this.activeWorkflows.set(workflow.id, workflow);
      console.log(`[WorkflowCoordinator] Recovered workflow: ${workflow.id} - ${workflow.name}`);
    }
    
    this.isInitialized = true;
    console.log(`[WorkflowCoordinator] Initialized with ${recovered.length} active workflows`);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    name: string, 
    tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Workflow> {
    const workflow = workflowStateMachine.createWorkflow(name, tasks);
    
    // Persist to database
    await this.persistence.saveWorkflow(workflow);
    
    // Track active workflow
    this.activeWorkflows.set(workflow.id, workflow);
    
    // Emit event
    this.emitWorkflowEvent({
      type: 'workflow:created',
      workflowId: workflow.id,
      data: workflow,
      timestamp: new Date()
    });
    
    console.log(`[WorkflowCoordinator] Created workflow: ${workflow.id} - ${name}`);
    return workflow;
  }

  /**
   * Assign an agent to a task
   */
  async assignTask(
    workflowId: string, 
    taskId: string, 
    agentId: string
  ): Promise<Task> {
    const task = workflowStateMachine.assignAgent(workflowId, taskId, agentId);
    
    // Update persistence
    await this.persistence.updateTask(workflowId, task);
    
    // Track agent assignment
    this.agentAssignments.set(agentId, workflowId);
    
    // Emit event
    this.emitWorkflowEvent({
      type: 'task:assigned',
      workflowId,
      taskId,
      agentId,
      data: task,
      timestamp: new Date()
    });
    
    console.log(`[WorkflowCoordinator] Assigned task ${taskId} to agent ${agentId}`);
    return task;
  }

  /**
   * Start a task (transition to IN_PROGRESS)
   */
  async startTask(
    workflowId: string, 
    taskId: string, 
    agentId: string
  ): Promise<Task> {
    const task = workflowStateMachine.transitionTask(
      workflowId, 
      taskId, 
      WorkflowState.IN_PROGRESS,
      agentId
    );
    
    // Update persistence
    await this.persistence.updateTask(workflowId, task);
    await this.persistence.recordTransition(
      workflowId, 
      taskId, 
      WorkflowState.PENDING, 
      WorkflowState.IN_PROGRESS,
      agentId
    );
    
    // Emit event
    this.emitWorkflowEvent({
      type: 'task:started',
      workflowId,
      taskId,
      agentId,
      data: task,
      timestamp: new Date()
    });
    
    console.log(`[WorkflowCoordinator] Started task ${taskId} with agent ${agentId}`);
    return task;
  }

  /**
   * Complete a task and handle handoff to next agent
   */
  async completeTask(
    workflowId: string, 
    taskId: string, 
    agentId: string,
    handoffData?: any
  ): Promise<{ completedTask: Task; nextTask?: Task }> {
    // Complete current task
    const completedTask = workflowStateMachine.transitionTask(
      workflowId, 
      taskId, 
      WorkflowState.COMPLETED,
      agentId
    );
    
    // Update persistence
    await this.persistence.updateTask(workflowId, completedTask);
    await this.persistence.recordTransition(
      workflowId, 
      taskId, 
      WorkflowState.IN_PROGRESS, 
      WorkflowState.COMPLETED,
      agentId
    );
    
    // Emit completion event
    this.emitWorkflowEvent({
      type: 'task:completed',
      workflowId,
      taskId,
      agentId,
      data: { task: completedTask, handoffData },
      timestamp: new Date()
    });
    
    // Check for next task
    const workflow = workflowStateMachine.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    // Handle workflow completion
    if (workflow.status === 'completed') {
      await this.handleWorkflowCompletion(workflow);
      return { completedTask };
    }
    
    // Find next task for handoff
    const nextTask = workflow.currentTaskId 
      ? workflow.tasks.get(workflow.currentTaskId)
      : undefined;
    
    if (nextTask) {
      // Emit handoff event
      this.emitWorkflowEvent({
        type: 'task:handoff',
        workflowId,
        taskId: nextTask.id,
        agentId: nextTask.assignedAgent,
        data: { 
          fromTask: completedTask, 
          toTask: nextTask,
          handoffData 
        },
        timestamp: new Date()
      });
      
      console.log(`[WorkflowCoordinator] Handoff from ${taskId} to ${nextTask.id}`);
    }
    
    return { completedTask, nextTask };
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    return workflowStateMachine.getWorkflowStatus(workflowId);
  }

  /**
   * Get all active workflows
   */
  async getActiveWorkflows(): Promise<Workflow[]> {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get tasks assigned to an agent
   */
  async getAgentTasks(agentId: string): Promise<Task[]> {
    return workflowStateMachine.getTasksForAgent(agentId);
  }

  /**
   * Handle agent disconnect - pause assigned tasks
   */
  async handleAgentDisconnect(agentId: string): Promise<void> {
    const workflowId = this.agentAssignments.get(agentId);
    if (!workflowId) return;
    
    const tasks = await this.getAgentTasks(agentId);
    for (const task of tasks) {
      if (task.state === WorkflowState.IN_PROGRESS) {
        await this.pauseTask(workflowId, task.id, agentId, 'Agent disconnected');
      }
    }
    
    this.agentAssignments.delete(agentId);
  }

  /**
   * Pause a task
   */
  private async pauseTask(
    workflowId: string, 
    taskId: string, 
    agentId: string,
    reason: string
  ): Promise<Task> {
    const task = workflowStateMachine.transitionTask(
      workflowId, 
      taskId, 
      WorkflowState.BLOCKED,
      agentId,
      reason
    );
    
    await this.persistence.updateTask(workflowId, task);
    console.log(`[WorkflowCoordinator] Paused task ${taskId}: ${reason}`);
    return task;
  }

  /**
   * Handle workflow completion
   */
  private async handleWorkflowCompletion(workflow: Workflow): Promise<void> {
    // Update persistence
    await this.persistence.updateWorkflowStatus(workflow.id, 'completed');
    
    // Remove from active workflows
    this.activeWorkflows.delete(workflow.id);
    
    // Emit completion event
    this.emitWorkflowEvent({
      type: 'workflow:completed',
      workflowId: workflow.id,
      data: workflow,
      timestamp: new Date()
    });
    
    console.log(`[WorkflowCoordinator] Workflow completed: ${workflow.id}`);
  }

  /**
   * Emit workflow event
   */
  private emitWorkflowEvent(event: WorkflowEvent): void {
    this.emit('workflow:event', event);
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[WorkflowCoordinator] Shutting down...');
    await this.persistence.close();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const workflowCoordinator = new WorkflowCoordinator();