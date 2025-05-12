/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use WorldChainOracleKeeper.ts instead.
 */

import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";

import { logger } from "./oracleKeeperUtils.new";
import { 
  TickersResponse, 
  OracleFetcher, 
  FromNewToOldArray, 
  Bar, 
  RawIncentivesStats, 
  BatchReportBody, 
  UserFeedbackBody, 
  DirectPricesResponse,
  ApyResponse,
  Prices24h
} from "./types";
import { WorldChainOracleKeeper, createWorldChainOracleKeeper } from "./WorldChainOracleKeeper";

/**
 * For World Chain, this class simply forwards all calls to WorldChainOracleKeeper.
 * For non-World Chain environments, this remains a stub implementation.
 * 
 * @deprecated This class is deprecated. Use WorldChainOracleKeeper directly instead.
 */
export class RobustOracleKeeper implements OracleFetcher {
  readonly url: string;
  private innerKeeper: WorldChainOracleKeeper;

  /**
   * Create a new RobustOracleKeeper instance that forwards to WorldChainOracleKeeper
   */
  constructor(params: { chainId: number; provider: Web3Provider | JsonRpcProvider }) {
    // Create or get a WorldChainOracleKeeper instance
    this.innerKeeper = createWorldChainOracleKeeper(params.chainId, params.provider);
    // Make sure URL is accessible as a readonly property
    this.url = this.innerKeeper.url;
    
    logger.info(`[RobustOracleKeeper] Created wrapper for WorldChainOracleKeeper with URL: ${this.url}`);
  }

  /**
   * Fetch price tickers from the Oracle Keeper
   */
  async fetchTickers(): Promise<TickersResponse> {
    return this.innerKeeper.fetchTickers();
  }

  /**
   * Fetch 24-hour price data
   */
  async fetch24hPrices(): Promise<Prices24h> {
    return this.innerKeeper.fetch24hPrices();
  }

  /**
   * Fetch oracle candles for a specific token
   */
  async fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    return this.innerKeeper.fetchOracleCandles(tokenSymbol, period, limit);
  }

  /**
   * Fetch incentives rewards data
   */
  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    return this.innerKeeper.fetchIncentivesRewards();
  }

  /**
   * Post batch report to the Oracle Keeper
   */
  async fetchPostBatchReport(body: BatchReportBody): Promise<boolean> {
    return this.innerKeeper.fetchPostBatchReport(body);
  }

  /**
   * Post user feedback to the Oracle Keeper
   */
  async fetchPostFeedback(body: UserFeedbackBody): Promise<boolean> {
    return this.innerKeeper.fetchPostFeedback(body);
  }

  /**
   * Fetch UI version from the Oracle Keeper
   * 
   * @returns Promise with UI version string or null
   */
  async fetchUiVersion(): Promise<string | null> {
    try {
      // The inner keeper expects parameters, but the interface doesn't
      // So we need to use a different approach to avoid TypeScript errors
      // @ts-expect-error - Inner implementation requires parameters but interface doesn't
      const result = await this.innerKeeper.fetchUiVersion(0, true);
      return result ? String(result) : null;
    } catch (error) {
      logger.error("[RobustOracleKeeper] Error fetching UI version:", error);
      return null;
    }
  }

  /**
   * Fetch direct prices (for compatibility)
   */
  async fetchDirectPrices(): Promise<DirectPricesResponse> {
    return (this.innerKeeper as any).fetchDirectPrices?.() || {};
  }

  /**
   * Fetch APY information
   * 
   * @returns Promise with APY response data
   */
  async fetchApys(): Promise<ApyResponse> {
    try {
      // We'll create a minimal ApyResponse object manually
      // since the inner keeper returns a different type
      const response: ApyResponse = {};
      
      try {
        // Call the inner keeper method with the expected parameter
        // @ts-expect-error - Inner implementation accepts parameter but interface doesn't
        const result = await this.innerKeeper.fetchApys(false);
        
        // Safely add market data if available
        if (result && typeof result === 'object') {
          // Check if markets property exists and is an array
          if (Array.isArray(result.markets)) {
            result.markets.forEach((market: any) => {
              if (market && market.address && typeof market.apy === 'number') {
                response[market.address] = market.apy;
              }
            });
          }
        }
      } catch (innerError) {
        logger.warn("[RobustOracleKeeper] Inner keeper fetchApys error:", innerError);
        // Continue with empty response object
      }
      
      return response;
    } catch (error) {
      logger.error("[RobustOracleKeeper] Error fetching APY info:", error);
      return {};
    }
  }
}
