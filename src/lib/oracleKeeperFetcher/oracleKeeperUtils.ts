import { 
  CACHE_TTL_MS, 
  MAX_RETRY_COUNT, 
  REQUEST_TIMEOUT_MS, 
  RETRY_BASE_DELAY_MS, 
  RETRY_MAX_DELAY_MS, 
  STALE_CACHE_TTL_MS 
} from "./oracleKeeperConstants";

/**
 * Interface for a cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Oracle Keeper Cache Class
 * Provides caching with TTL and stale cache functionality
 */
export class OracleKeeperCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get a cached value if it exists and is not expired
   * @param key - Cache key
   * @param maxAge - Maximum age in milliseconds (optional, defaults to CACHE_TTL_MS)
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string, maxAge: number = CACHE_TTL_MS): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Return data if within TTL
    if (age < maxAge) {
      return entry.data as T;
    }

    return undefined;
  }

  /**
   * Get a cached value even if it's stale (useful for fallbacks)
   * @param key - Cache key
   * @param maxStaleAge - Maximum stale age in milliseconds (defaults to STALE_CACHE_TTL_MS)
   * @returns The cached value or undefined if not found or too stale
   */
  getStale<T>(key: string, maxStaleAge: number = STALE_CACHE_TTL_MS): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Return data if within stale TTL
    if (age < maxStaleAge) {
      return entry.data as T;
    }

    return undefined;
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param data - Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a value from the cache
   * @param key - Cache key
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the age of a cached item in milliseconds
   * @param key - Cache key
   * @returns Age in milliseconds or undefined if not found
   */
  getAge(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    return Date.now() - entry.timestamp;
  }
}

/**
 * Global instance of the Oracle Keeper cache
 */
export const oracleKeeperCache = new OracleKeeperCache();

/**
 * Helper function to delay execution
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay time in milliseconds with jitter
 */
export const calculateBackoff = (attempt: number, baseDelay: number = RETRY_BASE_DELAY_MS, maxDelay: number = RETRY_MAX_DELAY_MS): number => {
  // Calculate exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Apply jitter (random value between 80% and 120% of the delay)
  const jitter = 0.8 + Math.random() * 0.4;
  
  // Apply jitter and cap at maxDelay
  return Math.min(exponentialDelay * jitter, maxDelay);
};

/**
 * Fetch with timeout, retry and caching
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param cacheKey - Key to use for caching (if not provided, caching is disabled)
 * @param maxRetries - Maximum number of retries
 * @returns Promise resolving to the response data
 */
export async function fetchWithRetryAndCache<T>(
  url: string, 
  options: RequestInit = {}, 
  cacheKey?: string,
  maxRetries: number = MAX_RETRY_COUNT
): Promise<T> {
  // DIAGNOSTIC: Log request start
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[OracleKeeper][${requestId}] Request started: ${url}`);
  const startTime = performance.now();

  // Create a controller for timeout
  const controller = new AbortController();
  
  // If cacheKey is provided, try to get from cache first
  if (cacheKey) {
    const cachedData = oracleKeeperCache.get<T>(cacheKey);
    if (cachedData) {
      const duration = performance.now() - startTime;
      console.log(`[OracleKeeper][${requestId}] CACHE HIT: Using cached data for ${cacheKey} (${duration.toFixed(2)}ms)`);
      return cachedData;
    } else {
      console.log(`[OracleKeeper][${requestId}] CACHE MISS: No valid cache entry for ${cacheKey}`);
    }
  }

  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  // Add abort signal to options
  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
  };

  let lastError: Error | undefined;
  let attempt = 0;

  // Try to fetch with retries
  while (attempt <= maxRetries) {
    try {
      // If it's a retry, delay using exponential backoff
      if (attempt > 0) {
        const backoffDelay = calculateBackoff(attempt - 1);
        console.log(`Oracle Keeper: Retry ${attempt}/${maxRetries} after ${backoffDelay}ms for ${url}`);
        await delay(backoffDelay);
      }

      // Attempt the fetch
      const response = await fetch(url, fetchOptions);
      
      // Clear timeout since fetch completed
      clearTimeout(timeoutId);
      
      // Handle non-OK responses
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      // Parse JSON response
      const data = await response.json();
      
      // Cache the successful response if cacheKey is provided
      if (cacheKey) {
        oracleKeeperCache.set(cacheKey, data);
        const duration = performance.now() - startTime;
        console.log(`[OracleKeeper][${requestId}] SUCCESS: Fetched and cached data for ${cacheKey} (${duration.toFixed(2)}ms)`);
      } else {
        const duration = performance.now() - startTime;
        console.log(`[OracleKeeper][${requestId}] SUCCESS: Fetched data (${duration.toFixed(2)}ms)`);
      }
      
      return data as T;
    } catch (error) {
      // Store the last error for rethrowing
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // If it's an abort error (timeout), we need to create a new controller for the next attempt
      if (error instanceof DOMException && error.name === 'AbortError') {
        controller.abort(); // Make sure it's aborted
        console.error(`[OracleKeeper][${requestId}] TIMEOUT: Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      } else {
        console.error(`[OracleKeeper][${requestId}] ERROR: Fetch failed (attempt ${attempt}/${maxRetries})`, {
          url,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      // If we've exhausted all retries, try to get stale data from cache before giving up
      if (attempt === maxRetries && cacheKey) {
        const staleData = oracleKeeperCache.getStale<T>(cacheKey);
        if (staleData) {
          const duration = performance.now() - startTime;
          console.warn(`[OracleKeeper][${requestId}] FALLBACK: Using stale cache for ${cacheKey} after all retries failed (${duration.toFixed(2)}ms)`);
          return staleData;
        } else {
          console.error(`[OracleKeeper][${requestId}] CRITICAL: No stale cache available for ${cacheKey} after all retries failed`);
        }
      }
      
      // Increment attempt counter
      attempt++;
    }
  }
  
  // All retries failed, throw the last error
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
};

/**
 * Check if OracleKeeper is online
 * @param url - Base URL of the Oracle Keeper
 * @returns Promise resolving to true if online, false otherwise
 */
export const checkOracleKeeperHealth = async (url: string): Promise<boolean> => {
  try {
    // Construct health check URL
    const healthUrl = url.endsWith('/') ? `${url}health` : `${url}/health`;
    
    // Set timeout and fetch options
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    
    // Attempt health check
    const response = await fetch(healthUrl, { signal: controller.signal });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Check for successful response
    if (!response.ok) {
      console.warn(`Oracle Keeper health check failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // Try to parse JSON response
    const data = await response.json();
    
    // Check for expected response format
    if (data && (data.status === 'ok' || data.status === 'success' || data.healthy === true)) {
      console.log('Oracle Keeper is healthy');
      return true;
    }
    
    console.warn('Oracle Keeper health check: Unexpected response format', data);
    return false;
  } catch (error) {
    console.error('Oracle Keeper health check failed:', error);
    return false;
  }
};
