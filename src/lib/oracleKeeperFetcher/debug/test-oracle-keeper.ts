/**
 * Oracle Keeper CLI Test Script
 * 
 * Run this script with ts-node to perform diagnostics on the Oracle Keeper integration
 * Usage: npx ts-node test-oracle-keeper.ts [--url=https://custom-url.com]
 */

import { OracleKeeperDebugger, DebugLevel } from './oracleKeeperDebugger';
import { DEFAULT_ORACLE_KEEPER_URL } from '../oracleKeeperConstants';

// Parse command line arguments
const args = process.argv.slice(2);
let oracleUrl = DEFAULT_ORACLE_KEEPER_URL;

// Extract custom URL if provided
const urlArg = args.find(arg => arg.startsWith('--url='));
if (urlArg) {
  oracleUrl = urlArg.split('=')[1];
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log('\n==================================');
  console.log('Oracle Keeper Diagnostic Tool');
  console.log('==================================\n');
  console.log(`Testing Oracle Keeper at: ${oracleUrl}\n`);
  
  // Create debugger instance
  const oracleDebugger = new OracleKeeperDebugger(oracleUrl, true);
  
  try {
    // Run all tests
    console.log('Running diagnostic tests...\n');
    const { success, results } = await oracleDebugger.runAllTests();
    
    // Print summary
    console.log('\n==================================');
    console.log('Test Results Summary');
    console.log('==================================');
    
    // Display results table
    console.log('\nTest                  | Result ');
    console.log('----------------------|--------');
    
    Object.entries(results).forEach(([test, result]) => {
      const testName = test.padEnd(22, ' ');
      const resultText = result ? '✓ PASS' : '✗ FAIL';
      console.log(`${testName}| ${resultText}`);
    });
    
    // Print overall status
    console.log('\n==================================');
    console.log(`Overall Status: ${success ? '✓ PASSED' : '✗ FAILED'}`);
    console.log('==================================\n');
    
    // Export logs to file if any test failed
    if (!success) {
      const fs = require('fs');
      const logFilePath = './oracle-keeper-debug-logs.json';
      
      fs.writeFileSync(
        logFilePath, 
        oracleDebugger.exportLogs(),
        'utf8'
      );
      
      console.log(`Debug logs exported to: ${logFilePath}`);
      console.log('Please include these logs when reporting issues.\n');
    }
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
