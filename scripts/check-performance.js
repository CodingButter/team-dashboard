#!/usr/bin/env node

/**
 * Performance threshold checker for CI/CD pipeline
 * Validates that performance metrics meet required thresholds
 */

const fs = require('fs');
const path = require('path');

// Performance thresholds
const THRESHOLDS = {
  WEBSOCKET_LATENCY_MS: 50,
  PAGE_LOAD_TIME_MS: 2000,
  MEMORY_USAGE_MB: 500,
  BUNDLE_SIZE_MB: 5,
  TIME_TO_INTERACTIVE_MS: 3000,
  FIRST_CONTENTFUL_PAINT_MS: 1500,
};

// Mock performance data structure (in real implementation, this would come from actual tests)
const mockPerformanceData = {
  websocketLatency: Math.random() * 100, // Random for demonstration
  pageLoadTime: Math.random() * 3000,
  memoryUsage: Math.random() * 600,
  bundleSize: Math.random() * 7,
  timeToInteractive: Math.random() * 4000,
  firstContentfulPaint: Math.random() * 2000,
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Helper function to format output
const formatResult = (name, value, threshold, unit, passed) => {
  const color = passed ? colors.green : colors.red;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
  return `${color}${status}${colors.reset} ${name}: ${formattedValue}${unit} (threshold: ${threshold}${unit})`;
};

// Read performance data from file if it exists
const readPerformanceData = () => {
  const performanceFilePath = path.join(process.cwd(), 'coverage', 'performance-results.json');
  
  if (fs.existsSync(performanceFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(performanceFilePath, 'utf8'));
      console.log(`${colors.blue}📊 Reading performance data from: ${performanceFilePath}${colors.reset}`);
      return data;
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Failed to read performance data file, using mock data${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠️  Performance data file not found, using mock data for demonstration${colors.reset}`);
  }
  
  return mockPerformanceData;
};

// Save performance results
const savePerformanceResults = (results) => {
  const coverageDir = path.join(process.cwd(), 'coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  const resultsPath = path.join(coverageDir, 'performance-check-results.json');
  const resultsData = {
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      success: results.every(r => r.passed),
    },
  };
  
  fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
  console.log(`\n${colors.blue}📄 Performance results saved to: ${resultsPath}${colors.reset}`);
};

// Main performance check function
const checkPerformance = () => {
  console.log(`${colors.bold}🚀 Performance Threshold Checker${colors.reset}\n`);
  
  const performanceData = readPerformanceData();
  const results = [];
  
  // WebSocket Latency Check
  const websocketPassed = performanceData.websocketLatency <= THRESHOLDS.WEBSOCKET_LATENCY_MS;
  results.push({
    name: 'WebSocket Latency',
    value: performanceData.websocketLatency,
    threshold: THRESHOLDS.WEBSOCKET_LATENCY_MS,
    unit: 'ms',
    passed: websocketPassed,
  });
  console.log(formatResult(
    'WebSocket Latency',
    performanceData.websocketLatency,
    THRESHOLDS.WEBSOCKET_LATENCY_MS,
    'ms',
    websocketPassed
  ));
  
  // Page Load Time Check
  const pageLoadPassed = performanceData.pageLoadTime <= THRESHOLDS.PAGE_LOAD_TIME_MS;
  results.push({
    name: 'Page Load Time',
    value: performanceData.pageLoadTime,
    threshold: THRESHOLDS.PAGE_LOAD_TIME_MS,
    unit: 'ms',
    passed: pageLoadPassed,
  });
  console.log(formatResult(
    'Page Load Time',
    performanceData.pageLoadTime,
    THRESHOLDS.PAGE_LOAD_TIME_MS,
    'ms',
    pageLoadPassed
  ));
  
  // Memory Usage Check
  const memoryPassed = performanceData.memoryUsage <= THRESHOLDS.MEMORY_USAGE_MB;
  results.push({
    name: 'Memory Usage',
    value: performanceData.memoryUsage,
    threshold: THRESHOLDS.MEMORY_USAGE_MB,
    unit: 'MB',
    passed: memoryPassed,
  });
  console.log(formatResult(
    'Memory Usage',
    performanceData.memoryUsage,
    THRESHOLDS.MEMORY_USAGE_MB,
    'MB',
    memoryPassed
  ));
  
  // Bundle Size Check
  const bundlePassed = performanceData.bundleSize <= THRESHOLDS.BUNDLE_SIZE_MB;
  results.push({
    name: 'Bundle Size',
    value: performanceData.bundleSize,
    threshold: THRESHOLDS.BUNDLE_SIZE_MB,
    unit: 'MB',
    passed: bundlePassed,
  });
  console.log(formatResult(
    'Bundle Size',
    performanceData.bundleSize,
    THRESHOLDS.BUNDLE_SIZE_MB,
    'MB',
    bundlePassed
  ));
  
  // Time to Interactive Check
  const ttiPassed = performanceData.timeToInteractive <= THRESHOLDS.TIME_TO_INTERACTIVE_MS;
  results.push({
    name: 'Time to Interactive',
    value: performanceData.timeToInteractive,
    threshold: THRESHOLDS.TIME_TO_INTERACTIVE_MS,
    unit: 'ms',
    passed: ttiPassed,
  });
  console.log(formatResult(
    'Time to Interactive',
    performanceData.timeToInteractive,
    THRESHOLDS.TIME_TO_INTERACTIVE_MS,
    'ms',
    ttiPassed
  ));
  
  // First Contentful Paint Check
  const fcpPassed = performanceData.firstContentfulPaint <= THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS;
  results.push({
    name: 'First Contentful Paint',
    value: performanceData.firstContentfulPaint,
    threshold: THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS,
    unit: 'ms',
    passed: fcpPassed,
  });
  console.log(formatResult(
    'First Contentful Paint',
    performanceData.firstContentfulPaint,
    THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS,
    'ms',
    fcpPassed
  ));
  
  // Summary
  const allPassed = results.every(result => result.passed);
  const passedCount = results.filter(result => result.passed).length;
  const totalCount = results.length;
  
  console.log(`\n${colors.bold}📋 Summary:${colors.reset}`);
  console.log(`${colors.blue}Total checks: ${totalCount}${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalCount - passedCount}${colors.reset}`);
  
  if (allPassed) {
    console.log(`\n${colors.green}${colors.bold}🎉 All performance checks passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  Some performance checks failed!${colors.reset}`);
  }
  
  // Save results
  savePerformanceResults(results);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
};

// Run if called directly
if (require.main === module) {
  checkPerformance();
}

module.exports = { 
  checkPerformance, 
  THRESHOLDS, 
  formatResult, 
  readPerformanceData 
};