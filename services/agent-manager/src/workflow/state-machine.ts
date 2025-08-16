import { v4 as uuidv4 } from 'uuid';
import { 
  Workflow, 
  Task, 
  WorkflowState, 
  StateTransition, 
  WorkflowStatus 
} from './types';

export class WorkflowStateMachine {
  private workflows: Map<string, Workflow> = new Map();
  private transitions: StateTransition[] = [];

  // Valid state transitions
  private validTransitions: Map<WorkflowState, WorkflowState[]> = new Map([
    [WorkflowState.PENDING, [WorkflowState.IN_PROGRESS, WorkflowState.BLOCKED]],
    [WorkflowState.IN_PROGRESS, [WorkflowState.REVIEW, WorkflowState.BLOCKED, WorkflowState.COMPLETED]],
    [WorkflowState.REVIEW, [WorkflowState.IN_PROGRESS, WorkflowState.COMPLETED, WorkflowState.BLOCKED]],
    [WorkflowState.BLOCKED, [WorkflowState.PENDING, WorkflowState.IN_PROGRESS]],
    [WorkflowState.COMPLETED, []], // Terminal state
  ]);

  createWorkflow(name: string, tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]): Workflow {
    const workflowId = uuidv4();
    const now = new Date();
    
    const taskMap = new Map<string, Task>();
    const taskIds: string[] = [];

    for (const taskData of tasks) {
      const taskId = uuidv4();
      taskIds.push(taskId);
      
      const task: Task = {
        ...taskData,
        id: taskId,
        state: taskData.state || WorkflowState.PENDING,
        createdAt: now,
        updatedAt: now,
      };
      
      taskMap.set(taskId, task);
    }

    const workflow: Workflow = {
      id: workflowId,
      name,
      tasks: taskMap,
      currentTaskId: taskIds[0], // Start with first task
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  transitionTask(
    workflowId: string, 
    taskId: string, 
    newState: WorkflowState,
    agentId?: string,
    reason?: string
  ): Task {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const task = workflow.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in workflow ${workflowId}`);
    }

    // Check if transition is valid
    const allowedTransitions = this.validTransitions.get(task.state);
    if (!allowedTransitions?.includes(newState)) {
      throw new Error(
        `Invalid transition from ${task.state} to ${newState} for task ${taskId}`
      );
    }

    // Check dependencies if moving to IN_PROGRESS
    if (newState === WorkflowState.IN_PROGRESS && task.dependencies) {
      for (const depId of task.dependencies) {
        const depTask = workflow.tasks.get(depId);
        if (depTask && depTask.state !== WorkflowState.COMPLETED) {
          throw new Error(
            `Cannot start task ${taskId}: dependency ${depId} is not completed`
          );
        }
      }
    }

    // Record transition
    const transition: StateTransition = {
      from: task.state,
      to: newState,
      taskId,
      workflowId,
      agentId,
      timestamp: new Date(),
      reason,
    };
    this.transitions.push(transition);

    // Update task state
    task.state = newState;
    task.updatedAt = new Date();
    
    // Update current task if this one is completed
    if (newState === WorkflowState.COMPLETED) {
      this.advanceWorkflow(workflow);
    }

    workflow.updatedAt = new Date();
    return task;
  }

  assignAgent(workflowId: string, taskId: string, agentId: string): Task {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const task = workflow.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in workflow ${workflowId}`);
    }

    task.assignedAgent = agentId;
    task.updatedAt = new Date();
    workflow.updatedAt = new Date();

    return task;
  }

  getWorkflowStatus(workflowId: string): WorkflowStatus {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const tasks = Array.from(workflow.tasks.values());
    const completedTasks = tasks.filter(t => t.state === WorkflowState.COMPLETED).length;
    const blockedTasks = tasks
      .filter(t => t.state === WorkflowState.BLOCKED)
      .map(t => t.id);

    const currentTask = workflow.currentTaskId 
      ? workflow.tasks.get(workflow.currentTaskId)
      : undefined;

    return {
      workflow,
      completedTasks,
      totalTasks: tasks.length,
      blockedTasks,
      currentAgent: currentTask?.assignedAgent,
      progress: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
    };
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getTasksForAgent(agentId: string): Task[] {
    const tasks: Task[] = [];
    
    for (const workflow of this.workflows.values()) {
      for (const task of workflow.tasks.values()) {
        if (task.assignedAgent === agentId) {
          tasks.push(task);
        }
      }
    }
    
    return tasks;
  }

  getTransitionHistory(workflowId?: string, taskId?: string): StateTransition[] {
    return this.transitions.filter(t => 
      (!workflowId || t.workflowId === workflowId) &&
      (!taskId || t.taskId === taskId)
    );
  }

  private advanceWorkflow(workflow: Workflow): void {
    const tasks = Array.from(workflow.tasks.values());
    
    // Find next pending task that isn't blocked
    const nextTask = tasks.find(t => 
      t.state === WorkflowState.PENDING &&
      (!t.dependencies || t.dependencies.every(depId => {
        const dep = workflow.tasks.get(depId);
        return dep && dep.state === WorkflowState.COMPLETED;
      }))
    );

    if (nextTask) {
      workflow.currentTaskId = nextTask.id;
    } else {
      // Check if all tasks are completed
      const allCompleted = tasks.every(t => t.state === WorkflowState.COMPLETED);
      if (allCompleted) {
        workflow.status = 'completed';
        workflow.currentTaskId = undefined;
      }
    }
  }

  // Utility method to check if a task can be started
  canStartTask(workflowId: string, taskId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const task = workflow.tasks.get(taskId);
    if (!task) return false;

    // Check if task is in a startable state
    if (task.state !== WorkflowState.PENDING) return false;

    // Check dependencies
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        const depTask = workflow.tasks.get(depId);
        if (!depTask || depTask.state !== WorkflowState.COMPLETED) {
          return false;
        }
      }
    }

    return true;
  }
}

// Export singleton instance
export const workflowStateMachine = new WorkflowStateMachine();