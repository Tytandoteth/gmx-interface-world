/**
 * Enhanced diagnostics for Oracle Keeper integration
 * Provides request correlation, performance tracking, and structured logging
 */
// For development purposes, hardcode to true for enhanced debug capabilities
const isDevelopment = true;  // Will be properly configured in production builds

// Log categories for structured logging
export enum LogCategory {
  NETWORK = "NETWORK",
  CACHE = "CACHE",
  FALLBACK = "FALLBACK",
  TIMEOUT = "TIMEOUT",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
  INFO = "INFO",
  DEBUG = "DEBUG"
}

// Log level enum
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL"
}

// Interface for structured log entries
export interface DiagnosticLog {
  timestamp: string;
  requestId?: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
  duration?: number;
}

/**
 * Generate a unique request ID for correlation
 * @param {string} [prefix] Optional prefix for the request ID
 * @returns {string} A unique ID for request correlation
 */
export function generateRequestId(prefix?: string): string {
  // Generate a unique ID with timestamp and random component
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  // If prefix is provided, use it; otherwise use default 'ok' prefix
  return prefix ? `${prefix}-${id}` : `ok-${id}`;
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;
  private checkpoints: Record<string, number> = {};

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Record a checkpoint with a label
   */
  checkpoint(label: string): void {
    this.checkpoints[label] = performance.now() - this.startTime;
  }

  /**
   * End timing and return the total duration
   */
  end(): number {
    this.endTime = performance.now();
    return this.getDuration();
  }

  /**
   * Get the current duration in milliseconds
   */
  getDuration(): number {
    return (this.endTime || performance.now()) - this.startTime;
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): Record<string, number> {
    return { ...this.checkpoints };
  }
}

/**
 * Main diagnostic logger with correlation and performance tracking
 */
export class DiagnosticLogger {
  private static instance: DiagnosticLogger;
  private sessionId: string;
  private enabled: boolean;

  constructor() {
    this.sessionId = generateRequestId();
    this.enabled = isDevelopment || (typeof localStorage !== 'undefined' && 
      localStorage.getItem("enableOracleKeeperDiagnostics") === "true");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DiagnosticLogger {
    if (!DiagnosticLogger.instance) {
      DiagnosticLogger.instance = new DiagnosticLogger();
    }
    return DiagnosticLogger.instance;
  }

  /**
   * Enable or disable logging
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem("enableOracleKeeperDiagnostics", "true");
      } else {
        localStorage.removeItem("enableOracleKeeperDiagnostics");
      }
    }
  }

  /**
   * Log a diagnostic message with structured data
   */
  public log(
    category: LogCategory,
    level: LogLevel,
    message: string,
    options?: {
      requestId?: string;
      data?: Record<string, unknown>;
      error?: Error;
      duration?: number;
    }
  ): void {
    if (!this.enabled && level !== LogLevel.CRITICAL) {
      return;
    }

    const logEntry: DiagnosticLog = {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId || this.sessionId,
      category,
      level,
      message,
      ...options
    };

    this.outputLog(logEntry);
  }

  /**
   * Output the log entry to console in a structured format
   */
  private outputLog(logEntry: DiagnosticLog): void {
    const { timestamp, requestId, category, level, message, data, error, duration } = logEntry;
    
    // Create a formatted log message
    const formattedMessage = `[${timestamp}] [${level}] [${category}] ${requestId ? `[${requestId}] ` : ""}${message}${
      duration ? ` (${duration.toFixed(2)}ms)` : ""
    }`;
    
    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formattedMessage, data || "", error || "");
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formattedMessage, data || "", error || "");
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formattedMessage, data || "", error || "");
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        // eslint-disable-next-line no-console
        console.error(formattedMessage, data || "", error || "");
        break;
    }

    // For critical errors, save to local storage for persistence
    if (level === LogLevel.CRITICAL && typeof localStorage !== 'undefined') {
      try {
        const criticalLogs = JSON.parse(localStorage.getItem("oracleKeeperCriticalLogs") || "[]");
        criticalLogs.push(logEntry);
        // Keep only the latest 50 critical logs
        if (criticalLogs.length > 50) {
          criticalLogs.shift();
        }
        localStorage.setItem("oracleKeeperCriticalLogs", JSON.stringify(criticalLogs));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Retrieve critical logs from storage
   */
  public getCriticalLogs(): DiagnosticLog[] {
    if (typeof localStorage === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem("oracleKeeperCriticalLogs") || "[]");
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear critical logs from storage
   */
  public clearCriticalLogs(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem("oracleKeeperCriticalLogs");
    }
  }
}

// Export default instance for easy import
export const diagnosticLogger = DiagnosticLogger.getInstance();

/**
 * Create a network request wrapper with diagnostic logging
 */
export function createDiagnosticFetch(requestId: string = generateRequestId()): (
  url: string,
  options?: RequestInit
) => Promise<Response> {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const timer = new PerformanceTimer();
    
    diagnosticLogger.log(LogCategory.NETWORK, LogLevel.INFO, `Fetch request: ${url}`, {
      requestId,
      data: { method: options?.method || "GET" }
    });

    try {
      const response = await fetch(url, options);
      const duration = timer.end();
      
      if (response.ok) {
        diagnosticLogger.log(LogCategory.NETWORK, LogLevel.INFO, `Fetch success: ${url}`, {
          requestId,
          data: {
            status: response.status,
            statusText: response.statusText
          },
          duration
        });
      } else {
        diagnosticLogger.log(LogCategory.NETWORK, LogLevel.ERROR, `Fetch failed with status ${response.status}: ${url}`, {
          requestId,
          data: {
            status: response.status,
            statusText: response.statusText
          },
          duration
        });
      }
      
      return response;
    } catch (error) {
      const duration = timer.end();
      const err = error as Error;
      
      diagnosticLogger.log(LogCategory.NETWORK, LogLevel.ERROR, `Fetch error: ${url}`, {
        requestId,
        error: err,
        data: {
          errorMessage: err.message,
          stack: err.stack
        },
        duration
      });
      
      throw error;
    }
  };
}

