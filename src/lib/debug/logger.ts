/**
 * Debug logger utility for consistent logging across the application
 * Provides module-based namespacing and environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enabledInProduction?: boolean;
}

interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  timeStart: (label: string) => void;
  timeEnd: (label: string) => void;
}

/**
 * Creates a module-specific debug logger
 * @param module Name of the module for log namespacing
 * @param options Configuration options
 * @returns Logger interface with level-specific methods
 */
export const createDebugLogger = (module: string, options: LoggerOptions = {}): Logger => {
  const { enabledInProduction = false } = options;
  
  const isProduction = process.env.NODE_ENV === 'production';
  const isDebugEnabled = !isProduction || enabledInProduction;
  
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    // Skip debug logs in production unless explicitly enabled
    if (level === 'debug' && !isDebugEnabled) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${module}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
    }
  };
  
  return {
    debug: (message: string, data?: unknown): void => log('debug', message, data),
    info: (message: string, data?: unknown): void => log('info', message, data),
    warn: (message: string, data?: unknown): void => log('warn', message, data),
    error: (message: string, error?: unknown): void => log('error', message, error),
    
    // Track function timing
    timeStart: (label: string): void => {
      if (isDebugEnabled) {
        console.time(`${module}:${label}`);
      }
    },
    
    timeEnd: (label: string): void => {
      if (isDebugEnabled) {
        console.timeEnd(`${module}:${label}`);
      }
    }
  };
};

// Create global logger for general app logging
export const appLogger = createDebugLogger('App');
