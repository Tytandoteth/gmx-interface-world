/**
 * World Chain Oracle Keeper Implementation
 * 
 * A clean implementation of the Oracle Keeper integration for World Chain,
 * based on the original GMX interface but adapted for World Chain specific needs.
 */

// External imports
import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";

// Domain and types imports
import { Bar } from "domain/tradingview/types";

// SDK and configuration imports
import { WORLD } from "sdk/configs/chains";

import {
  DEFAULT_ORACLE_KEEPER_URL,
  CACHE_TTL_MS,
  MOCK_PRICES,
  getMockPrice,
  getMockHistoricalPrices,
  getOracleKeeperUrl,
  isWorldChain
} from "./oracleKeeperConfig";
import {
  logger,
  buildUrl,
  parseOracleCandle,
  fetchWithTimeout,
  oracleKeeperCache as cache
} from "./oracleKeeperUtils.new";
import {
  OracleFetcher,
  TickersResponse,
  Prices24h,
  FromNewToOldArray,
  BatchReportBody,
  RawIncentivesStats,
  UserFeedbackBody,
  DirectPricesResponse,
  ApyResponse
} from "./types";

/**
 * World Chain Oracle Keeper Implementation
 * Provides GMX V1 compatibility with World Chain specific enhancements
 */
export class WorldChainOracleKeeper implements OracleFetcher {
  public readonly url: string;
  private readonly chainId: number;
  private readonly provider: Web3Provider | JsonRpcProvider;

  /**
   * Create a new World Chain Oracle Keeper
   * @param params Configuration parameters
   */
  constructor(params: { 
    chainId: number; 
    provider: Web3Provider | JsonRpcProvider 
  }) {
    this.chainId = params.chainId;
    this.provider = params.provider;
    
    // Initialize URL based on chain
    if (isWorldChain(this.chainId)) {
      this.url = import.meta.env.VITE_ORACLE_KEEPER_URL || DEFAULT_ORACLE_KEEPER_URL;
    } else {
      this.url = getOracleKeeperUrl(this.chainId);
    }
    
    logger.info(`Oracle Keeper initialized for chain ${this.chainId} with URL: ${this.url}`);
  }

  /**
   * Generate mock data for World Chain testing
   * @returns Mock tickers data
   */
  private getWorldChainMockData(): TickersResponse {
    const mockData: any[] = [];
    
    // Create mock entries for each token
    Object.entries(MOCK_PRICES).forEach(([symbol, price]) => {
      mockData.push({
        minPrice: price.toString(),
        maxPrice: price.toString(),
        oracleDecimals: 8,
        tokenSymbol: symbol,
        tokenAddress: `0x${'0'.repeat(40)}`, // Mock address
        updatedAt: Math.floor(Date.now() / 1000)
      });
    });
    
    return mockData as TickersResponse;
  }

  // Track last fetch times to avoid excessive logging
  private lastTickersFetch = 0;
  private lastDirectPricesFetch = 0;
  private lastApyFetch = 0;
  
  /**
   * Fetch current price tickers
   * @returns Promise with ticker data
   */
  async fetchTickers(): Promise<TickersResponse> {
    try {
      const now = Date.now();
      const shouldLog = now - this.lastTickersFetch > 10000; // Log at most every 10 seconds
      
      if (shouldLog) {
        this.lastTickersFetch = now;
      }
      
      // Use mock data for World Chain in development
      if (isWorldChain(this.chainId) && import.meta.env.MODE === 'development') {
        if (shouldLog) {
          logger.debug('Using mock ticker data for World Chain');
        }
        return this.getWorldChainMockData();
      }

      const url = buildUrl(this.url, "/prices/tickers");
      if (shouldLog) {
        logger.debug(`Fetching tickers from ${url}`);
      }
      
      const data = await fetchWithTimeout<TickersResponse>(url);
      return data;
    } catch (error: unknown) {
      logger.error('Failed to fetch tickers:', error instanceof Error ? error.message : String(error));
      
      // Fallback to mock data for World Chain
      if (isWorldChain(this.chainId)) {
        logger.warn('Falling back to mock ticker data for World Chain');
        return this.getWorldChainMockData();
      }
      
      throw error;
    }
  }

