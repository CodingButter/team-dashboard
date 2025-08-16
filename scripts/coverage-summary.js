#!/usr/bin/env node

/**
 * Coverage summary reporter
 * Generates a comprehensive coverage summary for CI/CD and development
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// Coverage thresholds
const THRESHOLDS = {
  HIGH: 90,
  GOOD: 80,
  MEDIUM: 70,
  LOW: 60,
};

// Get color based on coverage percentage
const getCoverageColor = (percentage) => {
  if (percentage >= THRESHOLDS.HIGH) return colors.green;
  if (percentage >= THRESHOLDS.GOOD) return colors.cyan;
  if (percentage >= THRESHOLDS.MEDIUM) return colors.yellow;
  if (percentage >= THRESHOLDS.LOW) return colors.magenta;
  return colors.red;
};

// Format percentage with color
const formatPercentage = (percentage) => {
  const color = getCoverageColor(percentage);
  return `${color}${percentage.toFixed(2)}%${colors.reset}`;
};

// Format coverage bar
const formatCoverageBar = (percentage, width = 20) => {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const color = getCoverageColor(percentage);
  
  return `${color}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
};

// Generate coverage summary
const generateCoverageSummary = () => {
  try {
    // Check if coverage summary exists
    if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
      console.error(`${colors.red}❌ Coverage summary not found at: ${COVERAGE_SUMMARY_PATH}${colors.reset}`);
      console.log(`${colors.yellow}💡 Run "pnpm test:coverage" first to generate coverage data${colors.reset}`);
      process.exit(1);
    }

    // Read coverage data
    const coverageData = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
    
    console.log(`${colors.bold}${colors.cyan}📊 Code Coverage Summary${colors.reset}\n`);

    // Total coverage
    const total = coverageData.total;
    if (total) {
      console.log(`${colors.bold}Overall Coverage:${colors.reset}`);
      console.log(`  Lines:      ${formatCoverageBar(total.lines.pct)} ${formatPercentage(total.lines.pct)} (${total.lines.covered}/${total.lines.total})`);
      console.log(`  Statements: ${formatCoverageBar(total.statements.pct)} ${formatPercentage(total.statements.pct)} (${total.statements.covered}/${total.statements.total})`);
      console.log(`  Functions:  ${formatCoverageBar(total.functions.pct)} ${formatPercentage(total.functions.pct)} (${total.functions.covered}/${total.functions.total})`);
      console.log(`  Branches:   ${formatCoverageBar(total.branches.pct)} ${formatPercentage(total.branches.pct)} (${total.branches.covered}/${total.branches.total})`);
      
      // Calculate overall percentage
      const overall = (total.lines.pct + total.statements.pct + total.functions.pct + total.branches.pct) / 4;
      console.log(`${colors.bold}  Overall:    ${formatCoverageBar(overall)} ${formatPercentage(overall)}${colors.reset}\n`);
    }

    // File-by-file breakdown
    const files = Object.keys(coverageData).filter(key => key !== 'total');
    if (files.length > 0) {
      console.log(`${colors.bold}File Breakdown:${colors.reset}`);
      
      // Sort files by overall coverage (ascending)
      const sortedFiles = files
        .map(file => {
          const data = coverageData[file];
          const overall = (data.lines.pct + data.statements.pct + data.functions.pct + data.branches.pct) / 4;
          return { file, data, overall };
        })
        .sort((a, b) => a.overall - b.overall);

      // Show worst performing files first
      const worstFiles = sortedFiles.slice(0, 10);
      worstFiles.forEach(({ file, data, overall }) => {
        const fileName = path.basename(file);
        const dirName = path.dirname(file).split('/').slice(-2).join('/');
        console.log(`  ${formatPercentage(overall)} ${colors.dim}${dirName}/${colors.reset}${fileName}`);
      });

      if (sortedFiles.length > 10) {
        console.log(`  ${colors.dim}... and ${sortedFiles.length - 10} more files${colors.reset}`);
      }
    }

    // Coverage thresholds check
    console.log(`\n${colors.bold}Threshold Analysis:${colors.reset}`);
    const thresholdChecks = [
      { name: 'Lines', value: total.lines.pct, threshold: 80 },
      { name: 'Statements', value: total.statements.pct, threshold: 80 },
      { name: 'Functions', value: total.functions.pct, threshold: 80 },
      { name: 'Branches', value: total.branches.pct, threshold: 80 },
    ];

    thresholdChecks.forEach(({ name, value, threshold }) => {
      const passed = value >= threshold;
      const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
      console.log(`  ${name}: ${status} ${formatPercentage(value)} (threshold: ${threshold}%)`);
    });

    // Quality assessment
    const overallPct = (total.lines.pct + total.statements.pct + total.functions.pct + total.branches.pct) / 4;
    console.log(`\n${colors.bold}Quality Assessment:${colors.reset}`);
    
    if (overallPct >= THRESHOLDS.HIGH) {
      console.log(`  ${colors.green}🎉 Excellent coverage! Your code is well tested.${colors.reset}`);
    } else if (overallPct >= THRESHOLDS.GOOD) {
      console.log(`  ${colors.cyan}👍 Good coverage! Consider adding tests for edge cases.${colors.reset}`);
    } else if (overallPct >= THRESHOLDS.MEDIUM) {
      console.log(`  ${colors.yellow}⚠️  Moderate coverage. More tests needed for critical paths.${colors.reset}`);
    } else if (overallPct >= THRESHOLDS.LOW) {
      console.log(`  ${colors.magenta}🔍 Low coverage. Significant testing effort required.${colors.reset}`);
    } else {
      console.log(`  ${colors.red}🚨 Very low coverage! Testing is critical for code quality.${colors.reset}`);
    }

    // Recommendations
    if (overallPct < THRESHOLDS.GOOD) {
      console.log(`\n${colors.bold}Recommendations:${colors.reset}`);
      console.log(`  • Focus on testing the least covered files shown above`);
      console.log(`  • Add unit tests for utility functions and core business logic`);
      console.log(`  • Consider integration tests for component interactions`);
      console.log(`  • Use "pnpm test:coverage:watch" for iterative development`);
    }

    // Output file paths for CI
    console.log(`\n${colors.bold}Report Files:${colors.reset}`);
    console.log(`  HTML Report: ${colors.blue}coverage/index.html${colors.reset}`);
    console.log(`  LCOV Report: ${colors.blue}coverage/lcov.info${colors.reset}`);
    console.log(`  JSON Report: ${colors.blue}coverage/coverage-final.json${colors.reset}`);
    console.log(`  Cobertura:   ${colors.blue}coverage/cobertura-coverage.xml${colors.reset}`);

    return true;

  } catch (error) {
    console.error(`${colors.red}❌ Error generating coverage summary: ${error.message}${colors.reset}`);
    return false;
  }
};

// Run if called directly
if (require.main === module) {
  const success = generateCoverageSummary();
  process.exit(success ? 0 : 1);
}

module.exports = { 
  generateCoverageSummary, 
  formatPercentage, 
  formatCoverageBar, 
  getCoverageColor 
};