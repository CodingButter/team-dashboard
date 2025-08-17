/**
 * Comprehensive Column Detection Accuracy Test
 * Tests the intelligent column mapping system with 95% accuracy target
 */

import { readFile } from 'fs/promises';
import { AgentCSVService } from './services/agent-manager/src/csv/agent-csv-service.js';

const csvService = new AgentCSVService();

// Test cases for column detection accuracy
const testCases = [
  {
    name: 'Standard Headers',
    file: 'test-data/agents-valid-standard.csv',
    expectedMappings: {
      'name': 'name',
      'model': 'model', 
      'workspace': 'workspace',
      'tags': 'tags',
      'memoryLimit': 'memoryLimit',
      'cpuCores': 'cpuCores',
      'autoStart': 'autoStart'
    }
  },
  {
    name: 'Fuzzy Headers',
    file: 'test-data/agents-fuzzy-headers.csv',
    expectedMappings: {
      'Agent Name': 'name',
      'AI Model': 'model',
      'Directory Path': 'workspace',
      'Labels': 'tags',
      'Memory MB': 'memoryLimit',
      'CPU Count': 'cpuCores',
      'Auto Start': 'autoStart'
    }
  }
];

async function testColumnDetectionAccuracy() {
  console.log('🔍 Testing Column Detection Accuracy...\n');
  
  let totalTests = 0;
  let correctMappings = 0;
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const csvContent = await readFile(testCase.file, 'utf-8');
      const analysis = await csvService.analyzeCSV(csvContent);
      
      console.log(`   Overall Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      
      // Check each expected mapping
      for (const [csvColumn, expectedField] of Object.entries(testCase.expectedMappings)) {
        totalTests++;
        const actualMapping = analysis.recommendedMapping[csvColumn];
        
        if (actualMapping === expectedField) {
          correctMappings++;
          console.log(`   ✅ "${csvColumn}" → "${expectedField}" (confidence: ${getColumnConfidence(analysis.detectedColumns, csvColumn)}%)`);
        } else {
          console.log(`   ❌ "${csvColumn}" → "${actualMapping}" (expected: "${expectedField}")`);
        }
      }
      
      console.log(`   Detected Columns: ${analysis.detectedColumns.length}`);
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  const accuracy = (correctMappings / totalTests) * 100;
  const targetAccuracy = 95;
  
  console.log('📊 Column Detection Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Correct Mappings: ${correctMappings}`);
  console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`   Target: ${targetAccuracy}%`);
  
  if (accuracy >= targetAccuracy) {
    console.log(`   🎯 SUCCESS: Met accuracy target!`);
  } else {
    console.log(`   ⚠️  NEEDS IMPROVEMENT: Below target by ${(targetAccuracy - accuracy).toFixed(1)}%`);
  }
  
  return { accuracy, targetMet: accuracy >= targetAccuracy };
}

function getColumnConfidence(detectedColumns, columnName) {
  const column = detectedColumns.find(c => c.column === columnName);
  return column ? Math.round(column.confidence * 100) : 0;
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testColumnDetectionAccuracy().catch(console.error);
}

export { testColumnDetectionAccuracy };