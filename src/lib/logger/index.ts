/**
 * Logger Module
 * 
 * A centralized logging utility that provides consistent logging functionality
 * throughout the application with support for different log levels.
 */

/**
 * Available log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  application: string;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableConsole: true,
  application: 'gmx-interface-world',
};

// Current configuration
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Type for metadata attached to log messages
 */
type LogMetadata = Record<string, unknown>;

/**
 * Configure the logger
 */
const configure = (config: Partial<LoggerConfig>): void => {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
};

/**
 * Format a log message with metadata
 */
const formatMessage = (
  message: string,
  metadata?: LogMetadata,
  error?: Error
): string => {
  const parts = [message];

  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(JSON.stringify(metadata));
  }

  if (error) {
    parts.push(`Error: ${error.message}`);
    if (error.stack) {
      parts.push(`Stack: ${error.stack}`);
    }
  }

  return parts.join(' | ');
};

/**
 * Core logging function
 */
const log = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata,
  error?: Error
): void => {
  // Check if we should log this level
  if (level < currentConfig.minLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  const appName = currentConfig.application;
  const formattedMessage = formatMessage(message, metadata, error);
  
  const logEntry = `[${timestamp}] [${appName}] [${levelName}] ${formattedMessage}`;

  // Console logging
  if (currentConfig.enableConsole) {
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(logEntry);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(logEntry);
        break;
      case LogLevel.WARN:
        console.warn(logEntry);
        break;
      case LogLevel.ERROR:
        console.error(logEntry, error || '');
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(logEntry);
    }
  }
  
  // Here we could also implement other logging destinations
  // such as remote logging, file logging, etc.
};

/**
 * Logger interface exposed to the application
 */
export const Logger = {
  /**
   * Configure the logger
   */
  configure,
  
  /**
   * Log a debug message
   */
  debug: (message: string, metadata?: LogMetadata): void => {
    log(LogLevel.DEBUG, message, metadata);
  },
  
  /**
   * Log an info message
   */
  info: (message: string, metadata?: LogMetadata): void => {
    log(LogLevel.INFO, message, metadata);
  },
  
  /**
   * Log a warning message
   */
  warn: (message: string, metadata?: LogMetadata, error?: Error): void => {
    log(LogLevel.WARN, message, metadata, error);
  },
  
  /**
   * Log an error message
   */
  error: (message: string, error?: Error | unknown, metadata?: LogMetadata): void => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    log(LogLevel.ERROR, message, metadata, errorObj);
  },
};

export default Logger;
