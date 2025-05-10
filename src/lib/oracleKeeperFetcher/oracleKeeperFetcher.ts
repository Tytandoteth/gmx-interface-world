import { isLocal } from "config/env";
import { Bar, FromNewToOldArray } from "domain/tradingview/types";
import { WORLD } from "sdk/configs/chains";
import { getOracleKeeperNextIndex, getOracleKeeperUrl } from "sdk/configs/oracleKeeper";
import { isWorldChain, withWorldChainFallback, getWorldChainMockData } from "lib/worldchain";
import { WorldChainConfig } from "lib/worldchain/worldChainDevMode";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { buildUrl } from "sdk/utils/buildUrl";
import { ethers } from "ethers";
import { Provider, Web3Provider, JsonRpcProvider } from "@ethersproject/providers";
import { getRedstoneOracleIntegration, PriceData } from "lib/redstone";

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

  // Provider for RedStone on-chain data access
  private readonly provider?: Web3Provider | JsonRpcProvider;

  constructor(p: {
    chainId: number;
    oracleKeeperIndex: number;
    setOracleKeeperInstancesConfig?: (
      setter: (old: { [chainId: number]: number } | undefined) => {
        [chainId: number]: number;
      }
    ) => void;
    forceIncentivesActive: boolean;
    // Optional Ethers provider for on-chain data access
    provider?: Web3Provider | JsonRpcProvider;
  }) {
    this.chainId = p.chainId;
    this.provider = p.provider;
    
    // Special handling for World Chain - always use index 0 for World Chain
    if (p.chainId === WORLD) {
      this.oracleKeeperIndex = 0;
      console.log("Using special Oracle Keeper handling for World Chain");
      
      // Initialize RedStone integration if enabled and provider available
      if (WorldChainConfig.redstone?.enabled && this.provider) {
        console.log("RedStone integration is enabled for World Chain");
        // Initialize the RedStone oracle integration (lazy-loaded when needed)
      } else {
        console.log("RedStone integration is disabled or no provider available");
      }
      
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

  // Helper method to get prices using RedStone integration
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

  // Convert PriceData to ticker format
  private pricesToTickers(prices: Record<string, PriceData>): TickersResponse {
    return Object.entries(prices).map(([tokenSymbol, data]) => ({
      minPrice: data.price.toString(),
      maxPrice: data.price.toString(),
      oracleDecimals: 8,
      tokenSymbol,
      tokenAddress: `0x${tokenSymbol.toLowerCase()}${"0".repeat(34)}`, // Mock address for now
      updatedAt: Math.floor(data.timestamp / 1000),
      source: data.source // Additional field for debugging
    })) as TickersResponse;
  }

  fetchTickers(): Promise<TickersResponse> {
    // If we're in World Chain development mode, provide robust error handling with fallbacks
    if (isWorldChain(this.chainId)) {
      // Check if we can use RedStone integration first
      if (this.provider && WorldChainConfig.redstone?.enabled) {
        // Try to get prices from RedStone first
        return this.getRedStonePrices(WorldChainConfig.redstone.trackedTokens)
          .then(prices => {
            // If we have some prices from RedStone, convert them to tickers
            if (Object.keys(prices).length > 0) {
              console.log(`Got ${Object.keys(prices).length} prices from RedStone`);
              return this.pricesToTickers(prices);
            }
            
            // If no RedStone prices, fall back to Oracle Keeper
            console.log("No RedStone prices available, falling back to Oracle Keeper");
            throw new Error("No RedStone prices available");
          })
          .catch(() => {
            // Fall back to Oracle Keeper
            return fetch(buildUrl(this.url!, "/prices"))
              .then((res) => res.json())
              .then((res) => {
                if (!res.length) {
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
                }
                return res;
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
          });
      }
      
      // If RedStone is not enabled, use Oracle Keeper with fallback
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
    // Special handling for World Chain development mode
    if (isWorldChain(this.chainId)) {
      return fetch(buildUrl(this.url!, "/prices/24h"))
        .then((res) => res.json())
        .then((res) => {
          if (!res?.length) {
            console.warn("World Chain: Invalid 24h prices response, using mock data");
            // Generate mock 24h price data
            const mockPrices = getWorldChainMockData<Record<string, number>>("prices") || {};
            return Object.entries(mockPrices).map(([tokenSymbol, price]) => {
              // Generate slight variations for price candles
              const basePrice = parseFloat(price.toString());
              const variation = basePrice * 0.02; // 2% variation
              return {
                tokenSymbol,
                high: basePrice + Math.random() * variation,
                low: basePrice - Math.random() * variation,
                open: basePrice - variation/2 + Math.random() * variation,
                close: basePrice
              };
            });
          }
          return res;
        })
        .catch((e) => {
          console.warn("World Chain: Oracle Keeper error for 24h prices, using mock data", e);
          // Generate mock 24h price data as fallback
          const mockPrices = getWorldChainMockData<Record<string, number>>("prices") || {};
          return Object.entries(mockPrices).map(([tokenSymbol, price]) => {
            // Generate slight variations for price candles
            const basePrice = parseFloat(price.toString());
            const variation = basePrice * 0.02; // 2% variation
            return {
              tokenSymbol,
              high: basePrice + Math.random() * variation,
              low: basePrice - Math.random() * variation,
              open: basePrice - variation/2 + Math.random() * variation,
              close: basePrice
            };
          });
        });
    }
    
    // Standard implementation for other chains
    return fetch(buildUrl(this.url!, "/prices/24h"))
      .then((res) => res.json())
      .then((res) => {
        if (!res?.length) {
          throw new Error("Invalid 24h prices response");
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

  fetchPostBatchReport(body: BatchReportBody, debug?: boolean): Promise<Response> {
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

  fetchPostFeedback(body: UserFeedbackBody, debug): Promise<Response> {
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
