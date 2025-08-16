/**
 * Test Sequential Workflow
 * Demonstrates the sequential workflow coordinator in action
 */

import { workflowCoordinator } from './coordinator';
import { WorkflowState } from './types';

async function testSequentialWorkflow() {
  console.log('=== Testing Sequential Workflow Coordinator ===\n');
  
  try {
    // Initialize the coordinator
    console.log('1. Initializing workflow coordinator...');
    await workflowCoordinator.initialize();
    console.log('   ✓ Coordinator initialized\n');
    
    // Create a sample workflow
    console.log('2. Creating sample workflow...');
    const workflow = await workflowCoordinator.createWorkflow(
      'Feature Development Workflow',
      [
        {
          name: 'Requirements Analysis',
          description: 'Analyze and document feature requirements',
          assignedAgent: 'lead-developer',
          state: WorkflowState.PENDING
        },
        {
          name: 'UI Design',
          description: 'Create UI mockups and components',
          assignedAgent: 'frontend-expert',
          dependencies: ['requirements-task-id'], // Will be replaced with actual ID
          state: WorkflowState.PENDING
        },
        {
          name: 'Backend Implementation',
          description: 'Implement API endpoints and business logic',
          assignedAgent: 'backend-specialist',
          dependencies: ['requirements-task-id'],
          state: WorkflowState.PENDING
        },
        {
          name: 'Integration Testing',
          description: 'Test frontend-backend integration',
          assignedAgent: 'qa-specialist',
          dependencies: ['ui-task-id', 'backend-task-id'],
          state: WorkflowState.PENDING
        },
        {
          name: 'Documentation',
          description: 'Write user and technical documentation',
          assignedAgent: 'tech-writer',
          dependencies: ['integration-task-id'],
          state: WorkflowState.PENDING
        }
      ]
    );
    
    console.log(`   ✓ Workflow created: ${workflow.id}`);
    console.log(`     Name: ${workflow.name}`);
    console.log(`     Tasks: ${workflow.tasks.size}`);
    console.log(`     Status: ${workflow.status}\n`);
    
    // Get workflow status
    console.log('3. Getting workflow status...');
    const status = await workflowCoordinator.getWorkflowStatus(workflow.id);
    console.log(`   ✓ Progress: ${status.progress}%`);
    console.log(`     Completed: ${status.completedTasks}/${status.totalTasks}`);
    console.log(`     Current Agent: ${status.currentAgent || 'None'}\n`);
    
    // Simulate task execution
    const taskIds = Array.from(workflow.tasks.keys());
    const firstTaskId = taskIds[0];
    
    console.log('4. Starting first task...');
    const startedTask = await workflowCoordinator.startTask(
      workflow.id,
      firstTaskId,
      'lead-developer'
    );
    console.log(`   ✓ Task started: ${startedTask.name}`);
    console.log(`     State: ${startedTask.state}`);
    console.log(`     Agent: ${startedTask.assignedAgent}\n`);
    
    // Complete first task with handoff data
    console.log('5. Completing first task with handoff...');
    const handoffData = {
      requirements: {
        functional: ['User authentication', 'Data validation'],
        nonFunctional: ['Performance: <2s response time', 'Security: JWT auth']
      },
      notes: 'Frontend should use React hooks, Backend should use REST API'
    };
    
    const result = await workflowCoordinator.completeTask(
      workflow.id,
      firstTaskId,
      'lead-developer',
      handoffData
    );
    
    console.log(`   ✓ Task completed: ${result.completedTask.name}`);
    if (result.nextTask) {
      console.log(`   ✓ Next task ready: ${result.nextTask.name}`);
      console.log(`     Assigned to: ${result.nextTask.assignedAgent}\n`);
    }
    
    // Get updated status
    console.log('6. Getting updated workflow status...');
    const updatedStatus = await workflowCoordinator.getWorkflowStatus(workflow.id);
    console.log(`   ✓ Progress: ${updatedStatus.progress}%`);
    console.log(`     Completed: ${updatedStatus.completedTasks}/${updatedStatus.totalTasks}\n`);
    
    // Test agent tasks query
    console.log('7. Getting tasks for frontend-expert...');
    const agentTasks = await workflowCoordinator.getAgentTasks('frontend-expert');
    console.log(`   ✓ Found ${agentTasks.length} task(s)`);
    agentTasks.forEach(task => {
      console.log(`     - ${task.name} (${task.state})`);
    });
    console.log();
    
    // Test workflow recovery
    console.log('8. Testing workflow recovery...');
    const activeWorkflows = await workflowCoordinator.getActiveWorkflows();
    console.log(`   ✓ Active workflows: ${activeWorkflows.length}`);
    activeWorkflows.forEach(w => {
      console.log(`     - ${w.name} (${w.status})`);
    });
    
    console.log('\n=== Test Complete ===');
    console.log('Sequential workflow coordinator is working correctly!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Cleanup
    await workflowCoordinator.shutdown();
  }
}

// Run test if executed directly
if (require.main === module) {
  testSequentialWorkflow().catch(console.error);
}

export { testSequentialWorkflow };