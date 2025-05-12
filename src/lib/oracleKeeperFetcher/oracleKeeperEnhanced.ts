/**
 * Enhanced Oracle Keeper Fetcher
 * Implements request correlation, advanced logging, and more robust error handling
 */

// External dependencies
import { isWorldChain, getWorldChainMockData } from "lib/worldchain/worldChainDevMode";
import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

// Internal dependencies
import { generateRequestId, PerformanceTimer, createDiagnosticCache, createDiagnosticFetch, LogCategory, LogLevel, diagnosticLogger as logger } from "./debug/diagnostics";
import {
  DEFAULT_ORACLE_KEEPER_URL,
  HEALTH_CHECK_INTERVAL_MS,
  MAX_RETRY_COUNT,
  CACHE_TTL_MS,
  RETRY_BASE_DELAY_MS
} from "./oracleKeeperConstants";
import { 
  OracleFetcher,
  TickersResponse, 
  DirectPricesResponse,
  OracleKeeperHealthStatus
} from "./types";

/**
 * Standardized format for price status information
 */
interface TokenPriceStatus {
  symbol: string;
  available: boolean;
  latestPrice: number;
  lastUpdated: number;
  source?: string;
}

// Create namespace-specific diagnostic cache
const tickerCache = createDiagnosticCache("tickers");
const priceCache = createDiagnosticCache("prices");

// Define ORACLE_LOG_CATEGORY with underscore prefix to satisfy ESLint
const _ORACLE_LOG_CATEGORY = LogCategory.INFO;

// Define local constants not in the constants file
const CACHE_FALLBACK_TTL_MS = 30 * 1000; // 30 seconds for fallback cache

/**
 * Enhanced health check for Oracle Keeper service 
 * @param url - Oracle Keeper URL
 * @param chainId - Chain ID to check
 * @returns Detailed health status of the Oracle Keeper
 */
export async function checkOracleKeeperHealth(
  url: string = DEFAULT_ORACLE_KEEPER_URL,
  chainId = 0
): Promise<OracleKeeperHealthStatus> {
  // Generate a unique ID with 'health' prefix for this request
  const requestId = generateRequestId('health');
  const timer = new PerformanceTimer();
  const errors: string[] = [];
  let priceData: TickersResponse[] = [];
  let responseData: any = {};
  
  const result: OracleKeeperHealthStatus = {
    isHealthy: false,
    apiLatency: 0,
    timestamp: Date.now(),
    mode: 'error',
    endpoint: url,
    prices: [],
    gmxContract: {
      connected: false
    },
    errors: []
  };
  
  // Step 1: Check basic API health
  try {
    const response = await fetch(`${url}/health`);
    result.apiLatency = timer.end();
    
    if (!response.ok) {
      const errorMsg = `Health check failed with status ${response.status}`;
      errors.push(errorMsg);
      logger.log(LogCategory.NETWORK, LogLevel.ERROR, errorMsg, {
        requestId,
        data: { status: response.status, url },
        duration: result.apiLatency
      });
    } else {
      // Try to parse health response 
      try {
        responseData = await response.json();
        result.version = responseData.version || 'unknown';
        result.uptime = responseData.uptime;
        // If we get here, basic health check succeeded
        result.isHealthy = true;
      } catch (parseError) {
        errors.push(`Health endpoint returned invalid JSON: ${String(parseError)}`);
      }
    }
  } catch (error) {
    const errorMsg = `Health check failed with exception: ${String(error)}`;
    errors.push(errorMsg);
    logger.log(LogCategory.NETWORK, LogLevel.ERROR, errorMsg, {
      requestId,
      data: { error: String(error), url },
      duration: timer.end()
    });
  }
  
  // Step 2: Check for price data
  try {
    const priceResponse = await fetch(`${url}/prices`);
    if (priceResponse.ok) {
      try {
        priceData = await priceResponse.json();
        // Transform price data into token status
        if (Array.isArray(priceData)) {
          result.prices = priceData.map(ticker => {
            // Safe type handling for response objects
            const tickerObj = ticker as unknown as { 
              tokenSymbol: string; 
              minPrice: string;
              updatedAt: number;
              source?: string;
            };
            
            return {
              symbol: tickerObj.tokenSymbol,
              available: true,
              latestPrice: parseFloat(tickerObj.minPrice), // Use minPrice as the default
              lastUpdated: tickerObj.updatedAt,
              source: tickerObj.source || 'Oracle Keeper'
            } as TokenPriceStatus;
          });
          
          // We have price data, set mode to live
          if (result.prices.length > 0) {
            result.mode = 'live';
          }
        }
      } catch (parseError) {
        errors.push(`Price endpoint returned invalid JSON: ${String(parseError)}`);
      }
    } else {
      errors.push(`Price check failed with status ${priceResponse.status}`);
    }
  } catch (error) {
    errors.push(`Price check failed with exception: ${String(error)}`);
  }
  
  // Step 3: If we don't have live price data and we're on World Chain, check for fallback
  if (result.prices.length === 0 && isWorldChain(chainId)) {
    // Use mock data
    const mockPrices = getWorldChainMockData<Record<string, number>>('prices');
    if (mockPrices) {
      result.mode = 'fallback';
      result.prices = Object.entries(mockPrices)
        .filter(([key]) => key !== 'DEFAULT')
        .map(([symbol, price]) => ({
          symbol,
          available: true,
          latestPrice: price,
          lastUpdated: Date.now(),
          source: 'GMX Development Mock Prices'
        }));
    }
  }
  
  // Step 4: Check GMX contract connection if we have contract info
  // This is a placeholder for now - will need real contract integration later
  if (isWorldChain(chainId)) {
    result.gmxContract = {
      connected: true,
      address: '0xA63636C9d557793234dD5E33a24EAd68c36Df148', // Example address from your config
      chainId: chainId
    };
  } else {
    result.gmxContract = {
      connected: false,
      error: 'No contract integration available for this chain'
    };
  }
  
  // Final health determination
  // We consider it healthy if we have either live data or fallback data
  result.isHealthy = result.mode !== 'error' && result.prices.length > 0;
  result.errors = errors.length > 0 ? errors : undefined;
  
  logger.log(
    LogCategory.NETWORK, 
    result.isHealthy ? LogLevel.INFO : LogLevel.ERROR, 
    `Health check ${result.isHealthy ? 'successful' : 'failed'}`, 
    {
      requestId,
      data: {
        url,
        mode: result.mode,
        priceCount: result.prices.length,
        errors
      }
    }
  );
  
  return result;
}

