/**
 * Test script for workflow state machine
 * Run with: tsx src/workflow/test-workflow.ts
 */

import { WorkflowStateMachine, WorkflowState } from './index.js';

async function testWorkflow() {
  console.log('🧪 Testing Workflow State Machine\n');
  
  const stateMachine = new WorkflowStateMachine();
  
  // Test 1: Create a workflow
  console.log('1️⃣ Creating workflow with sequential tasks...');
  const workflow = stateMachine.createWorkflow('Test Deployment Workflow', [
    {
      name: 'Code Review',
      description: 'Review code changes',
      state: WorkflowState.PENDING,
    },
    {
      name: 'Run Tests',
      description: 'Execute test suite',
      state: WorkflowState.PENDING,
      dependencies: [], // Will get first task ID
    },
    {
      name: 'Build Application',
      description: 'Build production bundle',
      state: WorkflowState.PENDING,
      dependencies: [], // Will get second task ID
    },
    {
      name: 'Deploy to Staging',
      description: 'Deploy to staging environment',
      state: WorkflowState.PENDING,
      dependencies: [], // Will get third task ID
    },
  ]);
  
  const taskIds = Array.from(workflow.tasks.keys());
  console.log(`✅ Workflow created: ${workflow.id}`);
  console.log(`   Tasks: ${taskIds.length}`);
  
  // Update dependencies (simulate sequential dependency)
  const tasks = Array.from(workflow.tasks.values());
  if (tasks[1]) tasks[1].dependencies = [taskIds[0]];
  if (tasks[2]) tasks[2].dependencies = [taskIds[1]];
  if (tasks[3]) tasks[3].dependencies = [taskIds[2]];
  
  // Test 2: Assign agents
  console.log('\n2️⃣ Assigning agents to tasks...');
  stateMachine.assignAgent(workflow.id, taskIds[0], 'agent-1');
  stateMachine.assignAgent(workflow.id, taskIds[1], 'agent-2');
  stateMachine.assignAgent(workflow.id, taskIds[2], 'agent-3');
  stateMachine.assignAgent(workflow.id, taskIds[3], 'agent-4');
  console.log('✅ Agents assigned');
  
  // Test 3: Transition first task
  console.log('\n3️⃣ Starting first task (Code Review)...');
  stateMachine.transitionTask(
    workflow.id,
    taskIds[0],
    WorkflowState.IN_PROGRESS,
    'agent-1',
    'Starting code review'
  );
  console.log('✅ Task transitioned to IN_PROGRESS');
  
  // Test 4: Complete first task
  console.log('\n4️⃣ Completing first task...');
  stateMachine.transitionTask(
    workflow.id,
    taskIds[0],
    WorkflowState.COMPLETED,
    'agent-1',
    'Code review completed successfully'
  );
  console.log('✅ Task completed');
  
  // Test 5: Check if second task can start
  console.log('\n5️⃣ Checking if second task can start...');
  const canStart = stateMachine.canStartTask(workflow.id, taskIds[1]);
  console.log(`Can start "Run Tests": ${canStart}`);
  
  if (canStart) {
    stateMachine.transitionTask(
      workflow.id,
      taskIds[1],
      WorkflowState.IN_PROGRESS,
      'agent-2',
      'Starting test execution'
    );
    console.log('✅ Second task started');
  }
  
  // Test 6: Get workflow status
  console.log('\n6️⃣ Getting workflow status...');
  const status = stateMachine.getWorkflowStatus(workflow.id);
  console.log(`Workflow Progress: ${status.progress.toFixed(1)}%`);
  console.log(`Completed Tasks: ${status.completedTasks}/${status.totalTasks}`);
  console.log(`Current Agent: ${status.currentAgent || 'None'}`);
  
  // Test 7: Block a task
  console.log('\n7️⃣ Blocking second task...');
  stateMachine.transitionTask(
    workflow.id,
    taskIds[1],
    WorkflowState.BLOCKED,
    'agent-2',
    'Waiting for external dependency'
  );
  console.log('✅ Task blocked');
  
  // Test 8: Get agent tasks
  console.log('\n8️⃣ Getting tasks for agent-2...');
  const agentTasks = stateMachine.getTasksForAgent('agent-2');
  console.log(`Agent-2 has ${agentTasks.length} task(s):`);
  agentTasks.forEach(task => {
    console.log(`  - ${task.name} (${task.state})`);
  });
  
  // Test 9: Get transition history
  console.log('\n9️⃣ Getting transition history...');
  const transitions = stateMachine.getTransitionHistory(workflow.id);
  console.log(`Total transitions: ${transitions.length}`);
  transitions.forEach(t => {
    console.log(`  ${t.from} → ${t.to} (Task: ${t.taskId.slice(0, 8)}...)`);
  });
  
  // Test 10: Invalid transition
  console.log('\n🔟 Testing invalid transition...');
  try {
    stateMachine.transitionTask(
      workflow.id,
      taskIds[0],
      WorkflowState.IN_PROGRESS,
      'agent-1',
      'Trying to restart completed task'
    );
    console.log('❌ Should have thrown error!');
  } catch (error) {
    console.log(`✅ Correctly rejected invalid transition: ${(error as Error).message}`);
  }
  
  console.log('\n✨ All tests completed successfully!');
}

// Run the test
testWorkflow().catch(console.error);