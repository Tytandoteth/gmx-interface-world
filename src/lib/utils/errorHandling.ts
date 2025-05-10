/**
 * Utility functions for error handling
 */

/**
 * Get a readable error message from any type of error
 * @param error The error object
 * @returns Readable error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Try to extract message-like properties
    const errorObj = error as Record<string, unknown>;
    
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    
    if ('error' in errorObj && typeof errorObj.error === 'string') {
      return errorObj.error;
    }
    
    if ('reason' in errorObj && typeof errorObj.reason === 'string') {
      return errorObj.reason;
    }
    
    // Fall back to JSON string
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error (unable to stringify)';
    }
  }
  
  return 'Unknown error';
}
