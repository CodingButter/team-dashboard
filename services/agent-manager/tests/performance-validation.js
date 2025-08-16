/**
 * Performance Validation Script
 * Quick validation of performance targets for agent lifecycle management
 */

const { performance } = require('perf_hooks');

// Mock AgentProcess for testing
const createMockAgentProcess = (id, status = 'starting') => ({
  id,
  pid: Math.floor(Math.random() * 10000) + 1000,
  status,
  startTime: Date.now(),
  write: () => {},
  resize: () => {},
  kill: () => {},
  pause: () => {},
  resume: () => {}
});

// Mock AgentSpawnConfig for testing
const createMockSpawnConfig = (id) => ({
  id,
  name: `test-agent-${id}`,
  model: 'claude-3-sonnet',
  workspace: '/tmp/test-workspace',
  environment: { TEST_MODE: 'true' },
  resourceLimits: {
    memory: 512,
    cpu: 50
  }
});

async function validateSpawnTime() {
  console.log('🚀 Testing agent spawn time performance...');
  
  try {
    // Import our lifecycle manager
    const { default: IntegratedAgentLifecycleManager } = await import('../src/lifecycle/index.js');
    
    const lifecycleManager = new IntegratedAgentLifecycleManager({
      lifecycle: { resourceCheckInterval: 1000 },
      resources: { interval: 1000, performanceMode: true },
      health: { interval: 2000, startPeriod: 500 },
      events: { logToFile: false, logToConsole: false }
    });
    
    const startTime = performance.now();
    
    const agentId = 'perf-test-agent';
    const process = createMockAgentProcess(agentId);
    const config = createMockSpawnConfig(agentId);
    
    await lifecycleManager.manageAgent(agentId, process, config);
    
    const endTime = performance.now();
    const spawnTime = endTime - startTime;
    
    console.log(`✅ Agent lifecycle setup time: ${spawnTime.toFixed(2)}ms`);
    
    if (spawnTime < 2000) {
      console.log('✅ PASS: Spawn time < 2 seconds target');
    } else {
      console.log('❌ FAIL: Spawn time exceeds 2 seconds target');
    }
    
    await lifecycleManager.shutdown();
    
    return spawnTime < 2000;
    
  } catch (error) {
    console.error('❌ Spawn time test failed:', error.message);
    return false;
  }
}

async function validateResourceMonitoringOverhead() {
  console.log('\n📊 Testing resource monitoring overhead...');
  
  try {
    const { default: AgentResourceMonitor } = await import('../src/lifecycle/resource-monitor.js');
    
    const resourceMonitor = new AgentResourceMonitor({
      enabled: true,
      interval: 1000,
      performanceMode: true
    });
    
    const agentCount = 5;
    const testDuration = 2000; // 2 seconds
    
    const startTime = performance.now();
    
    // Start monitoring multiple agents
    for (let i = 0; i < agentCount; i++) {
      const agentId = `overhead-test-${i}`;
      const process = createMockAgentProcess(agentId);
      resourceMonitor.startMonitoring(agentId, process);
    }
    
    // Wait for monitoring cycles
    await new Promise(resolve => setTimeout(resolve, testDuration));
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const overheadPercentage = ((totalTime - testDuration) / testDuration) * 100;
    
    console.log(`✅ Total monitoring time: ${totalTime.toFixed(2)}ms`);
    console.log(`✅ Expected time: ${testDuration}ms`);
    console.log(`✅ Overhead: ${overheadPercentage.toFixed(2)}%`);
    
    resourceMonitor.shutdown();
    
    if (overheadPercentage < 5) {
      console.log('✅ PASS: Resource monitoring overhead < 5%');
      return true;
    } else {
      console.log('❌ FAIL: Resource monitoring overhead exceeds 5%');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Resource monitoring test failed:', error.message);
    return false;
  }
}

async function validateEventLoggingPerformance() {
  console.log('\n📝 Testing event logging performance...');
  
  try {
    const { default: AgentLifecycleEventLogger } = await import('../src/lifecycle/event-logger.js');
    
    const eventLogger = new AgentLifecycleEventLogger({
      enabled: true,
      logToFile: false,
      logToConsole: false,
      bufferSize: 100,
      flushInterval: 1000
    });
    
    const eventCount = 1000;
    const startTime = performance.now();
    
    // Log many events quickly
    for (let i = 0; i < eventCount; i++) {
      eventLogger.logEvent(`agent-${i % 10}`, 'agent:busy', { iteration: i });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const eventsPerSecond = (eventCount / totalTime) * 1000;
    
    console.log(`✅ Logged ${eventCount} events in ${totalTime.toFixed(2)}ms`);
    console.log(`✅ Rate: ${eventsPerSecond.toFixed(0)} events/second`);
    
    await eventLogger.shutdown();
    
    if (eventsPerSecond > 5000) {
      console.log('✅ PASS: Event logging rate > 5000 events/second');
      return true;
    } else {
      console.log('❌ FAIL: Event logging rate too low');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Event logging test failed:', error.message);
    return false;
  }
}

async function validateMemoryUsage() {
  console.log('\n🧠 Testing memory usage...');
  
  try {
    const initialMemory = process.memoryUsage();
    
    const { default: IntegratedAgentLifecycleManager } = await import('../src/lifecycle/index.js');
    
    const lifecycleManager = new IntegratedAgentLifecycleManager({
      resources: { performanceMode: true },
      events: { logToFile: false, logToConsole: false }
    });
    
    // Create multiple agents
    const agentCount = 10;
    for (let i = 0; i < agentCount; i++) {
      const agentId = `memory-test-${i}`;
      const process = createMockAgentProcess(agentId);
      const config = createMockSpawnConfig(agentId);
      await lifecycleManager.manageAgent(agentId, process, config);
    }
    
    // Wait for stabilization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const peakMemory = process.memoryUsage();
    const memoryIncrease = (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    const memoryPerAgent = memoryIncrease / agentCount;
    
    console.log(`✅ Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    console.log(`✅ Memory per agent: ${memoryPerAgent.toFixed(2)}MB`);
    
    await lifecycleManager.shutdown();
    
    if (memoryPerAgent < 10) {
      console.log('✅ PASS: Memory usage per agent < 10MB');
      return true;
    } else {
      console.log('❌ FAIL: Memory usage per agent too high');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Memory usage test failed:', error.message);
    return false;
  }
}

async function runPerformanceValidation() {
  console.log('🎯 Agent Lifecycle Management Performance Validation\n');
  
  const results = await Promise.all([
    validateSpawnTime(),
    validateResourceMonitoringOverhead(),
    validateEventLoggingPerformance(),
    validateMemoryUsage()
  ]);
  
  const passCount = results.filter(Boolean).length;
  const totalTests = results.length;
  
  console.log(`\n📊 Performance Validation Results:`);
  console.log(`✅ Passed: ${passCount}/${totalTests} tests`);
  
  if (passCount === totalTests) {
    console.log('🎉 ALL PERFORMANCE TARGETS MET!');
    process.exit(0);
  } else {
    console.log('⚠️  Some performance targets not met');
    process.exit(1);
  }
}

// Run validation
runPerformanceValidation().catch(error => {
  console.error('💥 Performance validation failed:', error);
  process.exit(1);
});