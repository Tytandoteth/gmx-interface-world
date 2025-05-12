import { useState, useEffect, useCallback } from 'react';
import { mapOracleKeeperPrices, MappedPrices } from '../services/priceMappingService';

/**
 * Result type for the usePrices hook
 */
interface UsePricesResult {
  prices: MappedPrices | null;
  loading: boolean;
  error: Error | null;
  refreshPrices: () => Promise<void>;
  priceSource: string;
}

/**
 * Hook for accessing real-time price data from the Oracle Keeper
 * 
 * The Oracle Keeper provides price data from various sources (CoinGecko, etc.)
 * and abstracts away the specific data source implementation.
 * 
 * @param refreshInterval Interval in milliseconds for automatic price refreshing (default: 30s)
 * @returns Object containing prices, loading state, error state, and manual refresh function
 */
export const usePrices = (refreshInterval = 30000): UsePricesResult => {
  const [prices, setPrices] = useState<MappedPrices | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Track the current price source (CoinGecko, etc)
  const [priceSource, setPriceSource] = useState<string>('Loading...');
  
  /**
   * Fetch the latest price data from the Oracle Keeper
   */
  const fetchPrices = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const mappedPrices = await mapOracleKeeperPrices();
      
      // Update state with the latest prices
      setPrices(mappedPrices);
      setPriceSource(mappedPrices.source);
      setError(null);
      
      // Log success in development
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`Prices updated from ${mappedPrices.source}`);
      }
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Unknown error fetching prices');
      setError(errorInstance);
      setPriceSource('Error');
      
      // Log error in development only
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Error fetching prices:', errorInstance);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Set up price refreshing
  useEffect(() => {
    // Fetch immediately on mount
    void fetchPrices();
    
    // Set up interval for refreshing prices if interval is positive
    let intervalId: number | undefined;
    
    if (refreshInterval > 0) {
      intervalId = window.setInterval(() => {
        void fetchPrices();
      }, refreshInterval);
    }
    
    // Clear interval on unmount
    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [fetchPrices, refreshInterval]);
  
  return { 
    prices, 
    loading, 
    error,
    refreshPrices: fetchPrices,
    priceSource
  };
};
