// Standard libraries
import { Provider } from "@ethersproject/providers";

// Configuration imports
import { isLocal } from "config/env";

// SDK imports
import { WORLD } from "sdk/configs/chains";
import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { buildUrl } from "sdk/utils/buildUrl";

// Library imports
import { isWorldChain, getWorldChainMockData } from "lib/worldchain";

// Domain types
import { Bar, FromNewToOldArray } from "domain/tradingview/types";

// Define PriceData interface locally to avoid dependency on deprecated module
interface PriceData {
  min: number;
  max: number;
  reference: number;
  source?: string;
  timestamp?: number;
}

import {
  ApyInfo,
  BatchReportBody,
  DayPriceCandle,
  OracleFetcher,
  RawIncentivesStats,
  TickersResponse,
  UserFeedbackBody,
} from "./types";

function parseOracleCandle(rawCandle: number[]): Bar {
  const [time, open, high, low, close] = rawCandle;

  return {
    time,
    open,
    high,
    low,
    close,
  };
}

let fallbackThrottleTimerId: any;

export class OracleKeeperFetcher implements OracleFetcher {
  private readonly chainId: number;
  private readonly oracleKeeperIndex: number;
  private readonly setOracleKeeperInstancesConfig?: (
    setter: (old: { [chainId: number]: number } | undefined) => {
      [chainId: number]: number;
    }
  ) => void;
  public readonly url: string;
  private readonly forceIncentivesActive: boolean;

  // DEPRECATED: Provider for legacy oracle integrations
  // No longer needed with CoinGecko integration via Oracle Keeper
  private provider: Provider | null = null;

  constructor(p: {
    chainId: number;
    oracleKeeperIndex: number;
    setOracleKeeperInstancesConfig?: (
      setter: (old: { [chainId: number]: number } | undefined) => {
        [chainId: number]: number;
      }
    ) => void;
    forceIncentivesActive: boolean;
  }) {
    this.chainId = p.chainId;

    // Special handling for World Chain - always use index 0 for World Chain
    if (p.chainId === WORLD) {
      this.oracleKeeperIndex = 0;
      console.log("Using special Oracle Keeper handling for World Chain");

      // Ensure the configuration is updated for World Chain
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

    this.setOracleKeeperInstancesConfig = p.setOracleKeeperInstancesConfig;
    this.url = getOracleKeeperUrl(this.chainId, this.oracleKeeperIndex);
    this.forceIncentivesActive = p.forceIncentivesActive;

    // Log the Oracle Keeper URL for debugging
    if (p.chainId === WORLD) {
      console.log(`Oracle Keeper URL for World Chain: ${this.url}`);
    }
  }

  switchOracleKeeper() {
    if (fallbackThrottleTimerId || !this.setOracleKeeperInstancesConfig) {
      return;
    }

    const nextIndex = getOracleKeeperNextIndex(this.chainId, this.oracleKeeperIndex);

    if (nextIndex === this.oracleKeeperIndex) {
      // eslint-disable-next-line no-console
      console.error(`no available oracle keeper for chain ${this.chainId}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`switch oracle keeper to ${getOracleKeeperUrl(this.chainId, nextIndex)}`);

    this.setOracleKeeperInstancesConfig((old) => {
      return { ...old, [this.chainId]: nextIndex };
    });

    fallbackThrottleTimerId = setTimeout(() => {
      fallbackThrottleTimerId = undefined;
    }, 5000);
  }

  // DEPRECATED: Helper method for legacy RedStone integration
  // This method is kept for reference but is no longer used
  // We now use CoinGecko integration via the Oracle Keeper's direct-prices endpoint
  private async getRedStonePrices(_symbols: string[]): Promise<Record<string, PriceData>> {
    console.warn("RedStone integration is deprecated, using CoinGecko via Oracle Keeper");
    return {};
  }

  // Convert PriceData to ticker format
  private pricesToTickers(prices: Record<string, PriceData>): TickersResponse {
    return Object.entries(prices).map(([tokenSymbol, data]) => ({
      minPrice: data.min.toString(),
      maxPrice: data.max.toString(),
      oracleDecimals: 8,
      tokenSymbol,
      tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`, // Mock address
      updatedAt: data.timestamp || Math.floor(Date.now() / 1000),
      source: data.source || "oracle"
    })) as TickersResponse;
  }

