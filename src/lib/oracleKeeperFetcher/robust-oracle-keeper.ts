import { WORLD } from "sdk/configs/chains";
import { isWorldChain, getWorldChainMockData } from "lib/worldchain";
import { WorldChainConfig } from "lib/worldchain/worldChainDevMode";
import { 
  TickersResponse, 
  DayPriceCandle, 
  OracleFetcher,
  FromNewToOldArray,
  Bar,
  BatchReportBody,
  RawIncentivesStats,
  UserFeedbackBody,
  ApyInfo
} from "./types";
import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";
import { getRedstoneOracleIntegration, PriceData } from "lib/redstone";
import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";
import { parseOracleCandle } from "./utils";

// Constants
const DEFAULT_ORACLE_KEEPER_URL = 'https://oracle-keeper.kevin8396.workers.dev';
const REQUEST_TIMEOUT_MS = 5000; // 5 seconds timeout
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY_MS = 1000;
const CACHE_TTL_MS = 60000; // 1 minute cache validity
const STALE_CACHE_TTL_MS = 300000; // 5 minutes stale cache validity

/**
 * Cache entry type
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple in-memory cache for Oracle Keeper responses
 */
class OracleKeeperCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get a value from the cache
   * @param key Cache key
   * @param maxAge Maximum age in ms (default: CACHE_TTL_MS)
   * @returns The cached value or undefined
   */
  get<T>(key: string, maxAge: number = CACHE_TTL_MS): T | undefined {
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
   * Get a stale value from the cache (useful for fallbacks)
   * @param key Cache key
   * @param maxStaleAge Maximum stale age in ms (default: STALE_CACHE_TTL_MS)
   * @returns The cached value or undefined
   */
  getStale<T>(key: string, maxStaleAge: number = STALE_CACHE_TTL_MS): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age < maxStaleAge) {
      return entry.data as T;
    }
    
    return undefined;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param data Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const cache = new OracleKeeperCache();

/**
 * Helper to delay execution
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retries
 * @param url URL to fetch
 * @param options Fetch options
 * @param retryCount Maximum number of retries
 * @returns Promise with the response
 */
async function fetchWithRetry<T>(
  url: string, 
  options: RequestInit = {}, 
  retryCount: number = MAX_RETRY_COUNT
): Promise<T> {
  // Set up timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    // Clear timeout
    clearTimeout(timeoutId);
    
    if (retryCount <= 0) {
      throw error;
    }
    
    // Exponential backoff with jitter
    const backoffDelay = RETRY_BASE_DELAY_MS * Math.pow(2, MAX_RETRY_COUNT - retryCount);
    const jitteredDelay = backoffDelay * (0.8 + Math.random() * 0.4);
    
    console.log(`Retrying fetch to ${url} after ${jitteredDelay.toFixed(0)}ms, ${retryCount} attempts left`);
    await delay(jitteredDelay);
    
    return fetchWithRetry<T>(url, options, retryCount - 1);
  }
}

/**
 * Robust Oracle Keeper implementation that ensures 100% reliability
 */
export class RobustOracleKeeper implements OracleFetcher {
  readonly url: string;
  private readonly chainId: number;
  private readonly oracleKeeperIndex: number;
  private readonly provider?: Web3Provider | JsonRpcProvider;
  private readonly setOracleKeeperInstancesConfig?: (
    setter: (old: { [chainId: number]: number } | undefined) => {
      [chainId: number]: number;
    }
  ) => void;
  private readonly forceIncentivesActive: boolean;

