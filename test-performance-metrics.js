/**
 * CSV Performance Metrics Test
 * Comprehensive testing of CSV processing performance and memory efficiency
 */

import { performance } from 'perf_hooks';
import { readFile, writeFile } from 'fs/promises';
import { AgentCSVService } from './services/agent-manager/src/csv/agent-csv-service.js';

class CSVPerformanceTester {
  constructor() {
    this.csvService = new AgentCSVService();
    this.results = {
      parsing: {},
      columnDetection: {},
      validation: {},
      import: {},
      export: {},
      memoryUsage: {}
    };
  }

  async runPerformanceTests() {
    console.log('⚡ Starting CSV Performance Tests...\n');

    // Test different file sizes
    const testSizes = [
      { name: 'Small (100 rows)', rows: 100 },
      { name: 'Medium (1K rows)', rows: 1000 },
      { name: 'Large (10K rows)', rows: 10000 },
      { name: 'XLarge (50K rows)', rows: 50000 }
    ];

    for (const testSize of testSizes) {
      console.log(`🧪 Testing ${testSize.name}...`);
      await this.testFileSize(testSize.name, testSize.rows);
      console.log('');
    }

    this.generatePerformanceReport();
    return this.results;
  }

  async testFileSize(sizeName, rowCount) {
    // Generate test CSV data
    const csvContent = this.generateTestCSV(rowCount);
    const fileSizeKB = Math.round(csvContent.length / 1024);
    
    console.log(`   File Size: ${fileSizeKB} KB`);

    const columnMapping = {
      'name': 'name',
      'model': 'model',
      'workspace': 'workspace',
      'tags': 'tags',
      'memoryLimit': 'memoryLimit',
      'cpuCores': 'cpuCores',
      'autoStart': 'autoStart'
    };

    // Test CSV Analysis Performance
    const analysisStart = performance.now();
    const memBefore = process.memoryUsage();
    
    try {
      const analysis = await this.csvService.analyzeCSV(csvContent);
      const analysisTime = performance.now() - analysisStart;
      
      console.log(`   📊 Analysis: ${analysisTime.toFixed(2)}ms (${analysis.confidence.toFixed(2)} confidence)`);
      
      this.results.columnDetection[sizeName] = {
        time: analysisTime,
        confidence: analysis.confidence,
        fileSizeKB
      };

      // Test CSV Validation Performance
      const validationStart = performance.now();
      const validation = await this.csvService.validateCSV(csvContent, columnMapping);
      const validationTime = performance.now() - validationStart;
      
      console.log(`   ✅ Validation: ${validationTime.toFixed(2)}ms (${validation.validRowCount}/${validation.rowCount} valid)`);
      
      this.results.validation[sizeName] = {
        time: validationTime,
        validRows: validation.validRowCount,
        totalRows: validation.rowCount,
        errors: validation.errors.length,
        fileSizeKB
      };

      // Test CSV Import Performance
      const importStart = performance.now();
      let progressUpdates = 0;
      
      const importResult = await this.csvService.importAgentsFromCSV(
        csvContent, 
        columnMapping, 
        {},
        (processed, total) => {
          progressUpdates++;
        }
      );
      
      const importTime = performance.now() - importStart;
      const memAfter = process.memoryUsage();
      
      console.log(`   📥 Import: ${importTime.toFixed(2)}ms (${importResult.successful} successful)`);
      console.log(`   🔄 Progress Updates: ${progressUpdates}`);
      
      this.results.import[sizeName] = {
        time: importTime,
        successful: importResult.successful,
        failed: importResult.failed,
        progressUpdates,
        fileSizeKB
      };

      // Memory usage analysis
      const memoryDelta = {
        rss: memAfter.rss - memBefore.rss,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        external: memAfter.external - memBefore.external
      };
      
      this.results.memoryUsage[sizeName] = {
        rssDelta: Math.round(memoryDelta.rss / 1024 / 1024 * 100) / 100, // MB
        heapDelta: Math.round(memoryDelta.heapUsed / 1024 / 1024 * 100) / 100, // MB
        fileSizeKB
      };
      
      console.log(`   💾 Memory: +${this.results.memoryUsage[sizeName].heapDelta}MB heap`);

      // Test CSV Export Performance (using mock agent data)
      const mockAgents = this.generateMockAgents(Math.min(rowCount, 1000)); // Limit for export test
      const exportStart = performance.now();
      const exportResult = await this.csvService.exportAgentsToCSV(mockAgents);
      const exportTime = performance.now() - exportStart;
      
      console.log(`   📤 Export: ${exportTime.toFixed(2)}ms (${exportResult.length} chars)`);
      
      this.results.export[sizeName] = {
        time: exportTime,
        outputSize: exportResult.length,
        agentCount: mockAgents.length,
        fileSizeKB
      };

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  generateTestCSV(rowCount) {
    const header = 'name,model,workspace,tags,memoryLimit,cpuCores,autoStart\n';
    const rows = [];
    
    const models = ['claude-3-sonnet', 'gpt-4o', 'claude-3-haiku', 'gpt-4o-mini', 'claude-3-opus'];
    
    for (let i = 1; i <= rowCount; i++) {
      const row = [
        `Agent${i.toString().padStart(6, '0')}`,
        models[i % models.length],
        `/workspace/agent${i}`,
        `tag${Math.floor(i / 100)},batch${Math.floor(i / 1000)}`,
        2048 + (i % 4) * 1024, // 2GB to 6GB
        2 + (i % 4), // 2 to 5 cores
        i % 2 === 0 ? 'true' : 'false'
      ].join(',');
      
      rows.push(row);
    }
    
    return header + rows.join('\n');
  }

  generateMockAgents(count) {
    const agents = [];
    const models = ['claude-3-sonnet', 'gpt-4o', 'claude-3-haiku', 'gpt-4o-mini'];
    
    for (let i = 1; i <= count; i++) {
      agents.push({
        id: `agent-${i}`,
        name: `Agent${i}`,
        model: models[i % models.length],
        status: i % 3 === 0 ? 'running' : 'idle',
        workspace: `/workspace/agent${i}`,
        createdAt: new Date().toISOString(),
        tags: [`tag${Math.floor(i / 100)}`],
        resourceLimits: {
          memory: 2048 + (i % 4) * 1024,
          cpu: 2 + (i % 4)
        }
      });
    }
    
    return agents;
  }

  generatePerformanceReport() {
    console.log('📊 Performance Report Summary:\n');

    // Analysis performance
    console.log('🔍 Column Detection Performance:');
    Object.entries(this.results.columnDetection).forEach(([size, data]) => {
      const throughput = data.fileSizeKB / (data.time / 1000); // KB/sec
      console.log(`   ${size}: ${data.time.toFixed(2)}ms (${throughput.toFixed(0)} KB/sec)`);
    });

    // Import performance 
    console.log('\n📥 Import Performance:');
    Object.entries(this.results.import).forEach(([size, data]) => {
      const rowsPerSec = (data.successful / (data.time / 1000)).toFixed(0);
      console.log(`   ${size}: ${data.time.toFixed(2)}ms (${rowsPerSec} rows/sec)`);
    });

    // Memory efficiency
    console.log('\n💾 Memory Efficiency:');
    Object.entries(this.results.memoryUsage).forEach(([size, data]) => {
      const efficiency = (data.fileSizeKB / 1024) / data.heapDelta; // File MB per heap MB
      console.log(`   ${size}: +${data.heapDelta}MB heap (${efficiency.toFixed(1)}x file size)`);
    });

    // Performance targets
    console.log('\n🎯 Performance Target Analysis:');
    const largeFileResult = this.results.import['Large (10K rows)'];
    if (largeFileResult) {
      const target10kTime = 5000; // 5 seconds for 10k rows
      const meets10kTarget = largeFileResult.time <= target10kTime;
      console.log(`   10K rows in ${largeFileResult.time.toFixed(0)}ms (target: ${target10kTime}ms) ${meets10kTarget ? '✅' : '❌'}`);
    }

    const memoryEfficiency = this.results.memoryUsage['Large (10K rows)'];
    if (memoryEfficiency) {
      const memoryTarget = 50; // Max 50MB additional heap for 10k rows
      const meetsMemoryTarget = memoryEfficiency.heapDelta <= memoryTarget;
      console.log(`   Memory usage: ${memoryEfficiency.heapDelta}MB (target: <${memoryTarget}MB) ${meetsMemoryTarget ? '✅' : '❌'}`);
    }
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `csv-performance-results-${timestamp}.json`;
    
    await writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to ${filename}`);
  }
}

// Run performance tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CSVPerformanceTester();
  tester.runPerformanceTests()
    .then(() => tester.saveResults())
    .catch(console.error);
}

export { CSVPerformanceTester };