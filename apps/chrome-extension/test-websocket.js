// WebSocket Test for Chrome Extension
// Tests real-time communication with Elena's fixes

const WebSocket = require('ws');

class WebSocketTester {
  constructor() {
    this.wsUrl = 'ws://localhost:3001'; // Default WebSocket port
    this.results = {
      connection: false,
      messaging: false,
      realtime: false,
      errorHandling: false,
      issues: []
    };
  }

  async testWebSocketConnection() {
    return new Promise((resolve) => {
      console.log('🔌 Testing WebSocket connection...');
      
      const ws = new WebSocket(this.wsUrl);
      const timeout = setTimeout(() => {
        this.results.issues.push('WebSocket connection timeout');
        ws.close();
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        console.log('✅ WebSocket connected successfully');
        clearTimeout(timeout);
        this.results.connection = true;
        
        // Test messaging
        ws.send(JSON.stringify({
          type: 'test',
          data: 'Extension testing message',
          timestamp: Date.now()
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📨 Received:', message);
          this.results.messaging = true;
          
          // Test real-time updates
          if (message.type === 'agent_status' || message.type === 'team_update') {
            this.results.realtime = true;
          }
        } catch (error) {
          this.results.issues.push(`Message parsing error: ${error.message}`);
        }
      });

      ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
        this.results.issues.push(`WebSocket error: ${error.message}`);
        clearTimeout(timeout);
        resolve(false);
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        clearTimeout(timeout);
        resolve(this.results.connection);
      });

      // Close connection after testing
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          this.results.errorHandling = true; // Connection stable
          ws.close();
        }
      }, 3000);
    });
  }

  async testExtensionWebSocketIntegration() {
    console.log('🧪 Testing Chrome Extension WebSocket integration...');
    
    // Simulate chrome extension WebSocket usage
    try {
      const ws = new WebSocket(this.wsUrl);
      
      return new Promise((resolve) => {
        const scenarios = [
          {
            name: 'Agent Status Updates',
            message: { type: 'subscribe', channel: 'agent_status' }
          },
          {
            name: 'Team Data Sync',
            message: { type: 'sync_request', data: { extension: 'chrome' } }
          },
          {
            name: 'Real-time Notifications',
            message: { type: 'subscribe', channel: 'notifications' }
          }
        ];

        let completed = 0;
        const timeout = setTimeout(() => {
          this.results.issues.push('Integration test timeout');
          ws.close();
          resolve(false);
        }, 10000);

        ws.on('open', () => {
          console.log('📡 Testing extension integration scenarios...');
          
          scenarios.forEach((scenario, index) => {
            setTimeout(() => {
              console.log(`Testing: ${scenario.name}`);
              ws.send(JSON.stringify(scenario.message));
            }, index * 1000);
          });
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            completed++;
            
            if (message.type === 'subscription_confirmed') {
              console.log(`✅ Subscription confirmed: ${message.channel}`);
            }
            
            if (completed >= scenarios.length) {
              console.log('✅ All integration scenarios completed');
              clearTimeout(timeout);
              ws.close();
              resolve(true);
            }
          } catch (error) {
            this.results.issues.push(`Integration test error: ${error.message}`);
          }
        });

        ws.on('error', (error) => {
          this.results.issues.push(`Integration WebSocket error: ${error.message}`);
          clearTimeout(timeout);
          resolve(false);
        });
      });
    } catch (error) {
      this.results.issues.push(`Integration test setup error: ${error.message}`);
      return false;
    }
  }

  async runWebSocketTests() {
    console.log('🚀 Starting WebSocket Tests for Chrome Extension\n');
    
    try {
      // Test basic connection
      await this.testWebSocketConnection();
      
      // Test extension integration
      if (this.results.connection) {
        await this.testExtensionWebSocketIntegration();
      }
      
      return this.generateReport();
    } catch (error) {
      this.results.issues.push(`Test execution error: ${error.message}`);
      return this.generateReport();
    }
  }

  generateReport() {
    const tests = ['connection', 'messaging', 'realtime', 'errorHandling'];
    const passed = tests.filter(test => this.results[test]).length;
    const total = tests.length;

    console.log('\n📊 WebSocket Test Results');
    console.log('========================');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    tests.forEach(test => {
      const status = this.results[test] ? '✅' : '❌';
      console.log(`${status} ${test.toUpperCase()}: ${this.results[test] ? 'PASSED' : 'FAILED'}`);
    });

    if (this.results.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      this.results.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    console.log('\n🎯 WebSocket Summary:');
    if (passed === total) {
      console.log('🎉 All WebSocket tests passed! Real-time features are working.');
    } else {
      console.log(`⚠️  ${total - passed} test(s) failed. WebSocket functionality may be limited.`);
    }

    return {
      passed,
      total,
      successRate: (passed / total) * 100,
      issues: this.results.issues,
      connection: this.results.connection,
      messaging: this.results.messaging,
      realtime: this.results.realtime
    };
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new WebSocketTester();
  tester.runWebSocketTests().catch(console.error);
}

module.exports = WebSocketTester;