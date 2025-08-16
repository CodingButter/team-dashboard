# URGENT MISSION: Inter-Agent Communication System - Issue #23

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #23 - Build inter-agent communication system
**Priority**: P1 - HIGH PRIORITY
**Agent**: backend-specialist (or any available backend expert)

## START CODING IMMEDIATELY!

### 1. CREATE THIS FILE FIRST:
**File**: `/services/agent-manager/src/communication/inter-agent-bus.ts`

```typescript
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'handoff';
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export class InterAgentBus extends EventEmitter {
  private redis: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private agentId: string;
  private messageHandlers = new Map<string, Function>();
  
  constructor(agentId: string) {
    super();
    this.agentId = agentId;
    
    // Redis for pub/sub
    this.redis = new Redis({
      host: 'localhost',
      port: 6379
    });
    
    this.pubClient = this.redis.duplicate();
    this.subClient = this.redis.duplicate();
    
    this.initialize();
  }
  
  private async initialize() {
    // Subscribe to personal channel
    await this.subClient.subscribe(`agent:${this.agentId}`);
    
    // Subscribe to broadcast channel
    await this.subClient.subscribe('agent:broadcast');
    
    // Handle incoming messages
    this.subClient.on('message', (channel, message) => {
      const msg: AgentMessage = JSON.parse(message);
      this.handleMessage(msg);
    });
  }
  
  private handleMessage(message: AgentMessage) {
    console.log(`[${this.agentId}] Received message from ${message.from}:`, message);
    
    switch(message.type) {
      case 'request':
        this.emit('request', message);
        break;
      case 'response':
        this.emit('response', message);
        break;
      case 'broadcast':
        this.emit('broadcast', message);
        break;
      case 'handoff':
        this.emit('handoff', message);
        break;
    }
    
    // Execute registered handler if exists
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }
  
  async sendMessage(to: string, type: AgentMessage['type'], payload: any) {
    const message: AgentMessage = {
      id: uuidv4(),
      from: this.agentId,
      to,
      type,
      payload,
      timestamp: new Date()
    };
    
    const channel = to === '*' ? 'agent:broadcast' : `agent:${to}`;
    await this.pubClient.publish(channel, JSON.stringify(message));
    
    return message.id;
  }
  
  async requestAndWait(to: string, payload: any, timeout = 30000): Promise<any> {
    const messageId = await this.sendMessage(to, 'request', payload);
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout: ${messageId}`));
      }, timeout);
      
      const responseHandler = (msg: AgentMessage) => {
        if (msg.correlationId === messageId) {
          clearTimeout(timer);
          this.off('response', responseHandler);
          resolve(msg.payload);
        }
      };
      
      this.on('response', responseHandler);
    });
  }
  
  async broadcast(payload: any) {
    return this.sendMessage('*', 'broadcast', payload);
  }
  
  async handoff(to: string, task: any) {
    return this.sendMessage(to, 'handoff', {
      task,
      context: await this.getContext()
    });
  }
  
  private async getContext() {
    // Get current agent context from memento
    return {
      workingDirectory: process.cwd(),
      branch: await this.getCurrentBranch(),
      timestamp: new Date()
    };
  }
  
  private async getCurrentBranch() {
    const { execSync } = require('child_process');
    return execSync('git branch --show-current').toString().trim();
  }
  
  registerHandler(type: string, handler: Function) {
    this.messageHandlers.set(type, handler);
  }
  
  async cleanup() {
    await this.subClient.unsubscribe();
    this.redis.disconnect();
    this.pubClient.disconnect();
    this.subClient.disconnect();
  }
}
```

### 2. CREATE THE MESSAGE QUEUE SERVICE:
**File**: `/services/agent-manager/src/communication/message-queue.ts`

```typescript
import Bull from 'bull';
import { InterAgentBus } from './inter-agent-bus';

interface TaskHandoff {
  fromAgent: string;
  toAgent: string;
  task: {
    id: string;
    type: string;
    description: string;
    context: any;
    priority: number;
  };
  timestamp: Date;
}

export class MessageQueueService {
  private taskQueue: Bull.Queue;
  private resultQueue: Bull.Queue;
  private bus: InterAgentBus;
  
  constructor(agentId: string) {
    this.taskQueue = new Bull('agent-tasks', {
      redis: {
        port: 6379,
        host: 'localhost'
      }
    });
    
    this.resultQueue = new Bull('agent-results', {
      redis: {
        port: 6379,
        host: 'localhost'
      }
    });
    
    this.bus = new InterAgentBus(agentId);
    this.setupProcessors();
  }
  