  /**
   * Fetch 24h price data
   * @returns Promise with 24h price data
   */
  async fetch24hPrices(): Promise<Prices24h> {
    try {
      const url = buildUrl(this.url, "/prices/24h");
      logger.info(`Fetching 24h prices from ${url}`);
      
      // Try to get from cache first
      const cacheKey = `prices24h_${this.chainId}`;
      const cachedData = cache.get<Prices24h>(cacheKey, CACHE_TTL_MS);
      
      if (cachedData) {
        logger.info('Using cached 24h price data');
        return cachedData;
      }
      
      const response = await fetchWithTimeout<any>(url);
      
      // Transform original GMX format to our format if needed
      if (Array.isArray(response)) {
        const result: Prices24h = {};
        
        response.forEach((item) => {
          result[item.tokenSymbol] = {
            timestamp: Math.floor(Date.now() / 1000),
            price: (Number(item.open) + Number(item.close)) / 2,
            change24h: ((Number(item.close) - Number(item.open)) / Number(item.open)) * 100
          };
        });
        
        cache.set(cacheKey, result);
        return result;
      }
      
      // If already in correct format
      cache.set(cacheKey, response);
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch 24h prices:', error instanceof Error ? error.message : String(error));
      
      // Return empty object on error
      return {};
    }
  }

  /**
   * Generate mock candles for World Chain
   * @param tokenSymbol Token symbol
   * @param limit Number of candles to fetch
   * @returns Array of candle data
   */
  private getWorldChainMockCandles(tokenSymbol: string, limit: number): FromNewToOldArray<Bar> {
    const normalizedSymbol = tokenSymbol.toUpperCase();
    
    // Check if we have mock historical data for this token using helper function
    const historicalData = getMockHistoricalPrices(normalizedSymbol);
    if (historicalData) {
      // Slice the appropriate number of candles, or return all if limit > available
      const startIndex = Math.max(0, historicalData.length - limit);
      return historicalData.slice(startIndex);
    }
    
    // Fallback for tokens without mock data
    const basePrice = getMockPrice(normalizedSymbol);
    const variance = basePrice * 0.03; // 3% variance
    
    const now = Math.floor(Date.now() / 1000);
    const interval = 3600; // 1 hour intervals
    const result: Bar[] = [];
    
    let lastPrice = basePrice;
    for (let i = 0; i < limit; i++) {
      const time = now - (limit - i) * interval;
      const randomChange = (Math.random() - 0.5) * variance;
      const meanReversion = (basePrice - lastPrice) * 0.2;
      lastPrice = lastPrice + randomChange + meanReversion;
      
      const open = lastPrice;
      const close = lastPrice + (Math.random() - 0.5) * variance * 0.5;
      const high = Math.max(open, close) + Math.random() * variance * 0.3;
      const low = Math.min(open, close) - Math.random() * variance * 0.3;
      
      result.push({
        time,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000000
      });
    }
    
    return result;
  }

  // Track most recent fetch requests to avoid duplicate logging
  private lastFetchedCandles: Record<string, number> = {};
  
  /**
   * Fetch candle data for a token
   * @param tokenSymbol Token symbol
   * @param period Period (e.g. "15m", "1h", "4h", "1d")
   * @param limit Number of candles to fetch
   * @returns Promise with candle data
   */
  async fetchOracleCandles(
    tokenSymbol: string,
    period: string,
    limit: number
  ): Promise<FromNewToOldArray<Bar>> {
    try {
      // Normalize token symbol - uppercase
      const normalizedSymbol = tokenSymbol.toUpperCase();
      
      // Create a key to track this specific request
      const requestKey = `${normalizedSymbol}_${period}_${limit}`;
      const now = Date.now();
      const lastFetched = this.lastFetchedCandles[requestKey] || 0;
      
      // Only log if this is a new request or hasn't been logged in the last 30 seconds
      const shouldLogRequest = now - lastFetched > 30000;
      
      // Use mock data for World Chain in development mode
      if (isWorldChain(this.chainId) && import.meta.env.MODE === 'development') {
        if (shouldLogRequest) {
          logger.debug(`Using mock candle data for ${normalizedSymbol} on World Chain`);
          // Update last fetched time
          this.lastFetchedCandles[requestKey] = now;
        }
        const mockCandles = this.getWorldChainMockCandles(normalizedSymbol, limit);
        return mockCandles;
      }
      
      // Try cached data first
      const cacheKey = `candles_${normalizedSymbol}_${period}_${limit}`;
      const cachedData = cache.get<FromNewToOldArray<Bar>>(cacheKey, CACHE_TTL_MS);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Construct URL
      const url = buildUrl(this.url, "/prices/candles", {
        tokenSymbol: normalizedSymbol,
        period,
        limit
      });
      
      logger.info(`Fetching candles from ${url}`);
      
      const response = await fetchWithTimeout<{ candles: number[][] }>(url);
      
      if (!response || !Array.isArray(response.candles)) {
        throw new Error("Invalid candles response format");
      }
      
      const candles = response.candles.map(parseOracleCandle);
      cache.set(cacheKey, candles);
      
      return candles;
    } catch (error: unknown) {
      logger.error(`Failed to fetch candles for ${tokenSymbol}:`, 
        error instanceof Error ? error.message : String(error));
      
      // Fallback to mock data for World Chain
      if (isWorldChain(this.chainId)) {
        logger.warn(`Falling back to mock candle data for ${tokenSymbol}`);
        return this.getWorldChainMockCandles(tokenSymbol, limit);
      }
      
      // Return empty array on error for non-World chains
      return [];
    }
  }

