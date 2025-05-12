import type { Address } from "viem";
import { Bar as ImportedBar, FromNewToOldArray as ImportedFromNewToOldArray } from "domain/tradingview/types";

// Re-export imported types to make them available to other modules
export type FromNewToOldArray<T> = ImportedFromNewToOldArray<T>;
export type Bar = ImportedBar;

/**
 * Response from the tickers endpoint
 */
export type TickersResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

/**
 * Response from the 24h prices endpoint
 */
export type DayPriceCandle = {
  tokenSymbol: string;
  high: number;
  low: number;
  open: number;
  close: number;
};

/**
 * World Chain specific type for 24h prices
 */
export type Prices24h = {
  [key: string]: {
    timestamp: number;
    price: number;
    change24h: number;
  };
};

/**
 * Response from the direct-prices endpoint (World Chain specific)
 */
export type DirectPricesResponse = {
  prices: Record<string, number>;
  timestamp: string;
  lastUpdated: string;
  status: 'success' | 'error';
  source: string;
  error?: string;
};

/**
 * APY information
 */
export type ApyResponse = {
  [key: string]: number;
};

/**
 * Enhanced APY information from the original GMX implementation
 */
export type ApyInfo = {
  markets: { address: string; baseApy: number; bonusApy: number; apy: number }[];
  glvs: { address: string; baseApy: number; bonusApy: number; apy: number }[];
};

/**
 * Conditional type helper for active/inactive states
 */
type OnlyWhenActive<Data> =
  | ({ isActive: true } & Data)
  | { isActive: false };

/**
 * Incentives rewards stats
 */
export type RawIncentivesStats = {
  lp: OnlyWhenActive<{
    totalRewards: string;
    period: number;
    rewardsPerMarket: Record<string, string>;
    token: string;
    excludeHolders: Address[];
  }>;
  migration: OnlyWhenActive<{
    maxRebateBps: number;
    period: number;
  }>;
  trading: OnlyWhenActive<{
    rebatePercent: number;
    maxRebatePercent: number;
    estimatedRebatePercent: number;
    allocation: string;
    period: number;
    token: Address;
  }>;
};

/**
 * Batch report body for metrics
 */
export type BatchReportBody = {
  success: boolean;
  message?: string;
  data?: unknown;
};

/**
 * User feedback body
 */
export type UserFeedbackBody = {
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
};

/**
 * Oracle health status for a token
 */
export type TokenPriceStatus = {
  symbol: string;
  available: boolean;
  latestPrice?: number;
  lastUpdated?: number;
  source?: string;
  error?: string;
};

/**
 * Oracle Keeper health status
 */
export type OracleKeeperHealthStatus = {
  isHealthy: boolean;
  apiLatency: number;
  timestamp: number;
  mode: 'live' | 'fallback' | 'error';
  endpoint: string;
  version?: string;
  prices: TokenPriceStatus[];
  gmxContract: {
    connected: boolean;
    address?: string;
    chainId?: number;
    error?: string;
  };
  uptime?: number;
  errors?: string[];
};

/**
 * Oracle Fetcher interface
 * Defines the contract for fetching data from the Oracle Keeper
 */
export interface OracleFetcher {
  /**
   * Oracle Keeper URL
   */
  readonly url: string;
  
  /**
   * Fetch current price tickers
   */
  fetchTickers(): Promise<TickersResponse>;
  
  /**
   * Fetch 24-hour price data
   * Original GMX implementation returns DayPriceCandle[]
   * World Chain implementation returns Prices24h
   */
  fetch24hPrices(): Promise<Prices24h>;
  
  /**
   * Fetch candle data for a specific token
   */
  fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>>;
  
  /**
   * Fetch incentives rewards data
   */
  fetchIncentivesRewards(): Promise<RawIncentivesStats | null>;
  
  /**
   * Submit batch report
   */
  fetchPostBatchReport(body: BatchReportBody): Promise<boolean>;
  
  /**
   * Submit user feedback
   */
  fetchPostFeedback(body: UserFeedbackBody): Promise<boolean>;
  
  /**
   * Fetch UI version
   */
  fetchUiVersion(): Promise<string | null>;
  
  /**
   * Fetch APY data
   */
  fetchApys(): Promise<ApyResponse>;
  
  /**
   * Fetch direct prices (World Chain specific)
   */
  fetchDirectPrices(): Promise<DirectPricesResponse>;
}
