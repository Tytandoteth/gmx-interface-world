/**
 * Direct Prices Fetcher
 * Provides a standalone function to fetch price data from the Oracle Keeper
 */

import axios from 'axios';
import { getWorldChainMockData, isWorldChain } from 'lib/worldchain';

// Response type for direct prices endpoint
export interface OracleKeeperResponse {
  prices: Record<string, number>;
  timestamp: string;
  lastUpdated: string;
  status: string;
  source: string;
}

/**
 * Fetch direct prices from the Oracle Keeper
 * @param oracleKeeperUrl URL of the Oracle Keeper API
 * @param chainId Chain ID
 * @returns Promise<OracleKeeperResponse> Object containing token prices and metadata
 */
export async function fetchOracleKeeperDirectPrices(
  oracleKeeperUrl: string,
  chainId: number
): Promise<OracleKeeperResponse> {
  // Check if we should use mock data for development
  if (isWorldChain(chainId) && getWorldChainMockData()) {
    // Return mock data for development
    return {
      prices: {
        WLD: 1.25,
        WETH: 3000.00,
        BTC: 65000.00,
        MAG: 2.50,
        USDC: 1.00,
        USDT: 1.00,
        DAI: 1.00
      },
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: 'success',
      source: 'CoinGecko (via Oracle Keeper)'
    };
  }

  try {
    // Ensure URL is properly formed
    const url = oracleKeeperUrl.endsWith('/') 
      ? `${oracleKeeperUrl}direct-prices`
      : `${oracleKeeperUrl}/direct-prices`;
    
    // Fetch data from Oracle Keeper
    const response = await axios.get<OracleKeeperResponse>(url);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching prices from Oracle Keeper:', error);
    
    // Return fallback data in case of error
    return {
      prices: {
        WLD: 1.20,
        WETH: 2900.00,
        BTC: 63000.00,
        USDC: 1.00
      },
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: 'error',
      source: 'Fallback Data (Oracle Keeper Unavailable)'
    };
  }
}
