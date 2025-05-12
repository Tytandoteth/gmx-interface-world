/**
 * Price API utilities for GMX Interface
 * Supports multiple price sources including Oracle Keeper direct prices
 */

import { isWorldChain } from "lib/worldchain";
import { createEnhancedOracleKeeperFetcher } from "lib/oracleKeeperFetcher/oracleKeeperEnhanced";
import { DirectPricesResponse } from "lib/oracleKeeperFetcher/types";

/**
 * Maps token IDs to their CoinGecko price API IDs
 */
export const COINGECKO_IDS = {
  WLD: "worldcoin",
  WETH: "ethereum",
  ETH: "ethereum",
  MAG: "magink"
};

/**
 * Standardized format for price data across the application
 */
export type TokenPrice = {
  min: number;   // Minimum price (same as reference price for now)
  max: number;   // Maximum price (same as reference price for now)
  reference: number; // Reference price used for most calculations
  lastUpdated: number; // Timestamp in milliseconds
  source?: string; // Source of the price data (e.g., "CoinGecko", "Witnet")
};

/**
 * Collection of prices by token symbol
 */
export type PricesMap = {
  [tokenSymbol: string]: TokenPrice;
};

/**
 * Fetches prices from Oracle Keeper's direct-prices endpoint
 * This endpoint provides real-time price data from CoinGecko (or Witnet when available)
 * @param chainId The chain ID to fetch prices for
 * @returns Promise<PricesMap> A map of token prices by symbol
 */
export async function fetchOracleKeeperDirectPrices(chainId: number): Promise<PricesMap> {
  try {
    // Only fetch for World Chain
    if (!isWorldChain(chainId)) {
      console.info("Oracle Keeper direct prices only available for World Chain");
      return {};
    }

    const oracleFetcher = createEnhancedOracleKeeperFetcher(chainId);
    const directPricesResponse: DirectPricesResponse = await oracleFetcher.fetchDirectPrices();
    
    // Check if the response was successful
    if (directPricesResponse.status !== 'success' || !directPricesResponse.prices) {
      console.warn("Failed to fetch direct prices from Oracle Keeper", directPricesResponse.error);
      return {};
    }
    
    // Transform the response into our standard PricesMap format
    const prices: PricesMap = {};
    const lastUpdatedMs = new Date(directPricesResponse.lastUpdated).getTime();
    
    // Create standardized format for each token price
    Object.entries(directPricesResponse.prices).forEach(([symbol, price]) => {
      prices[symbol] = {
        min: price,
        max: price,
        reference: price,
        lastUpdated: lastUpdatedMs,
        source: directPricesResponse.source
      };
    });
    
    console.info(
      `Oracle Keeper direct prices fetched successfully: ${Object.keys(prices).length} tokens`,
      { source: directPricesResponse.source }
    );
    
    return prices;
  } catch (error) {
    console.error("Error fetching Oracle Keeper direct prices:", error);
    return {};
  }
}

/**
 * Combines price data from multiple sources with priority
 * Highest priority source comes first in the sources array
 * @param sources Array of price maps from different sources
 * @returns Combined price map with priority given to sources earlier in the array
 */
export function combinePriceSources(...sources: PricesMap[]): PricesMap {
  const combinedPrices: PricesMap = {};
  
  // Process all sources in order of priority
  for (const source of sources) {
    for (const [symbol, price] of Object.entries(source)) {
      // Only set the price if it doesn't already exist or is newer
      if (
        !combinedPrices[symbol] || 
        price.lastUpdated > combinedPrices[symbol].lastUpdated
      ) {
        combinedPrices[symbol] = price;
      }
    }
  }
  
  return combinedPrices;
}

/**
 * Gets fallback prices for essential tokens if other sources fail
 * @returns PricesMap with emergency fallback prices
 */
export function getEmergencyPrices(): PricesMap {
  const now = Date.now();
  return {
    WLD: {
      min: 1.24,
      max: 1.24,
      reference: 1.24,
      lastUpdated: now,
      source: "Emergency Fallback"
    },
    WETH: {
      min: 2481.08,
      max: 2481.08,
      reference: 2481.08,
      lastUpdated: now,
      source: "Emergency Fallback"
    },
    MAG: {
      min: 0.00041212,
      max: 0.00041212,
      reference: 0.00041212,
      lastUpdated: now,
      source: "Emergency Fallback"
    }
  };
}