  private setupProcessors() {
    // Process incoming tasks
    this.taskQueue.process(async (job) => {
      console.log('Processing task:', job.data);
      
      // Notify via inter-agent bus
      await this.bus.broadcast({
        type: 'task_started',
        taskId: job.data.id,
        agent: job.data.toAgent
      });
      
      // Simulate task processing
      const result = await this.processTask(job.data);
      
      // Send result
      await this.resultQueue.add({
        taskId: job.data.id,
        result,
        completedBy: job.data.toAgent,
        timestamp: new Date()
      });
      
      return result;
    });
    
    // Handle task handoffs
    this.bus.on('handoff', async (message) => {
      await this.taskQueue.add(message.payload.task, {
        priority: message.payload.task.priority || 0
      });
    });
  }
  
  private async processTask(task: any) {
    // Actual task processing logic
    return {
      success: true,
      taskId: task.id,
      output: `Processed ${task.type} task`
    };
  }
  
  async handoffTask(toAgent: string, task: any) {
    const handoff: TaskHandoff = {
      fromAgent: this.bus['agentId'],
      toAgent,
      task: {
        id: `task_${Date.now()}`,
        ...task
      },
      timestamp: new Date()
    };
    
    await this.taskQueue.add(handoff);
    await this.bus.handoff(toAgent, handoff);
    
    return handoff.task.id;
  }
  
  async getTaskStatus(taskId: string) {
    const job = await this.taskQueue.getJob(taskId);
    return job ? job.toJSON() : null;
  }
}
```

### 3. CREATE THE COORDINATION SERVICE:
**File**: `/services/agent-manager/src/communication/coordination-service.ts`

```typescript
import { InterAgentBus } from './inter-agent-bus';
import { MessageQueueService } from './message-queue';

export class CoordinationService {
  private agents = new Map<string, { bus: InterAgentBus, queue: MessageQueueService }>();
  private workflowState = new Map<string, any>();
  
  async registerAgent(agentId: string, capabilities: string[]) {
    const bus = new InterAgentBus(agentId);
    const queue = new MessageQueueService(agentId);
    
    this.agents.set(agentId, { bus, queue });
    
    // Announce agent online
    await bus.broadcast({
      type: 'agent_online',
      agentId,
      capabilities,
      timestamp: new Date()
    });
    
    // Setup coordination handlers
    bus.on('handoff', async (msg) => {
      await this.handleHandoff(agentId, msg);
    });
    
    return { bus, queue };
  }
  
  private async handleHandoff(receivingAgent: string, message: any) {
    // Update workflow state
    this.workflowState.set(message.payload.task.id, {
      currentAgent: receivingAgent,
      previousAgent: message.from,
      status: 'in_progress',
      timestamp: new Date()
    });
    
    // Log to memento
    await this.logToMemento({
      type: 'task_handoff',
      from: message.from,
      to: receivingAgent,
      task: message.payload.task
    });
  }
  
  private async logToMemento(data: any) {
    // Integration with memento MCP
    console.log('Logging to memento:', data);
  }
  
  async orchestrateWorkflow(workflow: any) {
    const steps = workflow.steps;
    let context = {};
    
    for (const step of steps) {
      const agent = this.agents.get(step.agentId);
      if (!agent) {
        throw new Error(`Agent ${step.agentId} not available`);
      }
      
      // Send task to agent
      const taskId = await agent.queue.handoffTask(step.agentId, {
        type: step.type,
        description: step.description,
        context,
        priority: step.priority
      });
      
      // Wait for completion
      const result = await this.waitForTaskCompletion(taskId);
      
      // Update context for next step
      context = { ...context, [`step_${step.id}`]: result };
    }
    
    return context;
  }
  
  private async waitForTaskCompletion(taskId: string, timeout = 60000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${taskId} timeout`));
      }, timeout);
      
      // Poll for completion
      const interval = setInterval(async () => {
        const state = this.workflowState.get(taskId);
        if (state && state.status === 'completed') {
          clearInterval(interval);
          clearTimeout(timer);
          resolve(state.result);
        }
      }, 1000);
    });
  }
}

// Export singleton
export const coordination = new CoordinationService();
```

### 4. ADD DEPENDENCIES:
```bash
cd services/agent-manager
pnpm add ioredis bull uuid @types/bull
```

## SUCCESS CRITERIA:
- [ ] Agents can send messages to each other
- [ ] Task handoff mechanism working
- [ ] Message queue processing tasks
- [ ] Redis pub/sub functioning
- [ ] Broadcast messages received by all agents
- [ ] Request/response pattern working with timeout

## DO THIS NOW!
1. Create ALL files above IMMEDIATELY
2. Start Redis if not running: `docker-compose up -d redis`
3. Test inter-agent communication
4. Create PR with title: "feat: Inter-agent communication system (Closes #23)"

**START CODING NOW! NO DELAYS!**