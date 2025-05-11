/**
 * Type Guard Utilities
 * Provides runtime type checking and validation functions to prevent errors
 */

import { createDebugLogger } from './logger';

const logger = createDebugLogger('TypeGuards');

/**
 * Validates that a value is neither null nor undefined
 * @param value The value to check
 * @returns True if the value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if a value is a valid object (non-null and not an array)
 * @param value The value to check
 * @returns True if the value is a valid object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a valid array
 * @param value The value to check
 * @returns True if the value is an array
 */
export function isArray<T = unknown>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

/**
 * Type guard for checking if a value is a valid number (not NaN)
 * @param value The value to check
 * @returns True if the value is a valid number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if a value is a valid string with content
 * @param value The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard for checking if a value is a valid price data object
 * @param obj The object to check
 * @returns True if the object has the required structure for price data
 */
export function isPriceData(obj: unknown): obj is Record<string, number> {
  if (!isObject(obj)) {
    logger.debug('isPriceData: not an object', { type: typeof obj });
    return false;
  }
  
  // Check if all values are numbers
  const allValuesAreNumbers = Object.values(obj).every(value => {
    const isValid = isNumber(value);
    if (!isValid) {
      logger.debug('isPriceData: found non-number value', { value });
    }
    return isValid;
  });
  
  return allValuesAreNumbers;
}

/**
 * Type guard for checking if a value has price ticker response structure
 * @param obj The object to check
 * @returns True if the object has the required structure for a ticker response
 */
export function isTickerResponse(obj: unknown): boolean {
  if (!isArray(obj)) {
    logger.debug('isTickerResponse: not an array', { type: typeof obj });
    return false;
  }
  
  if (obj.length === 0) {
    logger.debug('isTickerResponse: empty array');
    // Empty array is technically a valid response, just with no data
    return true;
  }
  
  // Check if all items match the expected structure
  const allItemsValid = obj.every((item, index) => {
    if (!isObject(item)) {
      logger.debug(`isTickerResponse: item ${index} is not an object`, { item });
      return false;
    }
    
    const hasRequiredProps = 'tokenSymbol' in item && 'minPrice' in item;
    if (!hasRequiredProps) {
      logger.debug(`isTickerResponse: item ${index} missing required properties`, { item });
    }
    
    return hasRequiredProps;
  });
  
  return allItemsValid;
}

/**
 * Safe parse for JSON strings
 * @param jsonString The JSON string to parse
 * @param fallback Optional fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.warn('Failed to parse JSON', { error });
    return fallback;
  }
}

/**
 * Safe access for deeply nested object properties
 * @param obj The object to access
 * @param path The path to the property, using dot notation
 * @param fallback Optional fallback value if property doesn't exist
 * @returns The property value or fallback
 */
export function safeObjectAccess<T>(obj: unknown, path: string, fallback: T): T {
  try {
    if (!isObject(obj)) return fallback;
    
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (!isObject(current) || !(part in current)) {
        return fallback;
      }
      current = current[part];
    }
    
    return (current as T) ?? fallback;
  } catch (error) {
    logger.warn('Error accessing object property', { path, error });
    return fallback;
  }
}

/**
 * Safely converts a value to a number, with fallback for invalid values
 * @param value The value to convert
 * @param fallback Fallback value for invalid input
 * @returns The number or fallback
 */
export function safeNumberConvert(value: unknown, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  
  if (typeof value === 'number') {
    return isNaN(value) ? fallback : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  
  return fallback;
}
