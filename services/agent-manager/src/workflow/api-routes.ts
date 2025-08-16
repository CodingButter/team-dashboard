/**
 * Workflow API Routes
 * HTTP endpoints for workflow management and dashboard
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { workflowCoordinator } from './coordinator';
import { WorkflowState } from './types';

export async function registerWorkflowRoutes(app: FastifyInstance) {
  // Get all active workflows
  app.get('/api/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workflows = await workflowCoordinator.getActiveWorkflows();
      const serialized = workflows.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        currentTaskId: w.currentTaskId,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        tasks: Array.from(w.tasks.entries()).map(([id, task]) => ({
          id,
          ...task
        }))
      }));
      
      return reply.send({
        success: true,
        data: serialized
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get workflow status
  app.get('/api/workflows/:workflowId/status', async (
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const status = await workflowCoordinator.getWorkflowStatus(request.params.workflowId);
      
      return reply.send({
        success: true,
        data: {
          ...status,
          workflow: {
            id: status.workflow.id,
            name: status.workflow.name,
            status: status.workflow.status,
            currentTaskId: status.workflow.currentTaskId,
            createdAt: status.workflow.createdAt,
            updatedAt: status.workflow.updatedAt,
            tasks: Array.from(status.workflow.tasks.entries()).map(([id, task]) => ({
              id,
              ...task
            }))
          }
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Create new workflow
  app.post('/api/workflows', async (
    request: FastifyRequest<{
      Body: {
        name: string;
        tasks: Array<{
          name: string;
          description?: string;
          assignedAgent?: string;
          dependencies?: string[];
          metadata?: Record<string, any>;
        }>;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { name, tasks } = request.body;
      
      if (!name || !tasks || !Array.isArray(tasks)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request: name and tasks array required'
        });
      }
      
      const workflow = await workflowCoordinator.createWorkflow(name, tasks.map(t => ({
        ...t,
        state: WorkflowState.PENDING
      })));
      
      return reply.send({
        success: true,
        data: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          currentTaskId: workflow.currentTaskId,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          tasks: Array.from(workflow.tasks.entries()).map(([id, task]) => ({
            id,
            ...task
          }))
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Assign agent to task
  app.post('/api/workflows/:workflowId/tasks/:taskId/assign', async (
    request: FastifyRequest<{
      Params: { workflowId: string; taskId: string };
      Body: { agentId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId, taskId } = request.params;
      const { agentId } = request.body;
      
      if (!agentId) {
        return reply.status(400).send({
          success: false,
          error: 'agentId required'
        });
      }
      
      const task = await workflowCoordinator.assignTask(workflowId, taskId, agentId);
      
      return reply.send({
        success: true,
        data: task
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Start task
  app.post('/api/workflows/:workflowId/tasks/:taskId/start', async (
    request: FastifyRequest<{
      Params: { workflowId: string; taskId: string };
      Body: { agentId: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId, taskId } = request.params;
      const { agentId } = request.body;
      
      if (!agentId) {
        return reply.status(400).send({
          success: false,
          error: 'agentId required'
        });
      }
      
      const task = await workflowCoordinator.startTask(workflowId, taskId, agentId);
      
      return reply.send({
        success: true,
        data: task
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Complete task
  app.post('/api/workflows/:workflowId/tasks/:taskId/complete', async (
    request: FastifyRequest<{
      Params: { workflowId: string; taskId: string };
      Body: { agentId: string; handoffData?: any };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { workflowId, taskId } = request.params;
      const { agentId, handoffData } = request.body;
      
      if (!agentId) {
        return reply.status(400).send({
          success: false,
          error: 'agentId required'
        });
      }
      
      const result = await workflowCoordinator.completeTask(
        workflowId, 
        taskId, 
        agentId,
        handoffData
      );
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get agent tasks
  app.get('/api/agents/:agentId/tasks', async (
    request: FastifyRequest<{ Params: { agentId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const tasks = await workflowCoordinator.getAgentTasks(request.params.agentId);
      
      return reply.send({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Health check for workflow system
  app.get('/api/workflows/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workflows = await workflowCoordinator.getActiveWorkflows();
      
      return reply.send({
        success: true,
        data: {
          status: 'healthy',
          activeWorkflows: workflows.length,
          timestamp: new Date()
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: 'Workflow system unhealthy',
        details: error.message
      });
    }
  });
}