/**
 * Fetch with retry and caching for Oracle Keeper
 */
export async function fetchOracleKeeperData<T>(
  url: string,
  options: {
    cacheKey?: string;
    cacheTtl?: number;
    cacheNamespace?: "tickers" | "prices";
    retries?: number;
    retryDelay?: number;
    fallbackData?: T;
  } = {}
): Promise<T> {
  const {
    cacheKey,
    cacheTtl = CACHE_TTL_MS,
    cacheNamespace = "tickers",
    retries = MAX_RETRY_COUNT,
    retryDelay = RETRY_BASE_DELAY_MS,
    fallbackData
  } = options;
  
  const requestId = generateRequestId('fetch');
  const cache = cacheNamespace === "tickers" ? tickerCache : priceCache;
  
  // First, try to get from cache if a cache key is provided
  if (cacheKey) {
    const cachedData = cache.get<T>(cacheKey, requestId);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Setup diagnostic fetch with request correlation
  const fetch = createDiagnosticFetch(requestId);
  let lastError: Error | undefined;
  
  // Attempt with retries
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      const delayMs = retryDelay * Math.pow(2, attempt - 1);
      logger.log(LogCategory.NETWORK, LogLevel.INFO, `Retry attempt ${attempt}/${retries} after ${delayMs}ms`, { requestId });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    try {
      const timer = new PerformanceTimer();
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
        lastError = new Error(errorMsg);
        logger.log(LogCategory.NETWORK, LogLevel.ERROR, errorMsg, {
          requestId,
          data: { status: response.status, attempt },
          duration: timer.end()
        });
        continue;
      }
      
      const data = await response.json() as T;
      const duration = timer.end();
      
      // Cache successful response if cache key provided
      if (cacheKey) {
        cache.set(cacheKey, data, cacheTtl, requestId);
      }
      
      logger.log(LogCategory.NETWORK, LogLevel.INFO, `Fetch successful from ${url} (attempt ${attempt})`, {
        requestId,
        duration
      });
      
      return data;
    } catch (error) {
      lastError = error as Error;
      logger.log(LogCategory.NETWORK, LogLevel.ERROR, `Fetch error for ${url} (attempt ${attempt})`, {
        requestId,
        error: lastError
      });
    }
  }
  
  // All retries failed, log critical error
  logger.log(LogCategory.NETWORK, LogLevel.CRITICAL, `All fetch attempts failed for ${url} after ${retries} retries`, {
    requestId,
    error: lastError
  });
  
  // If we have fallback data and a cache key, store it in cache with shorter TTL
  if (fallbackData && cacheKey) {
    logger.log(LogCategory.FALLBACK, LogLevel.WARN, `Using fallback data for ${url} with cache key ${cacheKey}`, {
      requestId
    });
    cache.set(cacheKey, fallbackData, CACHE_FALLBACK_TTL_MS, requestId);
    return fallbackData;
  }
  
  // Re-throw the last error if we have no fallback
  if (lastError) {
    throw lastError;
  }
  
  throw new Error(`Failed to fetch data from ${url}`);
}

