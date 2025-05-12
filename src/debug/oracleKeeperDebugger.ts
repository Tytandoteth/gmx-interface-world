/**
 * Oracle Keeper Debugger
 * 
 * This module provides tools to debug the Oracle Keeper integration in the GMX interface.
 * It adds instrumentation to track Oracle Keeper requests, responses, and errors to help
 * identify issues with the integration.
 */

import { DEFAULT_ORACLE_KEEPER_URL } from "../lib/oracleKeeperFetcher/oracleKeeperConstants";
import { shouldUseProductionMode } from "../lib/worldchain/worldChainProduction";

/**
 * Debug logging levels
 */
export enum DebugLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2, 
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

/**
 * Interface for a logged request
 */
interface RequestLog {
  timestamp: number;
  url: string;
  method: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
}

/**
 * Oracle Keeper Debugger class
 */
export class OracleKeeperDebugger {
  private static instance: OracleKeeperDebugger;
  private debugLevel: DebugLevel = DebugLevel.ERROR;
  private requestLogs: RequestLog[] = [];
  private isInitialized = false;
  private originalFetch: typeof fetch;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): OracleKeeperDebugger {
    if (!OracleKeeperDebugger.instance) {
      OracleKeeperDebugger.instance = new OracleKeeperDebugger();
    }
    return OracleKeeperDebugger.instance;
  }
  
  private constructor() {
    this.originalFetch = window.fetch;
  }
  
  /**
   * Initialize the debugger
   * @param level Debug level
   */
  public initialize(level: DebugLevel = DebugLevel.INFO): void {
    if (this.isInitialized) return;
    
    this.debugLevel = level;
    this.instrumentFetch();
    this.logInitialization();
    this.isInitialized = true;
    
    this.log(DebugLevel.INFO, "Oracle Keeper Debugger initialized");
  }
  
  /**
   * Shut down the debugger and restore original state
   */
  public shutdown(): void {
    if (!this.isInitialized) return;
    
    window.fetch = this.originalFetch;
    this.isInitialized = false;
    
    this.log(DebugLevel.INFO, "Oracle Keeper Debugger shut down");
  }
  
  /**
   * Get all request logs
   */
  public getLogs(): RequestLog[] {
    return [...this.requestLogs];
  }
  
  /**
   * Get error logs only
   */
  public getErrorLogs(): RequestLog[] {
    return this.requestLogs.filter(log => !log.success);
  }
  
  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.requestLogs = [];
    this.log(DebugLevel.INFO, "Logs cleared");
  }
  
  /**
   * Set debug level
   */
  public setDebugLevel(level: DebugLevel): void {
    this.debugLevel = level;
    this.log(DebugLevel.INFO, `Debug level set to ${DebugLevel[level]}`);
  }
  
  /**
   * Log a message at the specified level
   */
  public log(level: DebugLevel, message: string, ...args: any[]): void {
    if (level > this.debugLevel) return;
    
    const prefix = `[OKD][${DebugLevel[level]}]`;
    
    switch (level) {
      case DebugLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case DebugLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case DebugLevel.INFO:
      case DebugLevel.DEBUG:
      case DebugLevel.TRACE:
        console.log(prefix, message, ...args);
        break;
    }
  }
  
  /**
   * Instrument the fetch API to track Oracle Keeper requests
   */
  private instrumentFetch(): void {
    window.fetch = async (...args) => {
      const url = args[0].toString();
      const options = args[1] || {};
      const method = options.method || 'GET';
      
      // Only track Oracle Keeper requests
      if (!url.includes('oracle-keeper')) {
        return this.originalFetch.apply(window, args);
      }
      
      const startTime = performance.now();
      this.log(DebugLevel.DEBUG, `Oracle Keeper Request: ${method} ${url}`);
      
      try {
        const response = await this.originalFetch.apply(window, args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Log the request
        const logEntry: RequestLog = {
          timestamp: Date.now(),
          url,
          method,
          success: response.ok,
          statusCode: response.status,
          responseTime
        };
        
        this.requestLogs.push(logEntry);
        
        if (!response.ok) {
          this.log(DebugLevel.ERROR, `Oracle Keeper Error: ${response.status} ${response.statusText}`, { url, method });
        } else {
          this.log(DebugLevel.DEBUG, `Oracle Keeper Response: ${response.status} (${responseTime.toFixed(2)}ms)`, { url, method });
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Log the error
        const logEntry: RequestLog = {
          timestamp: Date.now(),
          url,
          method,
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : String(error)
        };
        
        this.requestLogs.push(logEntry);
        this.log(DebugLevel.ERROR, `Oracle Keeper Fetch Error:`, error, { url, method });
        
        throw error;
      }
    };
  }
  
  /**
   * Log initialization details
   */
  private logInitialization(): void {
    const configDetails = {
      oracleKeeperUrl: import.meta.env.VITE_ORACLE_KEEPER_URL || DEFAULT_ORACLE_KEEPER_URL,
      productionMode: shouldUseProductionMode(),
      buildMode: import.meta.env.MODE || 'development',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    this.log(DebugLevel.INFO, "Oracle Keeper Configuration:", configDetails);
  }
  
  /**
   * Analyze logs and provide insights
   */
  public analyzeIssues(): { issues: string[], suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for timeouts
    const timeouts = this.requestLogs.filter(log => 
      !log.success && log.error?.includes('timeout')
    );
    if (timeouts.length > 0) {
      issues.push(`Found ${timeouts.length} request timeouts. The Oracle Keeper service may be overloaded or unreachable.`);
      suggestions.push("Consider increasing timeout values or implementing circuit breakers for fallback mechanisms.");
    }
    
    // Check for CORS errors
    const corsErrors = this.requestLogs.filter(log => 
      !log.success && log.error?.includes('CORS')
    );
    if (corsErrors.length > 0) {
      issues.push(`Found ${corsErrors.length} CORS errors. Cross-origin requests to the Oracle Keeper are being blocked.`);
      suggestions.push("Ensure the Oracle Keeper service has proper CORS headers configured for your domain.");
    }
    
    // Check for slow responses
    const slowResponses = this.requestLogs.filter(log => 
      log.success && log.responseTime > 1000
    );
    if (slowResponses.length > 0) {
      issues.push(`Found ${slowResponses.length} slow responses (>1000ms). This may impact user experience.`);
      suggestions.push("Implement proper loading states and consider optimizing the Oracle Keeper service or using a CDN.");
    }
    
    // Check for 4xx errors
    const clientErrors = this.requestLogs.filter(log => 
      log.statusCode && log.statusCode >= 400 && log.statusCode < 500
    );
    if (clientErrors.length > 0) {
      issues.push(`Found ${clientErrors.length} client errors (4xx). The requests may be malformed or unauthorized.`);
      suggestions.push("Check request parameters and authentication/authorization headers.");
    }
    
    // Check for 5xx errors
    const serverErrors = this.requestLogs.filter(log => 
      log.statusCode && log.statusCode >= 500
    );
    if (serverErrors.length > 0) {
      issues.push(`Found ${serverErrors.length} server errors (5xx). The Oracle Keeper service may be experiencing issues.`);
      suggestions.push("Implement robust fallback mechanisms and monitor the Oracle Keeper service health.");
    }
    
    // If no issues found
    if (issues.length === 0) {
      issues.push("No significant issues found in the Oracle Keeper requests.");
      suggestions.push("Continue monitoring for any emerging issues.");
    }
    
    return { issues, suggestions };
  }
}

/**
 * Convenience function to get the debugger instance
 */
export const getOracleKeeperDebugger = (): OracleKeeperDebugger => OracleKeeperDebugger.getInstance();

/**
 * Initialize the debugger automatically in development mode
 */
if (import.meta.env.MODE !== 'production') {
  const debugger = getOracleKeeperDebugger();
  debugger.initialize(DebugLevel.DEBUG);
  
  // Add to window for console access
  (window as any).__oracleKeeperDebugger = debugger;
  console.log("[Oracle Keeper Debugger] Available as window.__oracleKeeperDebugger");
}
