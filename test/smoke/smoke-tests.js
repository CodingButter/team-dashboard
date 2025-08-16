#!/usr/bin/env node

/**
 * Smoke Tests for Team Dashboard
 * Validates critical functionality after deployment
 */

const https = require('https');
const http = require('http');

// Configuration based on environment
const config = {
  production: {
    baseUrl: 'https://team-dashboard.app',
    timeout: 10000
  },
  staging: {
    baseUrl: 'https://staging.team-dashboard.app',
    timeout: 10000
  },
  'production-green': {
    baseUrl: 'http://localhost:8080', // Port-forwarded during deployment
    timeout: 5000
  }
};

class SmokeTests {
  constructor(environment = 'production') {
    this.environment = environment;
    this.config = config[environment];
    this.results = [];
    this.startTime = Date.now();
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(path, options = {}) {
    const url = `${this.config.baseUrl}${path}`;
    const requestModule = url.startsWith('https:') ? https : http;
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = requestModule.get(url, {
        timeout: this.config.timeout,
        ...options
      }, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            responseTime
          });
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      });
      
      req.on('error', reject);
    });
  }

  async runTest(testName, testFn) {
    this.log(`Running: ${testName}`);
    const testStartTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - testStartTime;
      
      this.results.push({
        name: testName,
        status: 'passed',
        duration,
        details: result
      });
      
      this.log(`✅ PASSED: ${testName} (${duration}ms)`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - testStartTime;
      
      this.results.push({
        name: testName,
        status: 'failed',
        duration,
        error: error.message
      });
      
      this.log(`❌ FAILED: ${testName} - ${error.message}`, 'error');
      return false;
    }
  }

  // Test Cases
  async testMainPageLoad() {
    const response = await this.makeRequest('/');
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.data.includes('Team Dashboard')) {
      throw new Error('Page does not contain expected title');
    }
    
    if (response.responseTime > 5000) {
      throw new Error(`Response time too slow: ${response.responseTime}ms`);
    }
    
    return {
      statusCode: response.statusCode,
      responseTime: response.responseTime,
      contentLength: response.data.length
    };
  }

  async testHealthEndpoint() {
    const response = await this.makeRequest('/api/health');
    
    if (response.statusCode !== 200) {
      throw new Error(`Health check failed with status ${response.statusCode}`);
    }
    
    let healthData;
    try {
      healthData = JSON.parse(response.data);
    } catch (e) {
      throw new Error('Health endpoint returned invalid JSON');
    }
    
    if (healthData.status !== 'healthy' && healthData.status !== 'ok') {
      throw new Error(`Health status is not healthy: ${healthData.status}`);
    }
    
    return healthData;
  }

  async testAgentManagerHealth() {
    const response = await this.makeRequest('/api/agents/health');
    
    if (response.statusCode !== 200) {
      throw new Error(`Agent manager health check failed with status ${response.statusCode}`);
    }
    
    let healthData;
    try {
      healthData = JSON.parse(response.data);
    } catch (e) {
      throw new Error('Agent manager health endpoint returned invalid JSON');
    }
    
    return healthData;
  }

  async testMcpManagerHealth() {
    const response = await this.makeRequest('/api/mcp/health');
    
    if (response.statusCode !== 200) {
      throw new Error(`MCP manager health check failed with status ${response.statusCode}`);
    }
    
    let healthData;
    try {
      healthData = JSON.parse(response.data);
    } catch (e) {
      throw new Error('MCP manager health endpoint returned invalid JSON');
    }
    
    return healthData;
  }

  async testOpenAiServiceHealth() {
    const response = await this.makeRequest('/api/openai/health');
    
    if (response.statusCode !== 200) {
      throw new Error(`OpenAI service health check failed with status ${response.statusCode}`);
    }
    
    let healthData;
    try {
      healthData = JSON.parse(response.data);
    } catch (e) {
      throw new Error('OpenAI service health endpoint returned invalid JSON');
    }
    
    return healthData;
  }

  async testStaticAssets() {
    // Test that static assets are being served
    const response = await this.makeRequest('/favicon.ico');
    
    if (response.statusCode !== 200 && response.statusCode !== 404) {
      throw new Error(`Unexpected status for static asset: ${response.statusCode}`);
    }
    
    return {
      statusCode: response.statusCode,
      responseTime: response.responseTime
    };
  }

  async testDatabaseConnectivity() {
    const response = await this.makeRequest('/api/health/db');
    
    if (response.statusCode !== 200) {
      throw new Error(`Database connectivity check failed with status ${response.statusCode}`);
    }
    
    let dbHealth;
    try {
      dbHealth = JSON.parse(response.data);
    } catch (e) {
      throw new Error('Database health endpoint returned invalid JSON');
    }
    
    if (dbHealth.status !== 'connected' && dbHealth.status !== 'healthy') {
      throw new Error(`Database is not connected: ${dbHealth.status}`);
    }
    
    return dbHealth;
  }

  async testRedisConnectivity() {
    const response = await this.makeRequest('/api/health/redis');
    
    if (response.statusCode !== 200) {
      throw new Error(`Redis connectivity check failed with status ${response.statusCode}`);
    }
    
    let redisHealth;
    try {
      redisHealth = JSON.parse(response.data);
    } catch (e) {
      throw new Error('Redis health endpoint returned invalid JSON');
    }
    
    if (redisHealth.status !== 'connected' && redisHealth.status !== 'healthy') {
      throw new Error(`Redis is not connected: ${redisHealth.status}`);
    }
    
    return redisHealth;
  }

  async testApiResponse() {
    // Test API endpoints are responding (even if they require auth)
    const response = await this.makeRequest('/api/agents');
    
    // We expect either 200 (if working) or 401/403 (if auth required)
    if (![200, 401, 403].includes(response.statusCode)) {
      throw new Error(`API endpoint returned unexpected status: ${response.statusCode}`);
    }
    
    return {
      statusCode: response.statusCode,
      responseTime: response.responseTime
    };
  }

  async testPerformanceBenchmark() {
    const iterations = 3;
    const responseTimes = [];
    
    for (let i = 0; i < iterations; i++) {
      const response = await this.makeRequest('/');
      responseTimes.push(response.responseTime);
    }
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    if (averageResponseTime > 3000) {
      throw new Error(`Average response time too slow: ${averageResponseTime}ms`);
    }
    
    if (maxResponseTime > 5000) {
      throw new Error(`Max response time too slow: ${maxResponseTime}ms`);
    }
    
    return {
      averageResponseTime,
      maxResponseTime,
      responseTimes
    };
  }

  async runAllTests() {
    this.log(`Starting smoke tests for ${this.environment} environment`);
    this.log(`Base URL: ${this.config.baseUrl}`);
    
    const tests = [
      ['Main Page Load', () => this.testMainPageLoad()],
      ['Health Endpoint', () => this.testHealthEndpoint()],
      ['Agent Manager Health', () => this.testAgentManagerHealth()],
      ['MCP Manager Health', () => this.testMcpManagerHealth()],
      ['OpenAI Service Health', () => this.testOpenAiServiceHealth()],
      ['Static Assets', () => this.testStaticAssets()],
      ['Database Connectivity', () => this.testDatabaseConnectivity()],
      ['Redis Connectivity', () => this.testRedisConnectivity()],
      ['API Response', () => this.testApiResponse()],
      ['Performance Benchmark', () => this.testPerformanceBenchmark()]
    ];
    
    let passedTests = 0;
    
    for (const [testName, testFn] of tests) {
      const passed = await this.runTest(testName, testFn);
      if (passed) passedTests++;
    }
    
    const totalDuration = Date.now() - this.startTime;
    
    // Generate summary
    this.log(`\n=== SMOKE TEST SUMMARY ===`);
    this.log(`Environment: ${this.environment}`);
    this.log(`Base URL: ${this.config.baseUrl}`);
    this.log(`Tests Passed: ${passedTests}/${tests.length}`);
    this.log(`Total Duration: ${totalDuration}ms`);
    this.log(`Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    
    if (passedTests === tests.length) {
      this.log('🎉 ALL SMOKE TESTS PASSED!', 'success');
      process.exit(0);
    } else {
      this.log('💥 SOME SMOKE TESTS FAILED!', 'error');
      
      // Log failed tests
      const failedTests = this.results.filter(r => r.status === 'failed');
      this.log('\nFailed Tests:');
      failedTests.forEach(test => {
        this.log(`  - ${test.name}: ${test.error}`, 'error');
      });
      
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const environment = process.argv[2] || 'production';
  const verbose = process.argv.includes('--verbose');
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node smoke-tests.js [environment] [--verbose] [--help]');
    console.log('Environments: production, staging, production-green');
    console.log('Options:');
    console.log('  --verbose    Enable verbose output');
    console.log('  --help, -h   Show this help message');
    process.exit(0);
  }
  
  try {
    const smokeTests = new SmokeTests(environment);
    await smokeTests.runAllTests();
  } catch (error) {
    console.error(`❌ Smoke tests failed to initialize: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SmokeTests;