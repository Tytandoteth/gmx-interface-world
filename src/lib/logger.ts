/**
 * Centralized logging system for the GMX interface
 * Controls console output based on environment and log level settings
 */

// Log level enum
export enum LogLevel {
  NONE = 0,     // No logging
  ERROR = 1,    // Only errors
  WARN = 2,     // Errors and warnings
  INFO = 3,     // Errors, warnings, and info
  DEBUG = 4,    // All logs including debug
  TRACE = 5     // Verbose tracing (all logs + extra detail)
}

// Default log level based on environment
const DEFAULT_LOG_LEVEL = import.meta.env.PROD
  ? LogLevel.ERROR  // Only show errors in production
  : import.meta.env.VITE_LOG_LEVEL 
    ? parseInt(import.meta.env.VITE_LOG_LEVEL as string, 10)
    : LogLevel.INFO;  // Show info, warnings and errors in development

// Current log level (can be changed at runtime)
let currentLogLevel = DEFAULT_LOG_LEVEL;

// Maximum number of logs to track for performance
const MAX_LOG_COUNT = 1000;
let logCounter = 0;

/**
 * Global logger
 */
export const Logger = {
  /**
   * Set the global log level
   * @param level LogLevel to set
   */
  setLogLevel(level: LogLevel): void {
    currentLogLevel = level;
    // eslint-disable-next-line no-console
    console.warn(`[Logger] Log level set to ${LogLevel[level]}`);
  },

  /**
   * Get the current log level
   * @returns Current LogLevel
   */
  getLogLevel(): LogLevel {
    return currentLogLevel;
  },

  /**
   * Log error messages
   * @param message Main message
   * @param args Additional arguments
   */
  error(message: string, ...args: any[]): void {
    if (currentLogLevel >= LogLevel.ERROR) {
      if (shouldLog()) {
        // console.error is allowed per ESLint config
        console.error(`[ERROR] ${message}`, ...args);
      }
    }
  },

  /**
   * Log warning messages
   * @param message Main message
   * @param args Additional arguments
   */
  warn(message: string, ...args: any[]): void {
    if (currentLogLevel >= LogLevel.WARN) {
      if (shouldLog()) {
        // console.warn is allowed per ESLint config
        console.warn(`[WARN] ${message}`, ...args);
      }
    }
  },

  /**
   * Log info messages
   * @param message Main message
   * @param args Additional arguments
   */
  info(message: string, ...args: any[]): void {
    if (currentLogLevel >= LogLevel.INFO && !import.meta.env.PROD) {
      if (shouldLog()) {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`, ...args);
      }
    }
  },

  /**
   * Log debug messages
   * @param message Main message
   * @param args Additional arguments
   */
  debug(message: string, ...args: any[]): void {
    if (currentLogLevel >= LogLevel.DEBUG && !import.meta.env.PROD) {
      if (shouldLog()) {
        // eslint-disable-next-line no-console
        console.log(`[DEBUG] ${message}`, ...args);
      }
    }
  },

  /**
   * Log trace messages (most verbose)
   * @param message Main message
   * @param args Additional arguments
   */
  trace(message: string, ...args: any[]): void {
    if (currentLogLevel >= LogLevel.TRACE && !import.meta.env.PROD) {
      if (shouldLog()) {
        // eslint-disable-next-line no-console
        console.log(`[TRACE] ${message}`, ...args);
      }
    }
  },
};

/**
 * Determine if we should log based on performance constraints
 * @returns True if we should log, false if we've exceeded the rate limit
 */
function shouldLog(): boolean {
  logCounter++;
  
  // Reset counter each minute to allow new logs
  if (logCounter === 1) {
    setTimeout(() => { logCounter = 0; }, 60000);
  }
  
  // Only log if we haven't exceeded the maximum
  return logCounter <= MAX_LOG_COUNT;
}

// Export a default instance
export default Logger;
