import { useState, useEffect, useMemo } from 'react';
import { useChainId } from 'lib/chains';
import { WORLD } from 'sdk/configs/chains';
import { RobustOracleKeeper } from 'lib/oracleKeeperFetcher/robust-oracle-keeper';
import { useSWRConfig } from 'swr';
import { TickersResponse } from 'lib/oracleKeeperFetcher/types';
import { usePublicClient } from 'wagmi';

const REFRESH_INTERVAL_MS = 30000; // 30 seconds

// Keep a singleton instance of the keeper for each chain
const keeperInstances: Record<number, RobustOracleKeeper> = {};

/**
 * Hook to use the robust Oracle Keeper implementation
 * Provides real-time price data with fallbacks and error handling
 */
export function useRobustOracleKeeper() {
  const { chainId } = useChainId();
  const publicClient = usePublicClient();
  const { cache } = useSWRConfig();
  const [tickers, setTickers] = useState<TickersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Get or create a keeper instance for this chain
  const keeper = useMemo(() => {
    // Use existing instance if available
    if (keeperInstances[chainId]) {
      return keeperInstances[chainId];
    }

    // Create new instance
    const newKeeper = new RobustOracleKeeper({
      chainId,
      oracleKeeperIndex: 0,
      forceIncentivesActive: false,
      provider: publicClient as any,
    });

    // Store the instance
    keeperInstances[chainId] = newKeeper;
    return newKeeper;
  }, [chainId, publicClient]);

  // Is this World Chain?
  const isWorldChain = chainId === WORLD;

  // Fetch prices function
  const fetchPrices = async () => {
    if (!isWorldChain) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await keeper.fetchTickers();
      setTickers(data);
      setLastUpdated(Date.now());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  };

  // Fetch prices on mount and periodically
  useEffect(() => {
    if (!isWorldChain) return;
    
    // Initial fetch
    fetchPrices();
    
    // Set up interval for periodic refresh
    const intervalId = setInterval(fetchPrices, REFRESH_INTERVAL_MS);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
    };
  }, [isWorldChain, keeper]);

  return {
    keeper,
    tickers,
    loading,
    error,
    lastUpdated,
    refresh: fetchPrices,
  };
}
