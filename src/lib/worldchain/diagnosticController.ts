/**
 * World Chain Diagnostic Controller
 * Provides centralized diagnostics for World Chain integration
 */

import { WorldLogger } from '../debug';
import { logStartupDiagnostics } from './bootLogger';
import { validateWorldChainConfig } from './configurationValidator';
import { depCheck, ethersUtils } from './compatibility';

// Define diagnostic events we want to track
const DIAGNOSTIC_EVENTS = {
  APP_LOAD: 'app_load',
  WORLD_CONTEXT_INIT: 'world_context_init',
  ORACLE_KEEPER_CONNECT: 'oracle_keeper_connect',
  CONTRACT_CONNECT: 'contract_connect',
  SWAP_ATTEMPT: 'swap_attempt',
  TRANSACTION_SUBMIT: 'transaction_submit',
  TRANSACTION_COMPLETE: 'transaction_complete',
  ERROR: 'error'
};

// Store for diagnostic data
let diagnosticStore: {
  events: Array<{eventType: string, timestamp: number, data: any}>;
  errors: Array<{message: string, timestamp: number, data: any}>;
  initialized: boolean;
  config: Record<string, any>;
} = {
  events: [],
  errors: [],
  initialized: false,
  config: {}
};

/**
 * Initialize the diagnostic controller
 */
export const initDiagnostics = (): void => {
  if (diagnosticStore.initialized) {
    WorldLogger.warn('Diagnostic controller already initialized');
    return;
  }
  
  WorldLogger.info('Initializing World Chain diagnostic controller');
  
  // Run startup diagnostics
  logStartupDiagnostics();
  
  // Check for missing dependencies
  depCheck.logMissingDeps();
  
  // Set up global error handler
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      // Call original handler if it exists
      if (typeof originalOnError === 'function') {
        originalOnError(message, source, lineno, colno, error);
      }
      
      // Log error to our diagnostic store
      logDiagnosticEvent(DIAGNOSTIC_EVENTS.ERROR, { 
        message, 
        source, 
        lineno, 
        colno, 
        error: error ? error.toString() : null,
        stack: error?.stack
      });
    };
    
    // Expose diagnostic tools to window
    (window as any).__WORLD_CHAIN_DIAGNOSTICS__ = {
      getReport: getDiagnosticReport,
      clearErrors: clearDiagnosticErrors,
      events: diagnosticStore.events,
      config: diagnosticStore.config
    };
  }
  
  // Track configuration
  trackConfiguration();
  
  // Record initialization
  logDiagnosticEvent(DIAGNOSTIC_EVENTS.APP_LOAD, {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });
  
  diagnosticStore.initialized = true;
  
  WorldLogger.info('Diagnostic controller initialized successfully');
};

/**
 * Track important configuration values
 */
const trackConfiguration = (): void => {
  diagnosticStore.config = {
    environment: import.meta.env.MODE,
    worldChainUrl: import.meta.env.VITE_APP_WORLD_CHAIN_URL,
    oracleKeeperUrl: import.meta.env.VITE_APP_ORACLE_KEEPER_URL,
    productionMode: import.meta.env.VITE_APP_USE_PRODUCTION_MODE === 'true',
    vaultAddress: import.meta.env.VITE_APP_WORLD_VAULT_ADDRESS,
    routerAddress: import.meta.env.VITE_APP_WORLD_ROUTER_ADDRESS,
    logLevel: import.meta.env.VITE_APP_LOG_LEVEL,
    configValid: validateWorldChainConfig().isValid
  };
};

/**
 * Log a diagnostic event
 * @param eventType Type of event
 * @param data Additional data for the event
 */
export const logDiagnosticEvent = (eventType: string, data: any = {}): void => {
  const event = {
    eventType,
    timestamp: Date.now(),
    data
  };
  
  diagnosticStore.events.push(event);
  
  // Keep diagnostics from growing too large
  if (diagnosticStore.events.length > 100) {
    diagnosticStore.events = diagnosticStore.events.slice(-100);
  }
  
  // Also log to console for real-time visibility
  WorldLogger.debug(`Diagnostic event: ${eventType}`, data);
  
  // Special handling for errors
  if (eventType === DIAGNOSTIC_EVENTS.ERROR) {
    diagnosticStore.errors.push({
      message: data.message || 'Unknown error',
      timestamp: Date.now(),
      data
    });
    
    // Keep errors from growing too large
    if (diagnosticStore.errors.length > 50) {
      diagnosticStore.errors = diagnosticStore.errors.slice(-50);
    }
    
    WorldLogger.error(`Diagnostic error: ${data.message || 'Unknown error'}`, data);
  }
};

/**
 * Clear diagnostic errors
 */
export const clearDiagnosticErrors = (): void => {
  diagnosticStore.errors = [];
  WorldLogger.info('Diagnostic errors cleared');
};

/**
 * Get a comprehensive diagnostic report
 * @returns Diagnostic report object
 */
export const getDiagnosticReport = (): any => {
  return {
    timestamp: new Date().toISOString(),
    app: {
      environment: import.meta.env.MODE,
      buildTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    },
    worldChain: {
      config: diagnosticStore.config,
      validationResult: validateWorldChainConfig()
    },
    diagnostics: {
      events: diagnosticStore.events,
      errors: diagnosticStore.errors,
      initialized: diagnosticStore.initialized
    }
  };
};

/**
 * Log Oracle Keeper connection status
 * @param success Whether the connection was successful
 * @param data Additional data about the connection
 */
export const logOracleKeeperConnection = (success: boolean, data: any = {}): void => {
  logDiagnosticEvent(DIAGNOSTIC_EVENTS.ORACLE_KEEPER_CONNECT, {
    success,
    url: import.meta.env.VITE_APP_ORACLE_KEEPER_URL,
    ...data
  });
};

/**
 * Log World Chain contract connection status
 * @param contractName Name of the contract
 * @param success Whether the connection was successful
 * @param data Additional data about the connection
 */
export const logContractConnection = (contractName: string, success: boolean, data: any = {}): void => {
  logDiagnosticEvent(DIAGNOSTIC_EVENTS.CONTRACT_CONNECT, {
    contractName,
    success,
    ...data
  });
};

/**
 * Log a swap attempt
 * @param fromToken From token symbol
 * @param toToken To token symbol
 * @param amount Amount to swap
 * @param data Additional data about the swap
 */
export const logSwapAttempt = (fromToken: string, toToken: string, amount: string, data: any = {}): void => {
  logDiagnosticEvent(DIAGNOSTIC_EVENTS.SWAP_ATTEMPT, {
    fromToken,
    toToken,
    amount,
    ...data
  });
};

/**
 * Log transaction submission
 * @param txType Type of transaction
 * @param txHash Transaction hash
 * @param data Additional data about the transaction
 */
export const logTransactionSubmit = (txType: string, txHash: string, data: any = {}): void => {
  logDiagnosticEvent(DIAGNOSTIC_EVENTS.TRANSACTION_SUBMIT, {
    txType,
    txHash,
    ...data
  });
};

/**
 * Log transaction completion
 * @param txType Type of transaction
 * @param txHash Transaction hash
 * @param success Whether the transaction was successful
 * @param data Additional data about the transaction
 */
export const logTransactionComplete = (txType: string, txHash: string, success: boolean, data: any = {}): void => {
  logDiagnosticEvent(DIAGNOSTIC_EVENTS.TRANSACTION_COMPLETE, {
    txType,
    txHash,
    success,
    ...data
  });
};

// Export all diagnostic events for use in components
export { DIAGNOSTIC_EVENTS };
