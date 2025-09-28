#!/usr/bin/env node

/**
 * Test Script for Build Script
 * 
 * This script runs various tests to ensure the build script works correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

function log(message, level = 'info') {
  const prefix = {
    'info': '📋',
    'pass': '✅',
    'fail': '❌',
    'warn': '⚠️'
  }[level] || '📋';
  
  console.log(`${prefix} ${message}`);
}

function runTest(name, command) {
  log(`Testing: ${name}`);
  try {
    const output = execSync(command, { 
      encoding: 'utf-8', 
      cwd: root,
      stdio: 'pipe'
    });
    log(`✓ ${name}`, 'pass');
    return true;
  } catch (error) {
    log(`✗ ${name}: ${error.message.split('\n')[0]}`, 'fail');
    return false;
  }
}

function checkFileExists(name, filePath) {
  log(`Checking: ${name}`);
  if (fs.existsSync(path.join(root, filePath))) {
    log(`✓ ${name}`, 'pass');
    return true;
  } else {
    log(`✗ ${name}: File not found`, 'fail');
    return false;
  }
}

function main() {
  log('Starting Build Script Tests\n');
  
  let passed = 0;
  let total = 0;
  
  // Test file existence
  const fileTests = [
    ['Build script exists', 'scripts/build.js'],
    ['EAS config exists', 'eas.json'],
    ['App config exists', 'app.json'],
    ['Package.json exists', 'package.json'],
    ['Build documentation exists', 'docs/build-script.md']
  ];
  
  fileTests.forEach(([name, path]) => {
    total++;
    if (checkFileExists(name, path)) passed++;
  });
  
  // Test script commands
  const commandTests = [
    ['Help command', 'node scripts/build.js --help'],
    ['Dry-run all platforms', 'node scripts/build.js --dry-run --local'],
    ['Dry-run Android only', 'node scripts/build.js --dry-run --local --platform android'],
    ['Dry-run iOS only', 'node scripts/build.js --dry-run --local --platform ios'],
    ['Production profile dry-run', 'node scripts/build.js --dry-run --local --profile production'],
    ['Development profile dry-run', 'node scripts/build.js --dry-run --local --profile development']
  ];
  
  commandTests.forEach(([name, command]) => {
    total++;
    if (runTest(name, command)) passed++;
  });
  
  // Test NPM scripts
  const npmTests = [
    ['NPM build dry-run', 'npm run build:dry-run'],
    ['NPM build Android dry-run', 'npm run build:android -- --dry-run --local'],
    ['NPM build iOS dry-run', 'npm run build:ios -- --dry-run --local']
  ];
  
  npmTests.forEach(([name, command]) => {
    total++;
    if (runTest(name, command)) passed++;
  });
  
  log(`\nTest Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    log('All tests passed! 🎉', 'pass');
    process.exit(0);
  } else {
    log(`${total - passed} tests failed`, 'fail');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}