  fetchTickers(): Promise<TickersResponse> {
    // If we're in World Chain development mode, provide robust error handling with fallbacks
    if (isWorldChain(this.chainId)) {
      // Get prices directly from the Oracle Keeper (which uses CoinGecko)
      console.log("Fetching prices from Oracle Keeper (CoinGecko source)");
      
      return fetch(buildUrl(this.url!, "/prices"))
        .then((res) => res.json())
        .then((res) => {
          // Check if the response has a prices property (our Oracle Keeper format)
          if (res?.prices && typeof res.prices === 'object') {
            // Transform the prices object to the expected ticker format
            const tickers = Object.entries(res.prices).map(([tokenSymbol, price]) => ({
              minPrice: String(price),
              maxPrice: String(price),
              oracleDecimals: 8,
              tokenSymbol,
              tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`, // Mock address
              updatedAt: Math.floor(Date.now() / 1000),
              source: "oracle"
            })) as TickersResponse;
            return tickers;
          }
          // Handle standard array response format
          else if (Array.isArray(res) && res.length > 0) {
            return res;
          }
          
          // If we get here, the response isn't in a format we can use
          console.warn("World Chain: Invalid tickers response, using mock data");
          // Create mock ticker data based on the default prices
          const mockPrices = getWorldChainMockData<Record<string, number>>("prices") || {};
          // Create properly structured mock tickers data
          const mockTickers = Object.entries(mockPrices).map(([tokenSymbol, price]) => ({
            minPrice: price.toString(),
            maxPrice: price.toString(),
            oracleDecimals: 8,
            tokenSymbol,
            tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`, // Mock address
            updatedAt: Math.floor(Date.now() / 1000),
            source: "fallback"
          })) as TickersResponse;
          return mockTickers;
        })
        .catch((e) => {
          console.warn("World Chain: Oracle Keeper error, using mock data", e);
          // Create mock ticker data as fallback
          const mockPrices = getWorldChainMockData<Record<string, number>>("prices") || {};
          // Create properly structured mock tickers data
          const mockTickers = Object.entries(mockPrices).map(([tokenSymbol, price]) => ({
            minPrice: price.toString(),
            maxPrice: price.toString(),
            oracleDecimals: 8,
            tokenSymbol,
            tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`, // Mock address
            updatedAt: Math.floor(Date.now() / 1000),
            source: "fallback"
          })) as TickersResponse;
          return mockTickers;
        });
    }
    
    // Standard behavior for other chains
    return fetch(buildUrl(this.url!, "/prices"))
      .then((res) => res.json())
      .then((res) => {
        if (!res.length) {
          throw new Error("Invalid tickers response");
        }

        return res;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();

        throw e;
      });
  }

  fetch24hPrices(): Promise<DayPriceCandle[]> {
    return fetch(buildUrl(this.url, "/day_avg_price"))
      .then((res) => res.json())
      .then((res) => res.data || res)
      .catch(() => []) as Promise<DayPriceCandle[]>;
  }

  // Implementation of fetchDirectPrices required by OracleFetcher interface
  fetchDirectPrices(): Promise<any> {
    // Get direct prices from Oracle Keeper (which uses CoinGecko)
    console.log("Fetching direct prices from Oracle Keeper (CoinGecko source)");
    // Handle URL path to avoid double slashes
    const directPricesUrl = this.url.endsWith('/') 
      ? `${this.url}direct-prices` 
      : `${this.url}/direct-prices`;
    return fetch(directPricesUrl)
      .then((res) => res.json())
      .then((res) => {
        if (res.status !== 'success' || !res.prices) {
          console.warn("Invalid direct prices response from Oracle Keeper", res.error || '');
          // Return empty object as fallback
          return { 
            prices: {}, 
            status: 'error', 
            timestamp: Date.now(), 
            source: 'fallback' 
          };
        }
        return res;
      })
      .catch((error) => {
        console.error("Error fetching direct prices from Oracle Keeper:", error);
        // Return empty object as fallback
        return { 
          prices: {}, 
          status: 'error', 
          timestamp: Date.now(), 
          source: 'fallback', 
          error: String(error)
        };
      });
  }

  fetchPostBatchReport(body: BatchReportBody, debug = false): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendBatchMetrics", body);
    }

    if (isLocal()) {
      return Promise.resolve(new Response());
    }

    return fetch(buildUrl(this.url!, "/report/ui/batch_report"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  fetchPostFeedback(body: UserFeedbackBody, debug = false): Promise<Response> {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log("sendFeedback", body);
    }

    return fetch(buildUrl(this.url!, "/report/ui/feedback"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  fetchApys(): Promise<ApyInfo> {
    return fetch(buildUrl(this.url!, "/apy"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();
        throw e;
      });
  }

  async fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>> {
    tokenSymbol = getNormalizedTokenSymbol(tokenSymbol);

    return fetch(buildUrl(this.url!, "/prices/candles", { tokenSymbol, period, limit }))
      .then((res) => res.json())
      .then((res) => {
        if (!Array.isArray(res.candles) || (res.candles.length === 0 && limit > 0)) {
          throw new Error("Invalid candles response");
        }

        return res.candles.map(parseOracleCandle);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();
        throw e;
      });
  }

  async fetchIncentivesRewards(): Promise<RawIncentivesStats | null> {
    return fetch(
      buildUrl(this.url!, "/incentives", {
        ignoreStartDate: this.forceIncentivesActive ? "1" : undefined,
      })
    )
      .then((res) => res.json())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.switchOracleKeeper();
        return null;
      });
  }

  async fetchUiVersion(currentVersion: number, active: boolean): Promise<number> {
    return fetch(buildUrl(this.url!, `/ui/min_version?client_version=${currentVersion}&active=${active}`))
      .then((res) => res.json())
      .then((res) => res.version);
  }
}
