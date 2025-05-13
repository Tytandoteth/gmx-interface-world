/**
 * Oracle Keeper Utilities
 * Helper functions for Oracle Keeper integration
 */

import { Bar } from "domain/tradingview/types";
import { REQUEST_TIMEOUT_MS } from "./oracleKeeperConfig";

// Use a custom logger implementation for Oracle Keeper that doesn't depend on external modules
// This avoids path resolution issues while we're transitioning to the centralized logger

/**
 * Simple logger with rate limiting to prevent excessive console output
 */
const MAX_LOG_COUNT = 1000;
let logCounter = 0;

function shouldLog(): boolean {
  logCounter++;
  
  // Reset counter each minute to allow new logs
  if (logCounter === 1) {
    setTimeout(() => { logCounter = 0; }, 60000);
  }
  
  // Only log if we haven't exceeded the maximum and not in production
  return logCounter <= MAX_LOG_COUNT && import.meta.env.MODE !== 'production';
}

/**
 * Logger for Oracle Keeper operations with rate limiting
 * Dramatically reduces console logging to improve performance
 */
export const logger = {
  info: (message: string, ...args: any[]): void => {
    if (shouldLog()) {
      // eslint-disable-next-line no-console
      console.log(`[Oracle Keeper] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (shouldLog()) {
      // console.warn is allowed by ESLint rules
      console.warn(`[Oracle Keeper] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]): void => {
    // Always log errors regardless of rate limiting
    // console.error is allowed by ESLint rules
    console.error(`[Oracle Keeper] ${message}`, ...args);
  },
  
  debug: (message: string, ...args: any[]): void => {
    // Only log debug in development with rate limiting
    if (shouldLog() && import.meta.env.MODE !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[Oracle Keeper:DEBUG] ${message}`, ...args);
    }
  },
  
  trace: (message: string, ...args: any[]): void => {
    // Trace is most verbose, only show in development with rate limiting
    if (shouldLog() && import.meta.env.MODE !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[Oracle Keeper:TRACE] ${message}`, ...args);
    }
  }
};

/**
 * Build a URL with parameters
 * @param baseUrl Base URL 
 * @param path Path to append
 * @param params Optional query parameters
 * @returns Complete URL string
 */
export function buildUrl(
  baseUrl: string, 
  path: string, 
  params?: Record<string, string | number | undefined>
): string {
  // Ensure baseUrl doesn't end with slash if path starts with it
  const base = baseUrl.endsWith('/') && path.startsWith('/') 
    ? baseUrl.slice(0, -1) 
    : baseUrl;
  
  // Ensure path starts with slash
  const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
  
  // Create URL
  const url = new URL(pathWithSlash, base);
  
  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Parse raw oracle candle data into Bar format
 * @param rawCandle Raw candle data array [time, open, high, low, close]
 * @returns Structured Bar object
 */
export function parseOracleCandle(rawCandle: number[]): Bar {
  const [time, open, high, low, close, volume = 0] = rawCandle;
  
  return {
    time,
    open,
    high,
    low,
    close,
    volume
  };
}

/**
 * Fetch with timeout
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Promise with the response
 */
export async function fetchWithTimeout<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
    }
    
    throw error;
  }
}

/**
 * Simple in-memory cache implementation
 */
export class OracleKeeperCache {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  
  /**
   * Get cached data if not expired
   * @param key Cache key
   * @param maxAge Maximum age in milliseconds
   * @returns Cached data or undefined
   */
  get<T>(key: string, maxAge: number): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age < maxAge) {
      return entry.data as T;
    }
    
    return undefined;
  }
  
  /**
   * Set data in cache
   * @param key Cache key
   * @param data Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Create a singleton cache instance
export const oracleKeeperCache = new OracleKeeperCache();
