#!/usr/bin/env node

/**
 * Contrast Validation CI/CD Script
 * Validates WCAG AAA compliance for all critical color combinations
 * Usage: npm run validate:contrast
 */

// Since this is TypeScript, we need to use a different approach for CI/CD
// Let's create a simple validation using the existing Jest test instead
const { spawn } = require('child_process');

function runContrastTests() {
  return new Promise((resolve, reject) => {
    // Use cmd.exe on Windows to run npm commands
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'cmd' : 'npm';
    const args = isWindows ? ['/c', 'npm', 'run', 'test:contrast'] : ['run', 'test:contrast'];
    
    const testProcess = spawn(command, args, { stdio: 'pipe' });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject({ success: false, output, errorOutput });
      }
    });
  });
}

async function runContrastValidation() {
  console.log('🎨 Starting WCAG AAA Contrast Validation...\n');
  
  try {
    const result = await runContrastTests();
    
    // Parse test output for meaningful reporting
    if (result.output.includes('All tests passed')) {
      console.log('✅ All contrast validation tests passed!');
    }
    
    // Show key metrics from test output
    const testSummary = result.output.match(/Test Suites:.*\n.*Tests:.*\n/);
    if (testSummary) {
      console.log('\n📊 Test Summary:');
      console.log(testSummary[0].trim());
    }
    
    console.log('\n🎉 WCAG AAA Contrast Validation completed successfully!');
    console.log('✅ All critical color combinations meet accessibility standards (7:1 minimum)');
    console.log('✅ Automated regression testing for contrast ratios configured');
    console.log('✅ CI/CD pipeline integration ready');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Contrast Validation Failed:');
    console.error('Test output:', error.output);
    if (error.errorOutput) {
      console.error('Errors:', error.errorOutput);
    }
    console.error('\n💡 Fix required: Color combinations do not meet WCAG AAA accessibility standards.');
    console.error('   All critical text-background combinations must have 7:1 minimum contrast ratio.');
    console.error('   Run "npm run test:contrast" for detailed failure information.');
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run validation
runContrastValidation();