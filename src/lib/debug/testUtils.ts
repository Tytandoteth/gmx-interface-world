/**
 * Test utilities for simulating various error conditions and edge cases
 * Useful for manual testing and debugging of error handling
 */

import { appLogger } from './logger';

/**
 * Types for the original fetch function and mock implementations
 */
type FetchFunction = typeof window.fetch;
type FetchArgs = Parameters<FetchFunction>;
type FetchResult = ReturnType<FetchFunction>;

/**
 * Temporarily modifies the global fetch function to simulate network failures
 * @param fn The function to execute with simulated network failures
 * @returns Promise resolving to the result of the function
 */
export const simulateNetworkFailure = async <T>(fn: () => Promise<T>): Promise<T> => {
  const originalFetch = window.fetch;
  
  appLogger.debug('Simulating network failure');
  
  // Replace fetch with a function that rejects
  window.fetch = (..._args: FetchArgs): FetchResult => 
    Promise.reject(new Error('Simulated network failure'));
  
  try {
    return await fn();
  } finally {
    // Restore original fetch
    window.fetch = originalFetch;
    appLogger.debug('Restored original fetch function');
  }
};

/**
 * Temporarily modifies the global fetch function to simulate slow responses
 * @param fn The function to execute with simulated slow responses
 * @param delayMs Milliseconds to delay each response
 * @returns Promise resolving to the result of the function
 */
export const simulateDelayedResponse = async <T>(fn: () => Promise<T>, delayMs = 5000): Promise<T> => {
  const originalFetch = window.fetch;
  
  appLogger.debug(`Simulating delayed response (${delayMs}ms)`);
  
  // Replace fetch with a function that delays responses
  window.fetch = (...args: FetchArgs): FetchResult => 
    new Promise(resolve => 
      setTimeout(() => resolve(originalFetch(...args)), delayMs)
    );
  
  try {
    return await fn();
  } finally {
    // Restore original fetch
    window.fetch = originalFetch;
    appLogger.debug('Restored original fetch function');
  }
};

/**
 * Temporarily modifies the global fetch function to simulate malformed JSON responses
 * @param fn The function to execute with simulated malformed responses
 * @returns Promise resolving to the result of the function
 */
export const simulateMalformedResponse = async <T>(fn: () => Promise<T>): Promise<T> => {
  const originalFetch = window.fetch;
  
  appLogger.debug('Simulating malformed JSON response');
  
  // Replace fetch with a function that returns malformed JSON
  window.fetch = async (...args: FetchArgs): FetchResult => {
    const response = await originalFetch(...args);
    
    // Create a new response with modified json method
    return new Response('{malformed:json', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };
  
  try {
    return await fn();
  } finally {
    // Restore original fetch
    window.fetch = originalFetch;
    appLogger.debug('Restored original fetch function');
  }
};

/**
 * Temporarily modifies the global fetch function to simulate empty responses
 * @param fn The function to execute with simulated empty responses
 * @returns Promise resolving to the result of the function
 */
export const simulateEmptyResponse = async <T>(fn: () => Promise<T>): Promise<T> => {
  const originalFetch = window.fetch;
  
  appLogger.debug('Simulating empty response');
  
  // Replace fetch with a function that returns an empty object or array
  window.fetch = async (...args: FetchArgs): FetchResult => {
    const response = await originalFetch(...args);
    
    // Check if the URL is for the Oracle Keeper
    const url = args[0]?.toString() || '';
    
    if (url.includes('oracle-keeper')) {
      // Create a new response with empty data
      if (url.includes('/prices')) {
        return new Response('[]', {
          status: 200,
          headers: new Headers({'Content-Type': 'application/json'})
        });
      } else {
        return new Response('{}', {
          status: 200,
          headers: new Headers({'Content-Type': 'application/json'})
        });
      }
    }
    
    return response;
  };
  
  try {
    return await fn();
  } finally {
    // Restore original fetch
    window.fetch = originalFetch;
    appLogger.debug('Restored original fetch function');
  }
};

/**
 * Execute a function with console.log temporarily replaced to capture all logs
 * @param fn The function to execute
 * @returns Promise resolving to captured logs and function result
 */
export const captureLogs = async <T>(fn: () => Promise<T>): Promise<{ logs: string[], result: T }> => {
  const logs: string[] = [];
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // Replace console methods
  console.log = (...args: unknown[]): void => {
    logs.push(['log', ...args].join(' '));
    originalConsoleLog(...args);
  };
  
  console.info = (...args: unknown[]): void => {
    logs.push(['info', ...args].join(' '));
    originalConsoleInfo(...args);
  };
  
  console.warn = (...args: unknown[]): void => {
    logs.push(['warn', ...args].join(' '));
    originalConsoleWarn(...args);
  };
  
  console.error = (...args: unknown[]): void => {
    logs.push(['error', ...args].join(' '));
    originalConsoleError(...args);
  };
  
  try {
    const result = await fn();
    return { logs, result };
  } finally {
    // Restore console methods
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
};
