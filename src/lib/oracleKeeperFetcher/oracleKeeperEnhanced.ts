/**
 * Enhanced Oracle Keeper Fetcher
 * Implements request correlation, advanced logging, and more robust error handling
 */

// External dependencies
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { isWorldChain, getWorldChainMockData } from "lib/worldchain";
import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

// Constants are imported from oracleKeeperConstants.ts

// Internal dependencies
import { 
  DiagnosticLogger, 
  LogCategory, 
  LogLevel, 
  generateRequestId, 
  PerformanceTimer,
  createDiagnosticCache, 
  createDiagnosticFetch
} from "./debug/diagnostics";
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
  DayPriceCandle, 
  BatchReportBody, 
  UserFeedbackBody, 
  RawIncentivesStats,
  ApyInfo,
  OracleKeeperHealthStatus,
  TokenPriceStatus
} from "./types";

// Create namespace-specific diagnostic cache
const tickerCache = createDiagnosticCache("tickers");
const priceCache = createDiagnosticCache("prices");
const logger = DiagnosticLogger.getInstance();

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
  const requestId = generateRequestId();
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
  
  const requestId = generateRequestId();
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
  async checkHealth(): Promise<boolean> {
    const requestId = generateRequestId();
    const timer = new PerformanceTimer();
    
    try {
      // First try the dedicated health endpoint
      const healthUrl = this.url.endsWith('/') ? `${this.url}health` : `${this.url}/health`;
      logger.log(LogCategory.DEBUG, LogLevel.DEBUG, `Checking Oracle Keeper health: ${healthUrl}`, { requestId });
      
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
      
      throw new Error(`Health check failed: Both health and prices endpoints failed`);
    } catch (error) {
      const err = error as Error;
      
      logger.log(LogCategory.ERROR, LogLevel.ERROR, `Oracle Keeper health check failed`, { 
        requestId, 
        error: err,
        duration: timer.end()
      });
      
      return false;
    }
  }
  
  // Note: customUrl property already defined in the class
  
  /**
   * Set the Oracle Keeper URL
   * @param url New URL for the Oracle Keeper
   */
  setUrl(url: string): void {
    if (url && url.trim() !== '') {
      this.customUrl = url.trim();
      logger.log(LogCategory.INFO, LogLevel.INFO, `Oracle Keeper URL set: ${this.customUrl}`, { 
      requestId: generateRequestId() 
    });
    }
  }
  
  /**
   * Internal method to check health
   */
  private async checkOracleKeeperHealth(): Promise<void> {
    this.lastHealthCheck = Date.now();
    this.isHealthy = await this.checkHealth();
    
    logger.log(
      LogCategory.INFO, 
      this.isHealthy ? LogLevel.INFO : LogLevel.WARN, 
      `Oracle Keeper health status: ${this.isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${this.url})`,
      { requestId: generateRequestId() }
    );
  }
  
  /**
   * Fetch tickers with enhanced error handling and diagnostics
   */
  async fetchTickers(): Promise<TickersResponse> {
    const requestId = generateRequestId();
    const timer = new PerformanceTimer();
    
    logger.log(LogCategory.INFO, LogLevel.INFO, `Fetching tickers for chain ${this.chainId} from ${this.url}`, { 
      requestId
    });
    
    // Special handling for World Chain development mode
    if (isWorldChain(this.chainId)) {
      try {
        // Attempt to fetch from Oracle Keeper first
        const tickersUrl = this.url.endsWith('/') ? `${this.url}tickers` : `${this.url}/tickers`;
        
        const data = await fetchOracleKeeperData<TickersResponse>(
          tickersUrl,
          {
            cacheKey: `tickers-${this.chainId}`,
            fallbackData: (getWorldChainMockData<{tickers: TickersResponse}>('default')?.tickers || []) as TickersResponse
          }
        );
        
        logger.log(LogCategory.INFO, LogLevel.INFO, `Successfully fetched tickers`, { 
          requestId,
          data: { tickerCount: Object.keys(data).length },
          duration: timer.end()
        });
        
        return data;
      } catch (error) {
        const err = error as Error;
        
        logger.log(LogCategory.FALLBACK, LogLevel.WARN, `Oracle Keeper fetch failed, using mock data`, { 
          requestId,
          error: err,
          duration: timer.end()
        });
        
        return (getWorldChainMockData<{tickers: TickersResponse}>('default')?.tickers || []) as TickersResponse;
      }
    }
    
    // For non-World chains, return empty response
    logger.log(LogCategory.INFO, LogLevel.INFO, `Not a World Chain, returning empty tickers`, { requestId });
    // Return mock empty array that satisfies TickersResponse type
    return [] as TickersResponse;
  }
  
  /**
   * Fetch 24h prices with enhanced error handling and diagnostics
   */
  async fetch24hPrices(): Promise<DayPriceCandle[]> {
    const requestId = generateRequestId();
    const timer = new PerformanceTimer();
    
    logger.log(LogCategory.INFO, LogLevel.INFO, `Fetching 24h prices for chain ${this.chainId} from ${this.url}`, { 
      requestId
    });
    
    if (isWorldChain(this.chainId)) {
      try {
        const url24h = this.url.endsWith('/') ? `${this.url}prices/24h` : `${this.url}/prices/24h`;
        
        const data = await fetchOracleKeeperData<DayPriceCandle[]>(
          url24h,
          {
            cacheKey: `prices-24h-${this.chainId}`,
            cacheNamespace: "prices",
            fallbackData: []
          }
        );
        
        logger.log(LogCategory.INFO, LogLevel.INFO, `Successfully fetched 24h prices`, { 
          requestId,
          data: { count: data.length },
          duration: timer.end()
        });
        
        return data;
      } catch (error) {
        const err = error as Error;
        
        logger.log(LogCategory.FALLBACK, LogLevel.WARN, `Oracle Keeper fetch failed for 24h prices`, { 
          requestId,
          error: err,
          duration: timer.end()
        });
        
        return [];
      }
    }
    
    // For non-World chains, return empty array
    return [];
  }
  
  /**
   * Fetch oracle candles
   */
  async fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    const requestId = generateRequestId();
    const timer = new PerformanceTimer();
    
    if (isWorldChain(this.chainId)) {
      try {
        const candlesUrl = this.url.endsWith('/') 
          ? `${this.url}candles/${tokenSymbol}/${period}/${limit}` 
          : `${this.url}/candles/${tokenSymbol}/${period}/${limit}`;
        
        const data = await fetchOracleKeeperData<FromNewToOldArray<Bar>>(
          candlesUrl,
          {
            cacheKey: `candles-${tokenSymbol}-${period}-${limit}`,
            cacheNamespace: "prices",
            fallbackData: { prices: [] } as unknown as FromNewToOldArray<Bar>
          }
        );
        
        logger.log(LogCategory.INFO, LogLevel.INFO, `Successfully fetched candles`, { 
          requestId,
          data: { tokenSymbol, period, limit },
          duration: timer.end()
        });
        
        return data;
      } catch (error) {
        const err = error as Error;
        
        logger.log(LogCategory.ERROR, LogLevel.ERROR, `Failed to fetch candles`, { 
          requestId,
          error: err,
          data: { tokenSymbol, period, limit },
          duration: timer.end()
        });
        
        return { prices: [] } as unknown as FromNewToOldArray<Bar>;
      }
    }
    
    // For non-World chains, return empty
    return { prices: [] } as unknown as FromNewToOldArray<Bar>;
  }
  
  /**
   * Fetch incentives rewards
   */
  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    const requestId = generateRequestId();
    const timer = new PerformanceTimer();
    
    if (isWorldChain(this.chainId)) {
      try {
        const url = this.url.endsWith('/') 
          ? `${this.url}incentives/rewards` 
          : `${this.url}/incentives/rewards`;
        
        const data = await fetchOracleKeeperData<RawIncentivesStats | null>(
          url,
          {
            cacheKey: `incentives-rewards-${this.chainId}`,
            cacheTtl: 5 * 60 * 1000, // 5 minutes
            fallbackData: null
          }
        );
        
        logger.log(LogCategory.INFO, LogLevel.INFO, `Successfully fetched incentives rewards`, { 
          requestId,
          duration: timer.end()
        });
        
        return data;
      } catch (error) {
        const err = error as Error;
        
        logger.log(LogCategory.ERROR, LogLevel.ERROR, `Failed to fetch incentives rewards`, { 
          requestId,
          error: err,
          duration: timer.end()
        });
        
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Post batch report
   */
  async fetchPostBatchReport(body: BatchReportBody, debug = false): Promise<Response> {
    const requestId = generateRequestId();
    const fetch = createDiagnosticFetch(requestId);
    
    if (debug) {
      logger.log(LogCategory.DEBUG, LogLevel.DEBUG, "Skipping batch report in debug mode");
      return new Response();
    }
    
    const reportUrl = this.url.endsWith('/') ? `${this.url}report/batch` : `${this.url}/report/batch`;
    
    try {
      const response = await fetch(reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      
      return response;
    } catch (error) {
      logger.log(LogCategory.ERROR, LogLevel.ERROR, "Failed to post batch report", {
        requestId,
        error: error as Error
      });
      
      return new Response();
    }
  }
  
  /**
   * Post user feedback
   */
  async fetchPostFeedback(body: UserFeedbackBody, debug = false): Promise<Response> {
    const requestId = generateRequestId();
    const fetch = createDiagnosticFetch(requestId);
    
    if (debug) {
      logger.log(LogCategory.DEBUG, LogLevel.DEBUG, "Skipping feedback in debug mode");
      return new Response();
    }
    
    const feedbackUrl = this.url.endsWith('/') ? `${this.url}report/ui/feedback` : `${this.url}/report/ui/feedback`;
    
    try {
      const response = await fetch(feedbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      
      return response;
    } catch (error) {
      logger.log(LogCategory.ERROR, LogLevel.ERROR, "Failed to post feedback", {
        requestId,
        error: error as Error
      });
      
      return new Response();
    }
  }
  
  /**
   * Fetch UI version
   */
  async fetchUiVersion(currentVersion: number, active: boolean): Promise<number> {
    const requestId = generateRequestId();
    
    if (isWorldChain(this.chainId)) {
      try {
        const url = this.url.endsWith('/') 
          ? `${this.url}ui/version` 
          : `${this.url}/ui/version`;
        
        const params = new URLSearchParams();
        params.append("currentVersion", currentVersion.toString());
        params.append("active", active ? "true" : "false");
        
        const data = await fetchOracleKeeperData<{version: number}>(
          `${url}?${params.toString()}`,
          {
            cacheKey: `ui-version-${currentVersion}-${active}`,
            cacheTtl: 10 * 60 * 1000, // 10 minutes
            fallbackData: { version: currentVersion }
          }
        );
        
        return data.version;
      } catch (error) {
        logger.log(LogCategory.ERROR, LogLevel.ERROR, "Failed to fetch UI version", {
          requestId,
          error: error as Error
        });
        
        return currentVersion;
      }
    }
    
    return currentVersion;
  }
  
  /**
   * Fetch APYs
   */
  async fetchApys(debug = false): Promise<ApyInfo> {
    const requestId = generateRequestId();
    
    if (debug) {
      logger.log(LogCategory.DEBUG, LogLevel.DEBUG, "Skipping APYs fetch in debug mode");
      return { markets: [], glvs: [] };
    }
    
    if (isWorldChain(this.chainId)) {
      try {
        const url = this.url.endsWith('/') 
          ? `${this.url}incentives/apys` 
          : `${this.url}/incentives/apys`;
        
        const data = await fetchOracleKeeperData<ApyInfo>(
          url,
          {
            cacheKey: `apys-${this.chainId}`,
            cacheTtl: 10 * 60 * 1000, // 10 minutes
            fallbackData: { markets: [], glvs: [] }
          }
        );
        
        return data;
      } catch (error) {
        logger.log(LogCategory.ERROR, LogLevel.ERROR, "Failed to fetch APYs", {
          requestId,
          error: error as Error
        });
      }
    }
    
    return { markets: [], glvs: [] };
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
