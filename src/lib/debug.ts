/**
 * Debug utilities for World Chain GMX interface
 * Used for troubleshooting integration issues
 */

export const LOG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  ALL: 5
};

// Get log level from environment or default to INFO in development, ERROR in production
const DEFAULT_LOG_LEVEL = import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR;
const CURRENT_LOG_LEVEL = parseInt(import.meta.env.VITE_APP_LOG_LEVEL || DEFAULT_LOG_LEVEL.toString());

/**
 * Logs messages with different severity levels
 * Controls output based on the current log level
 */
export const WorldLogger = {
  error: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.ERROR) {
      console.error(`[WORLD ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.WARN) {
      console.warn(`[WORLD WARN] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.INFO) {
      console.info(`[WORLD INFO] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.DEBUG) {
      console.debug(`[WORLD DEBUG] ${message}`, ...args);
    }
  },
  
  trace: (message: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.ALL) {
      console.log(`[WORLD TRACE] ${message}`, ...args);
    }
  }
};

/**
 * Creates a diagnostic report of the World Chain integration
 * @returns Object containing diagnostic information
 */
export const createDiagnosticReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
    worldChainConfig: {
      rpcUrl: import.meta.env.VITE_APP_WORLD_CHAIN_URL || 'not set',
      oracleKeeperUrl: import.meta.env.VITE_APP_ORACLE_KEEPER_URL || 'not set',
      productionMode: import.meta.env.VITE_APP_USE_PRODUCTION_MODE === 'true',
      vaultAddress: import.meta.env.VITE_APP_WORLD_VAULT_ADDRESS || 'not set',
      routerAddress: import.meta.env.VITE_APP_WORLD_ROUTER_ADDRESS || 'not set'
    },
    browserInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform
    }
  };
  
  WorldLogger.info('Diagnostic report generated', report);
  return report;
};

/**
 * Adds diagnostic data to the window object for easier debugging
 */
export const initializeDebugTools = () => {
  if (typeof window !== 'undefined') {
    (window as any).__WORLD_CHAIN_DEBUG__ = {
      createReport: createDiagnosticReport,
      logLevel: CURRENT_LOG_LEVEL,
      setLogLevel: (level: number) => {
        (window as any).__WORLD_CHAIN_DEBUG__.logLevel = level;
        WorldLogger.info(`Log level set to ${level}`);
      }
    };
    
    WorldLogger.info('World Chain debug tools initialized');
  }
};
