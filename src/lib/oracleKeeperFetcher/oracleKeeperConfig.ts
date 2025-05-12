/**
 * Oracle Keeper Configuration
 * Centralized configuration for Oracle Keeper integration
 */

import { WORLD } from 'sdk/configs/chains';

// Oracle Keeper URLs by chain ID
export const ORACLE_KEEPER_URLS: Record<number, string[]> = {
  [WORLD]: [
    "https://oracle-keeper.kevin8396.workers.dev"
  ],
};

// Default URL to use if no specific URL is found
export const DEFAULT_ORACLE_KEEPER_URL = ORACLE_KEEPER_URLS[WORLD]?.[0] || 
  "https://oracle-keeper.kevin8396.workers.dev";

// Request timeout configuration
export const REQUEST_TIMEOUT_MS = 5000; // 5 seconds

// Cache configuration
export const CACHE_TTL_MS = 60000; // 1 minute
export const STALE_CACHE_TTL_MS = 300000; // 5 minutes

// Mock data for development and fallbacks
export const MOCK_PRICES = {
  // Original tokens
  WLD: 1.25,
  WETH: 3000,
  MAG: 2.50,
  // New test tokens with prices from SimplePriceFeed
  TUSD: 1.00,
  TBTC: 60000.00,
  TETH: 3000.00
};

/**
 * Get Oracle Keeper URL for a specific chain
 * @param chainId Chain ID to get Oracle Keeper URL for
 * @param index Index of URL to use (for fallback mechanisms)
 * @returns URL of Oracle Keeper instance
 */
export function getOracleKeeperUrl(chainId: number, index = 0): string {
  const urls = ORACLE_KEEPER_URLS[chainId];
  
  if (!urls || urls.length === 0) {
    return DEFAULT_ORACLE_KEEPER_URL;
  }
  
  return urls[index] || urls[0];
}

/**
 * Get next Oracle Keeper URL index for fallback
 * @param chainId Chain ID
 * @param currentIndex Current index being used
 * @returns Next index to use
 */
export function getOracleKeeperNextIndex(chainId: number, currentIndex: number): number {
  const urls = ORACLE_KEEPER_URLS[chainId];
  
  if (!urls || urls.length <= 1) {
    return 0;
  }
  
  return (currentIndex + 1) % urls.length;
}

/**
 * Check if a chain is World Chain
 * @param chainId Chain ID to check
 * @returns True if chain is World Chain
 */
export function isWorldChain(chainId: number): boolean {
  return chainId === WORLD;
}
