/**
 * Oracle Keeper Configuration
 * Centralized configuration for Oracle Keeper integration
 */

import { WORLD } from 'sdk/configs/chains';
import { Bar } from 'domain/tradingview/types';

// Add type declaration for import.meta.env
declare global {
  interface ImportMeta {
    env: {
      MODE: string;
      VITE_ORACLE_KEEPER_URL?: string;
      VITE_WORLD_RPC_URL?: string;
      VITE_APP_WORLD_CHAIN_URL?: string;
    };
  }
}

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

// Define types for mock data
export type TokenSymbol = 'WLD' | 'WETH' | 'MAG' | 'USDC' | 'ETH';

// Mock price data for development and fallbacks
export const MOCK_PRICES: Record<TokenSymbol, number> = {
  // World Chain tokens with realistic prices
  WLD: 1.25,
  WETH: 3000.00,
  MAG: 2.50,
  // Additional tokens that might be needed
  USDC: 1.00,
  ETH: 3000.00
};

// Mock historical price data for TradingView charts
export const MOCK_HISTORICAL_PRICES: Record<TokenSymbol, Bar[]> = {
  WLD: generateHistoricalPrices(1.25, 0.05, 200),  // $1.25 with 5% variance
  WETH: generateHistoricalPrices(3000, 50, 200),   // $3000 with $50 variance
  MAG: generateHistoricalPrices(2.5, 0.1, 200),    // $2.50 with 10¢ variance
  USDC: generateHistoricalPrices(1.0, 0.001, 200), // $1.00 with 0.1% variance
  ETH: generateHistoricalPrices(3000, 50, 200)     // $3000 with $50 variance
};

// Helper function to get mock data for any token symbol
export function getMockHistoricalPrices(symbol: string): Bar[] | null {
  const normalizedSymbol = symbol.toUpperCase();
  return normalizedSymbol in MOCK_HISTORICAL_PRICES 
    ? MOCK_HISTORICAL_PRICES[normalizedSymbol as TokenSymbol] 
    : null;
}

// Helper function to get mock price for any token symbol
export function getMockPrice(symbol: string): number {
  const normalizedSymbol = symbol.toUpperCase();
  return normalizedSymbol in MOCK_PRICES 
    ? MOCK_PRICES[normalizedSymbol as TokenSymbol] 
    : 1.0; // Default price if not found
}

/**
 * Generate mock historical price data for charts
 * @param basePrice Base price to generate around
 * @param variance Maximum price variance
 * @param count Number of data points to generate
 * @returns Array of price data points with timestamp
 */
function generateHistoricalPrices(basePrice: number, variance: number, count: number) {
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600; // 1 hour intervals
  const result = [];
  
  let lastPrice = basePrice;
  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * interval;
    // Random walk with mean reversion
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
