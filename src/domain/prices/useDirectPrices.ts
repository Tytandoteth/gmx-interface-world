import { useEffect, useState } from "react";
import { useChainId } from "lib/chains";
import { isWorldChain } from "lib/worldchain";

import { fetchOracleKeeperDirectPrices, PricesMap, getEmergencyPrices, combinePriceSources } from "./apis";

/**
 * Configuration options for the useDirectPrices hook
 */
export type UseDirectPricesOptions = {
  pollInterval?: number; // How often to poll for new prices (in ms)
  enabled?: boolean;     // Whether to enable the hook
  tokens?: string[];     // Specific tokens to fetch prices for
};

/**
 * Hook for accessing real-time token prices from the Oracle Keeper
 * Automatically polls for fresh prices at the specified interval
 * 
 * @param options Configuration options
 * @returns Object containing prices, loading state, and error information
 */
export function useDirectPrices(options: UseDirectPricesOptions = {}) {
  const {
    pollInterval = 15000, // Default: poll every 15 seconds
    enabled = true,
    tokens = ["WLD", "WETH", "MAG"]
  } = options;
  
  // Get the numeric chain ID
  const chainIdObject = useChainId();
  const chainId = typeof chainIdObject === 'number' ? chainIdObject : chainIdObject.chainId;
  
  const [prices, setPrices] = useState<PricesMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  useEffect(() => {
    if (!enabled || !isWorldChain(chainId)) {
      return;
    }
    
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const directPrices = await fetchOracleKeeperDirectPrices(chainId);
        
        // If we have no prices or an error occurred, use emergency prices as fallback
        const finalPrices = Object.keys(directPrices).length > 0 
          ? directPrices 
          : combinePriceSources(directPrices, getEmergencyPrices());
        
        if (isMounted) {
          setPrices(finalPrices);
          setLastUpdated(Date.now());
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          
          // Use emergency prices on error
          setPrices(getEmergencyPrices());
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          
          // Set up next poll
          if (enabled) {
            timeoutId = setTimeout(fetchPrices, pollInterval);
          }
        }
      }
    };
    
    // Initial fetch
    fetchPrices();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [chainId, enabled, pollInterval]);
  
  // Filter to only the requested tokens if specified
  const filteredPrices: PricesMap = {};
  for (const token of tokens) {
    if (prices[token]) {
      filteredPrices[token] = prices[token];
    }
  }
  
  // Return everything needed by consumers
  return {
    prices: filteredPrices,
    loading,
    error,
    lastUpdated,
    refresh: async () => {
      setLoading(true);
      try {
        const directPrices = await fetchOracleKeeperDirectPrices(chainId);
        setPrices(Object.keys(directPrices).length > 0 ? directPrices : getEmergencyPrices());
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setPrices(getEmergencyPrices());
      } finally {
        setLoading(false);
      }
    }
  };
}