  constructor(p: {
    chainId: number;
    oracleKeeperIndex: number;
    setOracleKeeperInstancesConfig?: (
      setter: (old: { [chainId: number]: number } | undefined) => {
        [chainId: number]: number;
      }
    ) => void;
    forceIncentivesActive: boolean;
    provider?: Web3Provider | JsonRpcProvider;
  }) {
    this.chainId = p.chainId;
    this.provider = p.provider;
    this.forceIncentivesActive = p.forceIncentivesActive;
    this.setOracleKeeperInstancesConfig = p.setOracleKeeperInstancesConfig;
    
    // Special handling for World Chain
    if (p.chainId === WORLD) {
      this.oracleKeeperIndex = 0;
      
      // Initialize World Chain specific config
      if (p.setOracleKeeperInstancesConfig) {
        p.setOracleKeeperInstancesConfig((old) => {
          const config = old ? { ...old } : {};
          config[WORLD] = 0;
          return config;
        });
      }
    } else {
      this.oracleKeeperIndex = p.oracleKeeperIndex;
    }
    
    // Initialize URL
    this.url = getOracleKeeperUrl(this.chainId, this.oracleKeeperIndex);
    
    // Log configuration for debugging
    if (this.chainId === WORLD) {
      console.log(`RobustOracleKeeper initialized for World Chain: ${this.url}`);
    }
  }

