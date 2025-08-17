#!/usr/bin/env node

/**
 * Generate coverage badge from vitest coverage results
 * Reads coverage-summary.json and generates a shield.io style badge
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_SUMMARY_PATH = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
const BADGE_OUTPUT_PATH = path.join(process.cwd(), 'coverage', 'badge.svg');
const README_PATH = path.join(process.cwd(), 'README.md');

// Color thresholds for badge
const getColor = (percentage) => {
  if (percentage >= 90) return 'brightgreen';
  if (percentage >= 80) return 'green';
  if (percentage >= 70) return 'yellow';
  if (percentage >= 60) return 'orange';
  return 'red';
};

// Generate shield.io URL
const generateBadgeUrl = (percentage) => {
  const color = getColor(percentage);
  return `https://img.shields.io/badge/coverage-${percentage}%25-${color}.svg`;
};

// Fetch SVG content from shield.io
const fetchBadgeSvg = async (url) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn('Failed to fetch badge from shield.io, generating local badge');
    return generateLocalBadge(url.match(/coverage-(\d+)%25/)[1]);
  }
};

// Generate a simple local SVG badge as fallback
const generateLocalBadge = (percentage) => {
  const color = getColor(percentage);
  const colorValue = {
    brightgreen: '#4c1',
    green: '#97ca00',
    yellow: '#dfb317',
    orange: '#fe7d37',
    red: '#e05d44'
  }[color];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="104" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h63v20H0z"/>
      <path fill="${colorValue}" d="M63 0h41v20H63z"/>
      <path fill="url(#b)" d="M0 0h104v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
      <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">coverage</text>
      <text x="325" y="140" transform="scale(.1)" textLength="530">coverage</text>
      <text x="825" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="310">${percentage}%</text>
      <text x="825" y="140" transform="scale(.1)" textLength="310">${percentage}%</text>
    </g>
  </svg>`;
};

// Update README with coverage badge
const updateReadmeWithBadge = (percentage) => {
  if (!fs.existsSync(README_PATH)) {
    console.warn('README.md not found, skipping badge update');
    return;
  }

  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const badgeUrl = generateBadgeUrl(percentage);
  const badgeMarkdown = `![Coverage](${badgeUrl})`;
  
  // Replace existing coverage badge or add new one
  const coverageBadgeRegex = /!\[Coverage\]\([^)]+\)/;
  
  let updatedContent;
  if (coverageBadgeRegex.test(readmeContent)) {
    updatedContent = readmeContent.replace(coverageBadgeRegex, badgeMarkdown);
    console.log('Updated existing coverage badge in README.md');
  } else {
    // Add badge after the title if no existing badge found
    const titleRegex = /^(# .+)$/m;
    if (titleRegex.test(readmeContent)) {
      updatedContent = readmeContent.replace(titleRegex, `$1\n\n${badgeMarkdown}`);
      console.log('Added coverage badge to README.md');
    } else {
      // Add at the beginning if no title found
      updatedContent = `${badgeMarkdown}\n\n${readmeContent}`;
      console.log('Added coverage badge at the beginning of README.md');
    }
  }
  
  fs.writeFileSync(README_PATH, updatedContent);
};

// Main function
const generateCoverageBadge = async () => {
  try {
    // Check if coverage summary exists
    if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
      console.error('Coverage summary not found. Run "pnpm test:coverage" first.');
      process.exit(1);
    }

    // Read coverage summary
    const coverageData = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
    
    // Extract total coverage percentage
    const totalCoverage = coverageData.total;
    if (!totalCoverage) {
      console.error('Invalid coverage data format');
      process.exit(1);
    }

    // Calculate overall coverage percentage (average of lines, statements, functions, branches)
    const linesPct = totalCoverage.lines?.pct || 0;
    const statementsPct = totalCoverage.statements?.pct || 0;
    const functionsPct = totalCoverage.functions?.pct || 0;
    const branchesPct = totalCoverage.branches?.pct || 0;
    
    const overallPct = Math.round((linesPct + statementsPct + functionsPct + branchesPct) / 4);

    console.log('Coverage Summary:');
    console.log(`  Lines: ${linesPct}%`);
    console.log(`  Statements: ${statementsPct}%`);
    console.log(`  Functions: ${functionsPct}%`);
    console.log(`  Branches: ${branchesPct}%`);
    console.log(`  Overall: ${overallPct}%`);

    // Generate badge
    const badgeUrl = generateBadgeUrl(overallPct);
    console.log(`Generating badge: ${badgeUrl}`);

    // Fetch and save badge SVG
    const badgeSvg = await fetchBadgeSvg(badgeUrl);
    
    // Ensure coverage directory exists
    const coverageDir = path.dirname(BADGE_OUTPUT_PATH);
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }
    
    fs.writeFileSync(BADGE_OUTPUT_PATH, badgeSvg);
    console.log(`Coverage badge saved to: ${BADGE_OUTPUT_PATH}`);

    // Update README
    updateReadmeWithBadge(overallPct);

    // Create a JSON file with coverage info for other tools
    const badgeInfo = {
      overall: overallPct,
      lines: linesPct,
      statements: statementsPct,
      functions: functionsPct,
      branches: branchesPct,
      timestamp: new Date().toISOString(),
      badge_url: badgeUrl
    };
    
    fs.writeFileSync(
      path.join(coverageDir, 'badge-info.json'),
      JSON.stringify(badgeInfo, null, 2)
    );

    console.log('✅ Coverage badge generation completed successfully!');

  } catch (error) {
    console.error('❌ Error generating coverage badge:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  generateCoverageBadge();
}

module.exports = { generateCoverageBadge, getColor, generateBadgeUrl };