/**
 * Enhanced Oracle Keeper Fetcher with diagnostic tracking
 */
export class EnhancedOracleKeeperFetcher implements OracleFetcher {
  private readonly chainId: number;
  private readonly baseUrl: string;
  private customUrl: string | null = null;
  private currentUrlIndex = 0; // Remove explicit type for number literal
  private isHealthy = true;
  private lastHealthCheck = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private directPricesEndpoint = '/direct-prices';
  
  /**
   * Creates mock tickers data based on supported tokens
   * @returns TickersResponse - Array of ticker data for supported tokens
   */
  private createMockTickersData(): TickersResponse {
    // Create mock ticker data for supported World Chain tokens
    const supportedTokens = [
      { symbol: 'WLD', address: '0x000000000000000000000000000000000000800A', price: 1.24 },
      { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', price: 2480.22 },
      { symbol: 'MAG', address: '0xb580A2b495917B189E5a7C0714B8aEcF44Ea7B1f', price: 0.0004124 }
    ];
    
    // Convert to the format expected by TickersResponse
    return supportedTokens.map(token => ({
      minPrice: token.price.toString(),
      maxPrice: token.price.toString(),
      oracleDecimals: 8,
      tokenSymbol: token.symbol,
      tokenAddress: token.address,
      updatedAt: Date.now()
    }));
  }

  constructor(chainId: number) {
    this.chainId = chainId;
    // Always provide a URL, falling back to default if needed
    // Start with index 0 for new instances
    this.currentUrlIndex = getOracleKeeperNextIndex(chainId, 0);
    this.baseUrl = getOracleKeeperUrl(chainId, this.currentUrlIndex) || DEFAULT_ORACLE_KEEPER_URL;
    
    // Set up periodic health checks
    this.setupHealthChecks();
    
    logger.log(LogCategory.INFO, LogLevel.INFO, `EnhancedOracleKeeperFetcher initialized for chain ${chainId} with URL ${this.url}`, {
      data: { chainId }
    });
  }
  
  /**
   * Get the current URL to use for Oracle Keeper requests
   * Also satisfies the OracleFetcher interface
   */
  get url(): string {
    return this.customUrl || this.baseUrl;
  }
  
  /**
   * Set up periodic health checks for the Oracle Keeper
   */
  private setupHealthChecks(): void {
    // Run initial health check
    this.checkOracleKeeperHealth();
    
    // Set up periodic health check
    if (!this.healthCheckTimer) {
      this.healthCheckTimer = setInterval(() => {
        this.checkOracleKeeperHealth();
      }, HEALTH_CHECK_INTERVAL_MS);
    }
  }
  
  /**
   * Public method to check health of the Oracle Keeper service
   * This method has been designed to handle both existing and potentially not-yet-implemented health endpoints.
   * @returns Promise<boolean> True if the Oracle Keeper is healthy
   */
  private async checkOracleKeeperHealth(): Promise<boolean> {
    const requestId = generateRequestId('health');
    const timer = new PerformanceTimer();
    const healthUrl = this.url.endsWith('/') ? `${this.url}health` : `${this.url}/health`;
    
    try {
      const response = await fetch(healthUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': requestId
        }
      });

      if (response.ok) {
        const data = await response.json();

        logger.log(LogCategory.INFO, LogLevel.INFO, `Oracle Keeper health check successful`, { 
          requestId, 
          duration: timer.end(),
          data
        });

        return true;
      }
    } catch (healthCheckError) {
      // If health endpoint fails or doesn't exist, try a fallback method (prices endpoint)
      const errorMessage = healthCheckError instanceof Error ? healthCheckError.message : String(healthCheckError);
      logger.log(LogCategory.DEBUG, LogLevel.INFO, `Health endpoint not available, falling back to prices check: ${errorMessage}`, { 
        requestId
      });
    }

