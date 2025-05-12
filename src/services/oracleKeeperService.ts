import axios from 'axios';

// Use environment variable for the Oracle Keeper URL
const ORACLE_KEEPER_URL = 
  import.meta.env.VITE_ORACLE_KEEPER_URL || 
  'https://oracle-keeper.kevin8396.workers.dev/direct-prices';

// Types for Oracle Keeper response
export interface OracleKeeperResponse {
  prices: {
    [key: string]: number;
  };
  timestamp: string;
  source: string; // This could be 'CoinGecko', 'Witnet', or any other source
  status: string;
}

/**
 * Fetches real-time price data from the Oracle Keeper API
 * The Oracle Keeper may use CoinGecko, Witnet, or any other price source internally
 * @returns Promise with Oracle Keeper response data
 */
export const fetchOracleKeeperPrices = async (): Promise<OracleKeeperResponse> => {
  try {
    const response = await axios.get<OracleKeeperResponse>(ORACLE_KEEPER_URL);
    
    // Log success but only in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('Oracle Keeper prices fetched:', response.data);
    }
    
    return response.data;
  } catch (error) {
    // Log error
    console.error('Error fetching prices from Oracle Keeper:', error);
    
    // Return fallback data if API call fails
    return {
      prices: {
        WLD: 1.24,
        WETH: 2483.15,
        MAG: 0.00041411
      },
      timestamp: new Date().toISOString(),
      source: 'Fallback Data',
      status: 'error'
    };
  }
};

/**
 * Simplified version that only returns the prices object
 * @returns Promise with price data as a simple key-value object
 */
export const fetchPrices = async (): Promise<Record<string, number>> => {
  const response = await fetchOracleKeeperPrices();
  return response.prices;
};

/**
 * Configure a different price data source URL
 * @param url The URL of the price data source
 */
export const configurePriceDataSource = (url: string): void => {
  // This could be expanded to configure different adapters for different price sources
  // For now, we just log that this would change the source URL
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`Price data source would be changed to: ${url}`);
    // In a real implementation, we would update a global config or context
  }
};