  /**
   * Fetch direct prices (World Chain specific)
   * @returns Promise with direct price data
   */
  async fetchDirectPrices(): Promise<DirectPricesResponse> {
    try {
      const now = Date.now();
      const shouldLog = now - this.lastDirectPricesFetch > 10000; // Log at most every 10 seconds
      
      if (shouldLog) {
        this.lastDirectPricesFetch = now;
      }
      
      const url = buildUrl(this.url, "/direct-prices");
      if (shouldLog) {
        logger.debug(`Fetching direct prices from ${url}`);
      }
      
      const data = await fetchWithTimeout<DirectPricesResponse>(url);
      return data;
    } catch (error: unknown) {
      logger.error('Failed to fetch direct prices:', error instanceof Error ? error.message : String(error));
      
      // Return fallback response object that matches the expected type
      return {
        prices: {},  // Empty prices object, not an array
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: 'error',
        source: 'fallback',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Fetch APY data
   * @returns Promise with APY data
   */
  async fetchApys(): Promise<ApyResponse> {
    try {
      const url = buildUrl(this.url, "/apy");
      logger.info(`Fetching APYs from ${url}`);
      
      const response = await fetchWithTimeout<ApyResponse>(url);
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch APYs:', 
        error instanceof Error ? error.message : String(error));
      
      // Return empty object on error
      return {};
    }
  }

  /**
   * Fetch incentives rewards data
   * @returns Promise with incentives rewards data
   */
  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    try {
      const url = buildUrl(this.url, "/incentives");
      logger.info(`Fetching incentives rewards from ${url}`);
      
      const response = await fetchWithTimeout<RawIncentivesStats>(url);
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch incentives rewards:', 
        error instanceof Error ? error.message : String(error));
      
      // Return null on error
      return null;
    }
  }

  /**
   * Submit batch report
   * @param body Batch report body
   * @returns Promise with success status
   */
  async fetchPostBatchReport(body: BatchReportBody): Promise<boolean> {
    try {
      const url = buildUrl(this.url, "/report/batch");
      logger.info(`Posting batch report to ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      return response.ok;
    } catch (error: unknown) {
      logger.error('Failed to post batch report:', 
        error instanceof Error ? error.message : String(error));
      
      // Return false on error
      return false;
    }
  }

  /**
   * Submit user feedback
   * @param body User feedback body
   * @returns Promise with success status
   */
  async fetchPostFeedback(body: UserFeedbackBody): Promise<boolean> {
    try {
      const url = buildUrl(this.url, "/feedback");
      logger.info(`Posting feedback to ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      return response.ok;
    } catch (error: unknown) {
      logger.error('Failed to post feedback:', 
        error instanceof Error ? error.message : String(error));
      
      // Return false on error
      return false;
    }
  }

  /**
   * Fetch UI version
   * @returns Promise with UI version
   */
  async fetchUiVersion(): Promise<string | null> {
    try {
      const url = buildUrl(this.url, "/version");
      logger.info(`Fetching UI version from ${url}`);
      
      const response = await fetchWithTimeout<{ version: string }>(url);
      return response.version;
    } catch (error: unknown) {
      logger.error('Failed to fetch UI version:', 
        error instanceof Error ? error.message : String(error));
      
      // Return null on error
      return null;
    }
  }
}

/**
 * Create a singleton instance of World Chain Oracle Keeper
 * @param chainId Chain ID
 * @param provider Web3 provider
 * @returns Oracle Keeper instance
 */
export function createWorldChainOracleKeeper(
  chainId: number,
  provider: Web3Provider | JsonRpcProvider
): WorldChainOracleKeeper {
  return new WorldChainOracleKeeper({ chainId, provider });
}
