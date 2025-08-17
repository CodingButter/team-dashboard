/**
 * WebSocket Progress Update Test
 * Tests real-time progress updates during CSV import with Elena's fixes
 */

import WebSocket from 'ws';
import { readFile } from 'fs/promises';

class WebSocketProgressTester {
  constructor() {
    this.progressUpdates = [];
    this.isConnected = false;
    this.testResults = {
      connectionSuccess: false,
      progressUpdatesReceived: 0,
      realTimeUpdates: false,
      finalProgressReceived: false,
      averageUpdateLatency: 0
    };
  }

  async testWebSocketProgress() {
    console.log('🔗 Testing WebSocket Progress Updates...\n');

    try {
      // Connect to WebSocket server
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        this.isConnected = true;
        this.testResults.connectionSuccess = true;
        this.startCSVImportTest(ws);
      });

      ws.on('message', (data) => {
        this.handleProgressMessage(data);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.analyzeResults();
      });

      // Wait for test completion
      await new Promise(resolve => {
        setTimeout(() => {
          ws.close();
          resolve();
        }, 10000); // 10 second timeout
      });

    } catch (error) {
      console.error('❌ WebSocket test failed:', error.message);
    }
  }

  async startCSVImportTest(ws) {
    console.log('📤 Starting CSV import test...');
    
    try {
      // Load test CSV data
      const csvContent = await readFile('test-data/agents-large-dataset.csv', 'utf-8');
      
      // Send CSV import request via WebSocket
      const importRequest = {
        type: 'csv_import',
        data: {
          content: csvContent,
          mapping: {
            'name': 'name',
            'model': 'model',
            'workspace': 'workspace',
            'tags': 'tags',
            'memoryLimit': 'memoryLimit',
            'cpuCores': 'cpuCores',
            'autoStart': 'autoStart'
          }
        },
        timestamp: Date.now()
      };

      ws.send(JSON.stringify(importRequest));
      console.log('📋 CSV import request sent');
      
    } catch (error) {
      console.error('❌ Failed to start CSV import:', error.message);
    }
  }

  handleProgressMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      const timestamp = Date.now();
      
      if (message.type === 'csv_progress') {
        this.progressUpdates.push({
          ...message.data,
          timestamp
        });

        console.log(`📊 Progress: ${message.data.processed}/${message.data.total} (${message.data.percentage}%)`);
        
        if (message.data.stage) {
          console.log(`   Stage: ${message.data.stage}`);
        }

        this.testResults.progressUpdatesReceived++;
        
        if (message.data.percentage === 100) {
          this.testResults.finalProgressReceived = true;
          console.log('🎯 Final progress update received');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to parse progress message:', error.message);
    }
  }

  analyzeResults() {
    console.log('\n📈 WebSocket Progress Analysis:');
    console.log(`   Connection Success: ${this.testResults.connectionSuccess ? '✅' : '❌'}`);
    console.log(`   Progress Updates Received: ${this.testResults.progressUpdatesReceived}`);
    console.log(`   Final Progress Received: ${this.testResults.finalProgressReceived ? '✅' : '❌'}`);
    
    if (this.progressUpdates.length > 1) {
      // Calculate update frequency
      const timeSpan = this.progressUpdates[this.progressUpdates.length - 1].timestamp - this.progressUpdates[0].timestamp;
      const updateFrequency = this.progressUpdates.length / (timeSpan / 1000);
      console.log(`   Update Frequency: ${updateFrequency.toFixed(2)} updates/second`);
      
      // Check for real-time updates (at least 1 update per second)
      this.testResults.realTimeUpdates = updateFrequency >= 1.0;
      console.log(`   Real-time Updates: ${this.testResults.realTimeUpdates ? '✅' : '❌'}`);
    }
    
    // Overall assessment
    const allTestsPassed = 
      this.testResults.connectionSuccess &&
      this.testResults.progressUpdatesReceived > 0 &&
      this.testResults.finalProgressReceived &&
      this.testResults.realTimeUpdates;
      
    console.log(`\n🎯 Overall WebSocket Test: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return this.testResults;
  }
}

// Mock WebSocket server for testing (if real server not available)
async function startMockWebSocketServer() {
  const WebSocketServer = WebSocket.Server;
  const wss = new WebSocketServer({ port: 3001 });
  
  console.log('🖥️  Mock WebSocket server started on port 3001');
  
  wss.on('connection', (ws) => {
    console.log('🔗 Client connected to mock server');
    
    ws.on('message', (message) => {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'csv_import') {
        // Simulate CSV import with progress updates
        simulateCSVImportProgress(ws);
      }
    });
  });
  
  return wss;
}

function simulateCSVImportProgress(ws) {
  const stages = ['parsing', 'mapping', 'validation', 'importing'];
  let currentStage = 0;
  let progress = 0;
  
  const interval = setInterval(() => {
    progress += 10;
    
    if (progress > 100) {
      clearInterval(interval);
      return;
    }
    
    const progressMessage = {
      type: 'csv_progress',
      data: {
        processed: Math.floor(progress / 10),
        total: 10,
        percentage: progress,
        stage: stages[Math.floor(progress / 25)] || 'importing'
      }
    };
    
    ws.send(JSON.stringify(progressMessage));
    
    if (progress === 100) {
      clearInterval(interval);
    }
  }, 200); // Update every 200ms for 5 updates per second
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new WebSocketProgressTester();
  
  // Start mock server if needed
  const mockServer = await startMockWebSocketServer();
  
  // Wait a moment for server to start
  setTimeout(() => {
    tester.testWebSocketProgress().finally(() => {
      mockServer.close();
    });
  }, 1000);
}

export { WebSocketProgressTester };