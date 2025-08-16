import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { workflowStateMachine } from './state-machine';
import { WorkflowState, Task } from './types';

interface CreateWorkflowBody {
  name: string;
  tasks: Array<{
    name: string;
    description?: string;
    state?: WorkflowState;
    dependencies?: string[];
    metadata?: Record<string, any>;
  }>;
}

interface TransitionTaskBody {
  newState: WorkflowState;
  agentId?: string;
  reason?: string;
}

interface AssignAgentBody {
  agentId: string;
}

export async function registerWorkflowRoutes(fastify: FastifyInstance) {
  // Create a new workflow
  fastify.post('/api/workflows', async (
    request: FastifyRequest<{ Body: CreateWorkflowBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { name, tasks } = request.body;
      const formattedTasks = tasks.map(task => ({
        ...task,
        state: task.state || WorkflowState.PENDING
      }));
      const workflow = workflowStateMachine.createWorkflow(name, formattedTasks);
      
      // Convert Map to object for JSON serialization
      const workflowData = {
        ...workflow,
        tasks: Array.from(workflow.tasks.entries()).reduce((acc, [id, task]) => {
          acc[id] = task;
          return acc;
        }, {} as Record<string, Task>)
      };
      
      return reply.code(201).send(workflowData);
    } catch (error) {
      return reply.code(400).send({ 
        error: error instanceof Error ? error.message : 'Failed to create workflow' 
      });
    }
  });

  // Get all workflows
  fastify.get('/api/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workflows = workflowStateMachine.getAllWorkflows();
      
      // Convert Maps to objects for JSON serialization
      const workflowsData = workflows.map(workflow => ({
        ...workflow,
        tasks: Array.from(workflow.tasks.entries()).reduce((acc, [id, task]) => {
          acc[id] = task;
          return acc;
        }, {} as Record<string, Task>)
      }));
      
      return reply.send(workflowsData);
    } catch (error) {
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to get workflows' 
      });
    }
  });

  // Get a specific workflow
  fastify.get('/api/workflows/:workflowId', async (
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId } = request.params;
      const workflow = workflowStateMachine.getWorkflow(workflowId);
      
      if (!workflow) {
        return reply.code(404).send({ error: 'Workflow not found' });
      }
      
      // Convert Map to object for JSON serialization
      const workflowData = {
        ...workflow,
        tasks: Array.from(workflow.tasks.entries()).reduce((acc, [id, task]) => {
          acc[id] = task;
          return acc;
        }, {} as Record<string, Task>)
      };
      
      return reply.send(workflowData);
    } catch (error) {
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to get workflow' 
      });
    }
  });

  // Get workflow status
  fastify.get('/api/workflows/:workflowId/status', async (
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId } = request.params;
      const status = workflowStateMachine.getWorkflowStatus(workflowId);
      
      // Convert Map to object for JSON serialization
      const statusData = {
        ...status,
        workflow: {
          ...status.workflow,
          tasks: Array.from(status.workflow.tasks.entries()).reduce((acc, [id, task]) => {
            acc[id] = task;
            return acc;
          }, {} as Record<string, Task>)
        }
      };
      
      return reply.send(statusData);
    } catch (error) {
      return reply.code(404).send({ 
        error: error instanceof Error ? error.message : 'Workflow not found' 
      });
    }
  });

  // Transition a task to a new state
  fastify.post('/api/workflows/:workflowId/tasks/:taskId/transition', async (
    request: FastifyRequest<{ 
      Params: { workflowId: string; taskId: string };
      Body: TransitionTaskBody;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId, taskId } = request.params;
      const { newState, agentId, reason } = request.body;
      
      const task = workflowStateMachine.transitionTask(
        workflowId, 
        taskId, 
        newState, 
        agentId, 
        reason
      );
      
      return reply.send(task);
    } catch (error) {
      return reply.code(400).send({ 
        error: error instanceof Error ? error.message : 'Failed to transition task' 
      });
    }
  });

  // Assign an agent to a task
  fastify.post('/api/workflows/:workflowId/tasks/:taskId/assign', async (
    request: FastifyRequest<{ 
      Params: { workflowId: string; taskId: string };
      Body: AssignAgentBody;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId, taskId } = request.params;
      const { agentId } = request.body;
      
      const task = workflowStateMachine.assignAgent(workflowId, taskId, agentId);
      
      return reply.send(task);
    } catch (error) {
      return reply.code(400).send({ 
        error: error instanceof Error ? error.message : 'Failed to assign agent' 
      });
    }
  });

  // Get tasks for a specific agent
  fastify.get('/api/agents/:agentId/tasks', async (
    request: FastifyRequest<{ Params: { agentId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { agentId } = request.params;
      const tasks = workflowStateMachine.getTasksForAgent(agentId);
      
      return reply.send(tasks);
    } catch (error) {
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to get agent tasks' 
      });
    }
  });

  // Get transition history
  fastify.get('/api/workflows/:workflowId/transitions', async (
    request: FastifyRequest<{ 
      Params: { workflowId: string };
      Querystring: { taskId?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId } = request.params;
      const { taskId } = request.query;
      
      const transitions = workflowStateMachine.getTransitionHistory(workflowId, taskId);
      
      return reply.send(transitions);
    } catch (error) {
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to get transitions' 
      });
    }
  });

  // Check if a task can be started
  fastify.get('/api/workflows/:workflowId/tasks/:taskId/can-start', async (
    request: FastifyRequest<{ Params: { workflowId: string; taskId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId, taskId } = request.params;
      const canStart = workflowStateMachine.canStartTask(workflowId, taskId);
      
      return reply.send({ canStart });
    } catch (error) {
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to check task' 
      });
    }
  });
}