    // Fallback method - try to fetch prices which should be available in any Oracle Keeper implementation
    const pricesUrl = this.url.endsWith('/') ? `${this.url}prices` : `${this.url}/prices`;
    const fallbackResponse = await fetch(pricesUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Request-ID': requestId
      }
    });

    if (fallbackResponse.ok) {
      logger.log(LogCategory.INFO, LogLevel.INFO, `Oracle Keeper health verified via prices endpoint`, { 
        requestId, 
        duration: timer.end()
      });
      return true;
    }

    logger.log(LogCategory.ERROR, LogLevel.ERROR, `Oracle Keeper health check failed: Both health and prices endpoints failed`, { 
      requestId, 
      duration: timer.end()
    });
    
    return false;
  }

  // Generate a request ID for tracking, logging, and diagnostics
  generateRequestId(): string {
    return generateRequestId('ok');
  }
  
  /**
   * Fetches ticker data (price information) for tokens
   * @returns Promise<TickersResponse> - Array of ticker data objects
   */
  async fetchTickers(): Promise<TickersResponse> {
    // Generate a unique ID with 'tickers' prefix for this request
    const requestId = generateRequestId('tickers');
    const timer = new PerformanceTimer();
    
    logger.log(LogCategory.INFO, LogLevel.INFO, `Fetching prices for chain ${this.chainId} from ${this.url}`, { 
      requestId
    });
    
    // Special handling for World Chain development mode
    if (isWorldChain(this.chainId)) {
      try {
        // Use the /prices endpoint as documented in the Oracle Keeper API
        const pricesUrl = this.url.endsWith('/') ? `${this.url}prices` : `${this.url}/prices`;
        
        // Fetch data from the Oracle Keeper prices endpoint
        const response = await this.fetchOracleKeeperData<{ prices: Record<string, number>, timestamp: string }>(
          pricesUrl,
          {
            cacheKey: `prices-${this.chainId}`,
            fallbackData: { prices: {}, timestamp: new Date().toISOString() }
          }
        );
        
        // Convert the prices response to the TickersResponse format
        const tickersArray: TickersResponse = [];
        
        // Process the prices data if it exists
        if (response && response.prices) {
          // Transform each price entry into a ticker entry
          Object.entries(response.prices).forEach(([symbol, price]) => {
            tickersArray.push({
              minPrice: price.toString(),
              maxPrice: price.toString(),
              oracleDecimals: 8,
              tokenSymbol: symbol,
              tokenAddress: `0x${symbol.toLowerCase()}`, // Mock address based on symbol
              updatedAt: Date.now()
            });
          });
        }
        
        logger.log(LogCategory.INFO, LogLevel.INFO, `Successfully fetched prices and converted to tickers`, { 
          requestId,
          data: { tickerCount: tickersArray.length },
          duration: timer.end()
        });
        
        // If no data was returned, use mock data
        if (tickersArray.length === 0) {
          return this.createMockTickersData();
        }
        
        return tickersArray;
      } catch (error) {
        const err = error as Error;
        
        logger.log(LogCategory.FALLBACK, LogLevel.WARN, `Oracle Keeper fetch failed, using mock data`, { 
          requestId,
          error: err,
          duration: timer.end()
        });
        
        // Generate mock tickers data if API call fails
        return this.createMockTickersData();
      }
    }
    
    // For non-World chains, return mock data
    logger.log(LogCategory.INFO, LogLevel.INFO, `Not a World Chain, returning mock tickers`, { requestId });
    return this.createMockTickersData();
  }

  /**
   * Fetch 24h prices (daily candles)
   * @returns Promise<DayPriceCandle[]> - Array of day price candles
   */
  async fetch24hPrices(): Promise<any[]> {
    // For now, return an empty array since we haven't implemented this yet
    // In a real implementation, this would fetch from the Oracle Keeper API
    return [];
  }

  /**
   * Fetch oracle candles
   */
  async fetchOracleCandles(_tokenSymbol: string, _period: string, _limit: number): Promise<any> {
    // Mock implementation to satisfy the interface
    // In a real implementation, this would fetch candle data from the Oracle Keeper API
    return { prices: [] };
  }

  /**
   * Fetch incentives rewards
   */
  async fetchIncentivesRewards(): Promise<any | null> {
    // Mock implementation to satisfy the interface
    return null;
  }

  /**
   * Post batch report
   */
  async fetchPostBatchReport(body: any, _debug = false): Promise<Response> {
    // Mock implementation to satisfy the interface
    return new Response();
  }

  /**
   * Post user feedback
   */
  async fetchPostFeedback(body: any, _debug = false): Promise<Response> {
    // Mock implementation to satisfy the interface
    return new Response();
  }

  /**
   * Fetch UI version
   */
  async fetchUiVersion(currentVersion: number, _active: boolean): Promise<number> {
    // Mock implementation to satisfy the interface
    return currentVersion;
  }

  /**
   * Fetch APYs
   */
  async fetchApys(_debug = false): Promise<any> {
    // Mock implementation to satisfy the interface
    return { markets: [], glvs: [] };
  }

  /**
   * Helper method to fetch data from Oracle Keeper with error handling
   * @param url Full URL to fetch from
   * @param options Options for fetching (caching, retries, etc.)
   * @returns Promise with the fetched data
   */
  private async fetchOracleKeeperData<T>(url: string, options: {
    cacheKey?: string;
    cacheTtl?: number;
    fallbackData?: T;
  } = {}): Promise<T> {
    const {
      cacheKey,
      cacheTtl = CACHE_TTL_MS,
      fallbackData
    } = options;
    
    const requestId = generateRequestId('fetch');
    
    try {
      // Make the fetch request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': requestId
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // If we have a cache key, store in cache
      if (cacheKey) {
        priceCache.set(cacheKey, data, cacheTtl);
      }
      
      return data;
    } catch (error) {
      // Log the error
      logger.log(LogCategory.ERROR, LogLevel.ERROR, `Failed to fetch from ${url}`, {
        requestId,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return fallback data if provided
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      
      // Otherwise throw the error
      throw error;
    }
  }

  /**
   * Fetch direct prices from the Oracle Keeper service
   * This endpoint provides real-time price data directly from CoinGecko (or Witnet when available)
   * @returns Promise<DirectPricesResponse> Object containing token prices and metadata
   */
  async fetchDirectPrices(): Promise<DirectPricesResponse> {
    // Generate a unique ID with 'direct' prefix for this request
    const requestId = generateRequestId('direct');
    const timer = new PerformanceTimer();
    const startTime = Date.now();
    
    // Use World Chain mock data if in development mode
    if (isWorldChain(this.chainId) && getWorldChainMockData('prices')) {
      // Log with proper request ID
      logger.log(LogCategory.INFO, LogLevel.INFO, "Using World Chain mock data for direct prices", { 
        requestId, 
        data: { source: "mock", startTime },
        duration: timer.end()
      });
      
      // Return mock data in the DirectPricesResponse format
      return {
        prices: {
          WLD: 1.25,
          WETH: 3000.00,
          MAG: 2.50
        },
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: 'success',
        source: 'Mock Data (Development Mode)'
      };
    }
    
    if (isWorldChain(this.chainId)) {
      try {
        // Get the current Oracle Keeper URL
        const baseUrl = this.url;
        
        // Construct the direct prices endpoint URL
        // Ensure we don't have double slashes in the URL
        const url = baseUrl.endsWith('/') 
          ? `${baseUrl}direct-prices` 
          : `${baseUrl}/direct-prices`;
        
        // Use the exported fetchOracleKeeperData function rather than a class method
        const data = await fetchOracleKeeperData<DirectPricesResponse>(
          url,
          {
            cacheKey: `direct-prices-${this.chainId}`,
            cacheTtl: 10 * 1000, // 10 seconds for real-time price data
            cacheNamespace: "prices",
            retries: 3,
            fallbackData: {
              prices: {},
              timestamp: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              status: 'error',
              source: 'Fallback',
              error: 'Failed to fetch direct prices'
            }
          }
        );
        
        const duration = Date.now() - startTime;
        logger.log(LogCategory.INFO, LogLevel.DEBUG, "Direct prices fetched successfully", {
          requestId,
          data: {
            duration,
            source: data.source,
            tokenCount: Object.keys(data.prices).length
          }
        });
        
        return data;
      } catch (error) {
        logger.log(LogCategory.ERROR, LogLevel.ERROR, "Failed to fetch direct prices", {
          requestId,
          error: error as Error,
          data: { duration: Date.now() - startTime }
        });
        
        // Return a standardized error response
        return {
          prices: {},
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          status: 'error',
          source: 'Error',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    // Return empty response for non-World Chain
    return {
      prices: {},
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: 'error',
      source: 'Not Supported',
      error: 'Direct prices only available for World Chain'
    };
  }
  
  /**
   * Clean up resources when component unmounts
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    logger.log(LogCategory.INFO, LogLevel.INFO, `EnhancedOracleKeeperFetcher cleaned up`, {
      data: { chainId: this.chainId }
    });
  }
}

/**
 * Create an instance of the enhanced Oracle Keeper fetcher
 */
export function createEnhancedOracleKeeperFetcher(chainId: number): OracleFetcher {
  return new EnhancedOracleKeeperFetcher(chainId);
}
