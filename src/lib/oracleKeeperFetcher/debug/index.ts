/**
 * Oracle Keeper Debugging Tools
 * 
 * This package provides comprehensive tools for diagnosing issues with 
 * the Oracle Keeper integration. It includes utilities for testing 
 * network connectivity, cache functionality, and fallback mechanisms.
 */

export { 
  OracleKeeperDebugger, 
  DebugLevel, 
  DebugModule,
  debugger as defaultDebugger,
  debugOracleKeeper 
} from './oracleKeeperDebugger';

export { default as OracleKeeperDebugPage } from './OracleKeeperDebugPage';

/**
 * Quick test function to diagnose Oracle Keeper issues
 * Call this from the browser console to run a diagnostic
 */
export const runDiagnostic = async (): Promise<void> => {
  console.group('Oracle Keeper Diagnostic');
  console.log('Starting diagnostic tests...');
  
  try {
    const { debugOracleKeeper } = await import('./oracleKeeperDebugger');
    await debugOracleKeeper();
    console.log('Diagnostic complete! Check the logs above for details.');
  } catch (error) {
    console.error('Diagnostic failed:', error);
  } finally {
    console.groupEnd();
  }
};

// Running immediately in development mode for quick diagnostics
if (process.env.NODE_ENV === 'development') {
  console.log('%cOracle Keeper Debugging Enabled', 'background: #0066cc; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
}

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).oracleKeeperDiagnostic = {
    runDiagnostic
  };
  
  // Create a global event to capture diagnostic results
  (window as any).oracleKeeperDiagnosticResults = [];
  (window as any).oracleKeeperDiagnosticStatus = 'idle';
  
  // Add special debugging routes via hash-based navigation for easy access
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#oracle-debug') {
      console.log('Triggered Oracle Keeper Debug mode');
      runDiagnostic();
    }
  });
  
  console.log(
    '%cOracle Keeper Diagnostic Tools Available',
    'background: #0066cc; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log(
    'Run diagnostic tests with: %coracleKeeperDiagnostic.runDiagnostic()',
    'font-family: monospace; font-weight: bold;'
  );
  console.log(
    'Or navigate to: %c#oracle-debug',
    'font-family: monospace; font-weight: bold;'
  );
}
