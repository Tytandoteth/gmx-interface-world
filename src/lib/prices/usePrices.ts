import { useState, useEffect, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { WORLD } from '../../config/chains';
import { Logger } from '../logger';

// Type for token prices mapping
export type PricesMap = Record<string, number>;

// Mock function to get prices from Oracle Keeper API
// This would be replaced with actual API call in production
const fetchOracleKeeperPrices = async (): Promise<PricesMap> => {
  // Simulating API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock prices
  return {
    'WLD': 1.25,
    'WETH': 3000,
    'ETH': 3000,
    'USDC': 1.0,
    'USDT': 1.0,
    'BTC': 60000,
    'WBTC': 60000
  };
};

/**
 * Hook for accessing token prices
 * Uses Oracle Keeper for price data
 */
export const usePrices = () => {
  const chainId = useChainId();
  const [prices, setPrices] = useState<PricesMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch prices when component mounts or chainId changes
  useEffect(() => {
    const fetchPrices = async () => {
      if (chainId !== WORLD) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await fetchOracleKeeperPrices();
        setPrices(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error('Failed to fetch token prices:', error);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrices();
    
    // Set up polling for prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    
    return () => clearInterval(interval);
  }, [chainId]);
  
  /**
   * Get token price with optional fallback value
   */
  const getTokenPrice = useCallback((symbol: string, fallbackPrice?: number): number | undefined => {
    return prices[symbol] || fallbackPrice;
  }, [prices]);
  
  /**
   * Check if price is available for a token
   */
  const isPriceAvailable = useCallback((symbol: string): boolean => {
    return !!prices[symbol];
  }, [prices]);
  
  return {
    prices,
    getTokenPrice,
    isPriceAvailable,
    isLoading,
    error
  };
};