/**
 * Wrap cache operations with diagnostic logging
 */
export function createDiagnosticCache(namespace: string): {
  get: <T>(key: string, requestId?: string) => T | null;
  set: <T>(key: string, value: T, ttlMs: number, requestId?: string) => void;
  remove: (key: string, requestId?: string) => void;
  has: (key: string, requestId?: string) => boolean;
} {
  const cachePrefix = `ok-cache-${namespace}-`;
  
  return {
    get: <T>(key: string, requestId?: string): T | null => {
      const timer = new PerformanceTimer();
      const cacheKey = cachePrefix + key;
      
      try {
        const item = localStorage.getItem(cacheKey);
        if (!item) {
          diagnosticLogger.log(LogCategory.CACHE, LogLevel.INFO, `Cache miss: ${key}`, {
            requestId,
            duration: timer.end()
          });
          return null;
        }
        
        const parsedItem = JSON.parse(item);
        const now = Date.now();
        
        if (parsedItem.expires && parsedItem.expires < now) {
          localStorage.removeItem(cacheKey);
          diagnosticLogger.log(LogCategory.CACHE, LogLevel.INFO, `Cache expired: ${key}`, {
            requestId,
            data: {
              ageMs: now - parsedItem.timestamp,
              expiredAgoMs: now - parsedItem.expires
            },
            duration: timer.end()
          });
          return null;
        }
        
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.INFO, `Cache hit: ${key}`, {
          requestId,
          data: {
            ageMs: now - parsedItem.timestamp,
            expiresInMs: parsedItem.expires ? parsedItem.expires - now : "never"
          },
          duration: timer.end()
        });
        
        return parsedItem.value as T;
      } catch (error) {
        const err = error as Error;
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.ERROR, `Cache error on get: ${key}`, {
          requestId,
          error: err,
          duration: timer.end()
        });
        return null;
      }
    },
    
    set: <T>(key: string, value: T, ttlMs: number, requestId?: string): void => {
      const timer = new PerformanceTimer();
      const cacheKey = cachePrefix + key;
      
      try {
        const cacheObject = {
          value,
          timestamp: Date.now(),
          expires: ttlMs > 0 ? Date.now() + ttlMs : null
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
        
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.INFO, `Cache set: ${key}`, {
          requestId,
          data: {
            ttlMs,
            expiresAt: cacheObject.expires ? new Date(cacheObject.expires).toISOString() : "never"
          },
          duration: timer.end()
        });
      } catch (error) {
        const err = error as Error;
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.ERROR, `Cache error on set: ${key}`, {
          requestId,
          error: err,
          duration: timer.end()
        });
      }
    },
    
    remove: (key: string, requestId?: string): void => {
      const timer = new PerformanceTimer();
      const cacheKey = cachePrefix + key;
      
      try {
        localStorage.removeItem(cacheKey);
        
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.INFO, `Cache removed: ${key}`, {
          requestId,
          duration: timer.end()
        });
      } catch (error) {
        const err = error as Error;
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.ERROR, `Cache error on remove: ${key}`, {
          requestId,
          error: err,
          duration: timer.end()
        });
      }
    },
    
    has: (key: string, requestId?: string): boolean => {
      const timer = new PerformanceTimer();
      const cacheKey = cachePrefix + key;
      
      try {
        const item = localStorage.getItem(cacheKey);
        if (!item) {
          return false;
        }
        
        const parsedItem = JSON.parse(item);
        const now = Date.now();
        
        if (parsedItem.expires && parsedItem.expires < now) {
          localStorage.removeItem(cacheKey);
          return false;
        }
        
        return true;
      } catch (error) {
        const err = error as Error;
        diagnosticLogger.log(LogCategory.CACHE, LogLevel.ERROR, `Cache error on has: ${key}`, {
          requestId,
          error: err,
          duration: timer.end()
        });
        return false;
      }
    }
  };
}
