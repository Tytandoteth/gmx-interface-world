import type { Address } from "viem";

import { UserFeedback } from "domain/synthetics/userFeedback";
import { FromNewToOldArray as ImportedFromNewToOldArray, Bar as ImportedBar } from "domain/tradingview/types";

// Re-export imported types to make them available to other modules
export type FromNewToOldArray<T> = ImportedFromNewToOldArray<T>;
export type Bar = ImportedBar;

/**
 * Enhanced health status response for Oracle Keeper
 */
export type TokenPriceStatus = {
  symbol: string;
  available: boolean;
  latestPrice?: number;
  lastUpdated?: number;
  source?: string;
  error?: string;
};

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

export type EventPayload = {
  isError: boolean;
  version: string;
  event: string;
  message?: string;
  host: string;
  url?: string;
  time?: number;
  isDev?: boolean;
  customFields?: any;
  isMissedGlobalMetricData?: boolean;
};

export type CounterPayload = {
  event: string;
  version: string;
  isDev: boolean;
  host: string;
  url: string;
  abFlags: { [key: string]: boolean };
  customFields?: { [key: string]: any };
};

export type TimingPayload = {
  event: string;
  version: string;
  time: number;
  isDev: boolean;
  host: string;
  url: string;
  abFlags: { [key: string]: boolean };
  customFields?: { [key: string]: any };
};

export type UserAnalyticsEventPayload = {
  event: string;
  distinctId: string;
  customFields: { [key: string]: any };
};

export type UserAnalyticsProfilePayload = {
  distinctId: string;
  customFields: { [key: string]: any };
};

export type UserAnalyticsEventItem = {
  type: "userAnalyticsEvent";
  payload: UserAnalyticsEventPayload;
};

export type UserAnalyticsProfileItem = {
  type: "userAnalyticsProfile";
  payload: UserAnalyticsProfilePayload;
};

export type EventItem = {
  type: "event";
  payload: EventPayload;
};

export type CounterItem = {
  type: "counter";
  payload: CounterPayload;
};

export type TimingItem = {
  type: "timing";
  payload: TimingPayload;
};

export type BatchReportItem = UserAnalyticsEventItem | UserAnalyticsProfileItem | EventItem | CounterItem | TimingItem;

export type BatchReportBody = {
  items: BatchReportItem[];
};

export type ApyInfo = {
  markets: { address: string; baseApy: number; bonusApy: number; apy: number }[];
  glvs: { address: string; baseApy: number; bonusApy: number; apy: number }[];
};

export interface OracleFetcher {
  readonly url: string;
  fetchTickers(): Promise<TickersResponse>;
  fetch24hPrices(): Promise<DayPriceCandle[]>;
  fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>>;
  fetchIncentivesRewards(): Promise<RawIncentivesStats | null>;
  fetchPostBatchReport(body: BatchReportBody, debug?: boolean): Promise<Response>;
  fetchPostFeedback(body: UserFeedbackBody, debug?: boolean): Promise<Response>;
  fetchUiVersion(currentVersion: number, active: boolean): Promise<number>;
  fetchApys(debug?: boolean): Promise<ApyInfo>;
}
export type TickersResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

export type DayPriceCandle = {
  tokenSymbol: string;
  high: number;
  low: number;
  open: number;
  close: number;
};
type OnlyWhenActive<Data> =
  | ({
      isActive: true;
    } & Data)
  | {
      isActive: false;
    };

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
    /**
     * @deprecated use `maxRebatePercent` or `estimatedRebatePercent` instead
     */
    rebatePercent: number;
    maxRebatePercent: number;
    estimatedRebatePercent: number;
    allocation: string;
    period: number;
    token: Address;
  }>;
};

export type UserFeedbackBody = {
  feedback: UserFeedback;
};