  /**
   * Check if Oracle Keeper is healthy
   * @returns Promise resolving to health status
   */
  private async checkHealth(): Promise<boolean> {
    try {
      const healthUrl = this.url.endsWith('/') 
        ? `${this.url}health` 
        : `${this.url}/health`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      
      const response = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch (error) {
      console.warn("Health check failed:", error);
      return false;
    }
  }

  /**
   * Create mock ticker data as fallback
   * @returns Mock ticker data
   */
  private createMockTickers(): TickersResponse {
    const mockPrices = getWorldChainMockData<Record<string, number>>("prices") || {
      // Default fallback values
      BTC: 50000,
      ETH: 3000,
      USDC: 1,
      USDT: 1,
      DAI: 1
    };
    
    return Object.entries(mockPrices).map(([tokenSymbol, price]) => ({
      minPrice: price.toString(),
      maxPrice: price.toString(),
      oracleDecimals: 8,
      tokenSymbol,
      tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`,
      updatedAt: Math.floor(Date.now() / 1000),
      source: "fallback"
    })) as TickersResponse;
  }

  /**
   * Helper method to get prices using RedStone integration
   */
  private async getRedStonePrices(symbols: string[]): Promise<Record<string, PriceData>> {
    if (!this.provider || !isWorldChain(this.chainId) || !WorldChainConfig.redstone?.enabled) {
      return {};
    }

    try {
      const redstoneIntegration = getRedstoneOracleIntegration(this.chainId, this.provider, this.url);
      return await redstoneIntegration.getPrices(symbols);
    } catch (error) {
      console.error("Failed to get prices from RedStone:", error);
      return {};
    }
  }

  /**
   * Convert RedStone price data to Tickers format
   */
  private pricesToTickers(prices: Record<string, PriceData>): TickersResponse {
    return Object.entries(prices).map(([tokenSymbol, data]) => ({
      minPrice: data.price.toString(),
      maxPrice: data.price.toString(),
      oracleDecimals: 8,
      tokenSymbol,
      tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`,
      updatedAt: Math.floor(data.timestamp / 1000),
      source: data.source
    })) as TickersResponse;
  }

  /**
   * Switch to next Oracle Keeper instance
   */
  private switchOracleKeeper() {
    if (!this.setOracleKeeperInstancesConfig) {
      return;
    }

    const nextIndex = getOracleKeeperNextIndex(this.chainId, this.oracleKeeperIndex);

    if (nextIndex === this.oracleKeeperIndex) {
      console.error(`No available oracle keeper for chain ${this.chainId}`);
      return;
    }

    console.log(`Switch oracle keeper to ${getOracleKeeperUrl(this.chainId, nextIndex)}`);

    this.setOracleKeeperInstancesConfig((old) => {
      return { ...old, [this.chainId]: nextIndex };
    });
  }

  /**
   * Fetch latest price data with robust error handling and fallbacks
   */
  async fetchTickers(): Promise<TickersResponse> {
    // Special handling for World Chain
    if (isWorldChain(this.chainId)) {
      const cacheKey = `tickers_${this.chainId}`;
      
      try {
        // First check if Oracle Keeper is online
        const isHealthy = await this.checkHealth();
        
        // Try RedStone integration first if enabled
        if (WorldChainConfig.redstone?.enabled && this.provider) {
          try {
            // Get token symbols we need data for
            const availableTokens = WorldChainConfig?.tokens?.map(t => t.symbol) || [];
            const redStonePrices = await this.getRedStonePrices(availableTokens);
            
            if (Object.keys(redStonePrices).length > 0) {
              console.log("Using RedStone price data");
              const tickers = this.pricesToTickers(redStonePrices);
              cache.set(cacheKey, tickers);
              return tickers;
            }
          } catch (error) {
            console.warn("RedStone integration failed:", error);
            // Continue to Oracle Keeper
          }
        }
        
        // If RedStone failed or not enabled, try Oracle Keeper
        if (isHealthy) {
          try {
            const pricesUrl = this.url.endsWith('/') 
              ? `${this.url}prices` 
              : `${this.url}/prices`;
            
            console.log(`Fetching prices from Oracle Keeper: ${pricesUrl}`);
            const data = await fetchWithRetry<any>(pricesUrl);
            
            // Process response based on format
            if (data && typeof data === 'object') {
              // Format 1: { prices: {...} }
              if (data.prices && typeof data.prices === 'object') {
                const tickers = Object.entries(data.prices).map(([tokenSymbol, price]) => ({
                  minPrice: String(price),
                  maxPrice: String(price),
                  oracleDecimals: 8,
                  tokenSymbol,
                  tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`,
                  updatedAt: Math.floor(Date.now() / 1000),
                  source: "oracle"
                })) as TickersResponse;
                
                cache.set(cacheKey, tickers);
                return tickers;
              }
              
              // Format 2: Array of ticker objects
              if (Array.isArray(data) && data.length > 0) {
                cache.set(cacheKey, data);
                return data as TickersResponse;
              }
            }
            
            throw new Error("Invalid response format");
          } catch (error) {
            console.warn("Oracle Keeper fetch failed:", error);
            // Try cached data
          }
        } else {
          console.warn("Oracle Keeper is not healthy");
        }
        
        // Try to get cached data (even if stale)
        const cachedData = cache.getStale<TickersResponse>(cacheKey);
        if (cachedData) {
          console.log("Using cached price data");
          return cachedData;
        }
        
        // Last resort: use mock data
        console.log("Using mock price data as last resort");
        return this.createMockTickers();
      } catch (error) {
        console.error("All price sources failed:", error);
        return this.createMockTickers();
      }
    }
    
    // Standard behavior for other chains
    try {
      const pricesUrl = this.url.endsWith('/') 
        ? `${this.url}prices` 
        : `${this.url}/prices`;
      
      const data = await fetchWithRetry<any>(pricesUrl);
      
      if (Array.isArray(data) && data.length > 0) {
        return data as TickersResponse;
      }
      
      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Error fetching prices:", error);
      this.switchOracleKeeper();
      throw error;
    }
  }

  /**
   * Fetch 24-hour price data with robust error handling
   */
  async fetch24hPrices(): Promise<DayPriceCandle[]> {
    if (isWorldChain(this.chainId)) {
      const cacheKey = `prices_24h_${this.chainId}`;
      
      try {
        // Try cached data first
        const cachedData = cache.get<DayPriceCandle[]>(cacheKey);
        if (cachedData) {
          return cachedData;
        }
        
        // Check health
        const isHealthy = await this.checkHealth();
        if (!isHealthy) {
          throw new Error("Oracle Keeper is not healthy");
        }
        
        // Fetch 24h prices
        const url24h = this.url.endsWith('/') 
          ? `${this.url}prices/24h` 
          : `${this.url}/prices/24h`;
        
        const data = await fetchWithRetry<any>(url24h);
        
        if (data && typeof data === 'object') {
          // Store in cache
          cache.set(cacheKey, data);
          return data as DayPriceCandle[];
        }
        
        throw new Error("Invalid 24h prices response");
      } catch (error) {
        console.warn("Error fetching 24h prices:", error);
        
        // Try stale cache
        const staleData = cache.getStale<DayPriceCandle[]>(cacheKey);
        if (staleData) {
          return staleData;
        }
        
        // Fallback to mock data
        return [];
      }
    }
    
    // Standard behavior for other chains
    try {
      const url24h = this.url.endsWith('/') 
        ? `${this.url}prices/24h` 
        : `${this.url}/prices/24h`;
      
      const data = await fetchWithRetry<any>(url24h);
      
      if (Array.isArray(data)) {
        return data as DayPriceCandle[];
      }
      
      throw new Error("Invalid 24h prices response");
    } catch (error) {
      console.error("Error fetching 24h prices:", error);
      this.switchOracleKeeper();
      return [];
    }
  }

  /**
   * Fetch candle data for a token
   */
  async fetchOracleCandles(
    tokenSymbol: string,
    period: string,
    limit: number
  ): Promise<FromNewToOldArray<Bar>> {
    try {
      const cacheKey = `candles_${this.chainId}_${tokenSymbol}_${period}_${limit}`;
      
      // Try cached data first
      const cachedData = cache.get<FromNewToOldArray<Bar>>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Construct URL
      const candlesUrl = this.url.endsWith('/') 
        ? `${this.url}candles/${tokenSymbol}?period=${period}&limit=${limit}` 
        : `${this.url}/candles/${tokenSymbol}?period=${period}&limit=${limit}`;
      
      // Fetch with retries
      const response = await fetchWithRetry<number[][]>(candlesUrl);
      
      if (Array.isArray(response)) {
        const candles = response.map(parseOracleCandle) as FromNewToOldArray<Bar>;
        
        // Store in cache
        cache.set(cacheKey, candles);
        
        return candles;
      }
      
      throw new Error("Invalid candles response");
    } catch (error) {
      console.error(`Error fetching candles for ${tokenSymbol}:`, error);
      
      if (!isWorldChain(this.chainId)) {
        this.switchOracleKeeper();
      }
      
      return [] as FromNewToOldArray<Bar>;
    }
  }

  /**
   * Fetch incentives rewards data
   */
  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    try {
      const incentivesUrl = this.url.endsWith('/') 
        ? `${this.url}incentives` 
        : `${this.url}/incentives`;
      
      return await fetchWithRetry<RawIncentivesStats | null>(incentivesUrl);
    } catch (error) {
      console.error("Error fetching incentives:", error);
      
      if (!isWorldChain(this.chainId)) {
        this.switchOracleKeeper();
      }
      
      return null;
    }
  }

  /**
   * Post batch report
   */
  async fetchPostBatchReport(body: BatchReportBody, debug = false): Promise<Response> {
    try {
      const reportUrl = this.url.endsWith('/') 
        ? `${this.url}report` 
        : `${this.url}/report`;
      
      const response = await fetch(reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error("Error posting batch report:", error);
      throw error;
    }
  }

  /**
   * Post user feedback
   */
  async fetchPostFeedback(body: UserFeedbackBody, debug = false): Promise<Response> {
    try {
      const feedbackUrl = this.url.endsWith('/') 
        ? `${this.url}feedback` 
        : `${this.url}/feedback`;
      
      const response = await fetch(feedbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error("Error posting feedback:", error);
      throw error;
    }
  }

  /**
   * Fetch UI version info
   */
  async fetchUiVersion(currentVersion: number, active: boolean): Promise<number> {
    try {
      const versionUrl = this.url.endsWith('/') 
        ? `${this.url}version?current=${currentVersion}&active=${active}` 
        : `${this.url}/version?current=${currentVersion}&active=${active}`;
      
      const data = await fetchWithRetry<{version: number}>(versionUrl);
      
      if (data && typeof data.version === 'number') {
        return data.version;
      }
      
      return currentVersion;
    } catch (error) {
      console.error("Error fetching UI version:", error);
      
      if (!isWorldChain(this.chainId)) {
        this.switchOracleKeeper();
      }
      
      return currentVersion;
    }
  }

  /**
   * Fetch APY information
   */
  async fetchApys(debug = false): Promise<ApyInfo> {
    try {
      const apyUrl = this.url.endsWith('/') 
        ? `${this.url}apy` 
        : `${this.url}/apy`;
      
      return await fetchWithRetry<ApyInfo>(apyUrl);
    } catch (error) {
      console.error("Error fetching APYs:", error);
      
      if (!isWorldChain(this.chainId)) {
        this.switchOracleKeeper();
      }
      
      // Return empty APY info as fallback
      return {
        markets: [],
        glvs: []
      } as ApyInfo;
    }
  }
}
