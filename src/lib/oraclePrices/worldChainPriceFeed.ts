/**
 * World Chain V1 Price Feed Integration
 * Connects to Oracle Keeper to fetch prices for V1 contracts
 */

import { WORLD } from '../../config/chains';

// Simple error handling that follows project standards
// We use console.warn and console.error as they're allowed in production
// according to the ESLint configuration

// Use the Oracle Keeper URL from environment or fallback to the known URL
const ORACLE_KEEPER_URL = import.meta.env.VITE_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev';

// Supported tokens for World Chain
export const SUPPORTED_TOKENS = ['WLD', 'WETH', 'MAG'];

/**
 * Price data structure from Oracle Keeper
 */
export interface TokenPrice {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

/**
 * Response format from Oracle Keeper direct-prices endpoint
 * Updated to match the actual response format from oracleKeeperFetcher
 */
export interface DirectPricesResponse {
  prices: {
    [symbol: string]: number
  };
  timestamp: string;
  lastUpdated: string;
  status: 'success' | 'error';
  source: string;
  error?: string;
}

/**
 * Status of price fetching
 */
export interface PriceFeedStatus {
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

/**
 * Fetches direct prices from Oracle Keeper (real-time, bypasses cache)
 * @returns Promise with price data
 */
export async function fetchDirectPrices(): Promise<DirectPricesResponse> {
  // Always use the real-time direct-prices endpoint for most up-to-date data
  const response = await fetch(`${ORACLE_KEEPER_URL}/direct-prices`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch direct prices: ${response.status} ${response.statusText}`);
  }
  
  return await response.json() as DirectPricesResponse;
}

/**
 * Fetches cached prices from Oracle Keeper
 * @returns Promise with price data
 */
export async function fetchCachedPrices(): Promise<DirectPricesResponse> {
  const response = await fetch(`${ORACLE_KEEPER_URL}/prices`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch cached prices: ${response.status} ${response.statusText}`);
  }
  
  return await response.json() as DirectPricesResponse;
}

/**
 * Fetches the price for a specific token
 * @param symbol Token symbol (e.g., 'WLD')
 * @returns Promise with single token price
 */
export async function fetchTokenPrice(symbol: string): Promise<TokenPrice> {
  // Fetch all prices and then extract the specific one
  const directPrices = await fetchDirectPrices();
  
  // Get the price for the requested symbol
  const price = directPrices.prices[symbol];
  
  if (price === undefined) {
    throw new Error(`Price not available for token: ${symbol}`);
  }
  
  // Format the response to match TokenPrice interface
  return {
    symbol,
    price,
    timestamp: new Date(directPrices.timestamp).getTime(),
    source: directPrices.source || 'Oracle Keeper'
  };
}

/**
 * Checks the health of the Oracle Keeper
 * @returns Promise with health status
 */
export async function checkOracleKeeperHealth(): Promise<{ isHealthy: boolean; details: any }> {
  try {
    const response = await fetch(`${ORACLE_KEEPER_URL}/health`);
    
    if (!response.ok) {
      return { isHealthy: false, details: { status: response.status, statusText: response.statusText } };
    }
    
    const data = await response.json();
    return { isHealthy: true, details: data };
  } catch (error) {
    return { isHealthy: false, details: { error: String(error) } };
  }
}

/**
 * Converts price data from Oracle Keeper to a simple price map
 * @param data Price data from Oracle Keeper
 * @returns Record of token symbol to price
 */
export function convertToSimplePriceMap(data: DirectPricesResponse): Record<string, number> {
  // The prices are already in the format we need, just return them directly
  return data.prices || {};
}

/**
 * Checks if the Oracle Keeper should be used for the current chain
 * @param chainId Current chain ID
 * @returns Boolean indicating if Oracle Keeper should be used
 */
export function shouldUseOracleKeeper(chainId: number | undefined): boolean {
  return chainId === WORLD;
}
