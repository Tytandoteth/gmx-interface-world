/**
 * World Chain Debug Module
 * Central entry point for all diagnostic and debugging utilities
 */

import { WorldLogger, initializeDebugTools } from '../debug';
import { initDiagnostics, logDiagnosticEvent, DIAGNOSTIC_EVENTS } from './diagnosticController';
import { reportConfigValidation } from './configurationValidator';
import { depCheck } from './compatibility';

/**
 * Initialize all debugging tools
 * Call this once at application startup
 */
export const initializeWorldChainDebugging = (): void => {
  try {
    // Initialize basic debug tools
    initializeDebugTools();
    
    // Initialize diagnostic controller
    initDiagnostics();
    
    // Report configuration validation
    reportConfigValidation();
    
    // Log missing dependencies
    depCheck.logMissingDeps();
    
    // Log successful initialization
    logDiagnosticEvent(DIAGNOSTIC_EVENTS.APP_LOAD, {
      message: 'World Chain debugging initialized successfully'
    });
    
    WorldLogger.info('World Chain debugging initialized successfully');
    
    // Log to console for visibility
    console.group('%c🔍 World Chain Debugging Tools', 'color: #1b73e8; font-weight: bold;');
    console.info('Debug tools have been initialized. Access via:');
    console.info('- window.__WORLD_CHAIN_DEBUG__');
    console.info('- window.__WORLD_CHAIN_DIAGNOSTICS__');
    console.groupEnd();
  } catch (error) {
    console.error('Failed to initialize World Chain debugging:', error);
  }
};

// Re-export all debugging utilities
export * from '../debug';
export * from './diagnosticController';
export * from './configurationValidator';
export * from './compatibility';
