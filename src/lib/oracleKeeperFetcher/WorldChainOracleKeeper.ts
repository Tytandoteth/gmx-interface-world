/**
 * World Chain Oracle Keeper Implementation
 * 
 * A clean implementation of the Oracle Keeper integration for World Chain,
 * based on the original GMX interface but adapted for World Chain specific needs.
 */

import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";

import { WORLD } from "sdk/configs/chains";
import { Bar } from "domain/tradingview/types";

import {
  DEFAULT_ORACLE_KEEPER_URL,
  CACHE_TTL_MS,
  MOCK_PRICES,
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

  /**
   * Fetch current price tickers
   * @returns Promise with ticker data
   */
  async fetchTickers(): Promise<TickersResponse> {
    try {
      // Use mock data for World Chain in development
      if (isWorldChain(this.chainId) && import.meta.env.MODE === 'development') {
        logger.info('Using mock ticker data for World Chain');
        return this.getWorldChainMockData();
      }

      const url = buildUrl(this.url, "/prices/tickers");
      logger.info(`Fetching tickers from ${url}`);
      
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
      
      // Return empty array on error
      return [];
    }
  }

  /**
   * Fetch direct prices (World Chain specific)
   * @returns Promise with direct price data
   */
  async fetchDirectPrices(): Promise<DirectPricesResponse> {
    try {
      const url = buildUrl(this.url, "/direct-prices");
      logger.info(`Fetching direct prices from ${url}`);
      
      const response = await fetchWithTimeout<DirectPricesResponse>(url);
      return response;
    } catch (error: unknown) {
      logger.error('Failed to fetch direct prices:', 
        error instanceof Error ? error.message : String(error));
      
      // Return mock response on error
      return {
        prices: MOCK_PRICES,
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
