import { JsonRpcProvider } from '@ethersproject/providers';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { usePublicClient } from 'wagmi';

import { useChainId } from 'lib/chains';
import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';
import { TickersResponse } from 'lib/oracleKeeperFetcher/types';
import { WorldChainOracleKeeper, createWorldChainOracleKeeper } from 'lib/oracleKeeperFetcher/WorldChainOracleKeeper';
import { WORLD } from 'sdk/configs/chains';

import { debugPriceData, debugWorldChainEnvironment } from './debugUtils';
import { WorldChainConfig } from './worldChainDevMode';
import { getWorldChainProvider } from "./providers";

const REFRESH_INTERVAL_MS = 30000; // 30 seconds

// Keep a singleton instance of the keeper for each chain
const keeperInstances: Record<number, WorldChainOracleKeeper> = {};

/**
 * Hook to use the robust Oracle Keeper implementation
 * Provides real-time price data with fallbacks and error handling
 */
export function useRobustOracleKeeper() {
  const { chainId } = useChainId();
  const _publicClient = usePublicClient(); // Prefix with underscore as it's no longer used
  // Prefix unused variable with underscore to satisfy linting rules
  const { mutate: _mutate } = useSWRConfig();
  const [tickers, setTickers] = useState<TickersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Get or create a keeper instance for this chain - but only if we're on World Chain
  const keeper = useMemo(() => {
    // Skip keeper creation if not on World Chain
    if (chainId !== WORLD) {
      logger.info(`[useRobustOracleKeeper] Not creating keeper for non-World Chain: ${chainId}`);
      return null;
    }
    
    try {
      // Use existing instance if available
      if (keeperInstances[chainId]) {
        return keeperInstances[chainId];
      }

      // Use our standardized provider utility to ensure consistent configuration
      logger.info('[useRobustOracleKeeper] Getting World Chain provider from utility');
      const provider = getWorldChainProvider();
      
      if (!provider) {
        logger.error('[useRobustOracleKeeper] Failed to get World Chain provider');
        return null;
      }
      
      // Create new instance with the ethers provider
      const newKeeper = createWorldChainOracleKeeper(chainId, provider);

      // Store the instance
      keeperInstances[chainId] = newKeeper;
      return newKeeper;
    } catch (error) {
      logger.error('[useRobustOracleKeeper] Error creating keeper:', error);
      return null;
    }
  }, [chainId]); // publicClient no longer needed in dependencies

  // Is this World Chain?
  const isWorldChain = chainId === WORLD;

  // Log environment info on first render
  useEffect(() => {
    if (isWorldChain) {
      debugWorldChainEnvironment();
    }
  }, [isWorldChain]);

  // Wrap fetchPrices in useCallback to prevent dependency changes on every render
  const fetchPrices = useCallback(async () => {
    if (!isWorldChain || !keeper) {
      // Early return if not on World Chain or keeper couldn't be created
      if (!isWorldChain) {
        logger.info('[OracleKeeper] Not fetching prices for non-World Chain');
      } else {
        logger.warn('[OracleKeeper] Cannot fetch prices: Oracle Keeper was not initialized');
      }
      return;
    }
    
    setLoading(true);
    setError(null);
    
    logger.warn(`[OracleKeeper] Fetching prices for World Chain, chainId: ${chainId}`);
    
    try {
      // Try to fetch direct prices first (CoinGecko)
      try {
        logger.warn('[OracleKeeper] Attempting to fetch prices from CoinGecko...');
        const directPrices = await keeper.fetchDirectPrices();
        
        // Debug the price data we received
        if (directPrices?.prices) {
          debugPriceData(directPrices.prices);
        }
        
        if (directPrices && directPrices.prices && Object.keys(directPrices.prices).length > 0) {
          // Format the response according to TickersResponse format
          const formattedTickers = {
            tickers: {
              ...Object.entries(directPrices.prices).reduce((acc, [symbol, price]) => {
                // Ensure price is a number and not undefined
                const safePrice = typeof price === 'number' ? price : 
                  WorldChainConfig.defaultPrices[symbol] || WorldChainConfig.defaultPrices.DEFAULT;
                
                acc[symbol] = {
                  tokenSymbol: symbol,
                  indexTokenSymbol: symbol,
                  multiplierDivisor: 10000, // Standard divisor
                  maxLeverage: 100, // 10x leverage
                  lastPrice: safePrice,
                  dailyChange: 0, // Not available from direct pricing
                };
                return acc;
              }, {}),
            },
            sampleTime: directPrices.timestamp || Date.now(),
            lastUpdateTimestamp: directPrices.lastUpdated || new Date().toISOString(),
          };
        
          // Using console.warn instead of console.log per TypeScript strictness rules
          logger.warn('[OracleKeeper] Formatted tickers data ready');
          // Create a properly structured TickersResponse object
          // Since TickersResponse appears to be an array type, we need to transform our data
          const tickersArray = Object.entries(formattedTickers.tickers).map(([_, ticker]) => ({
            minPrice: (ticker as any).lastPrice.toString(),
            maxPrice: (ticker as any).lastPrice.toString(),
            oracleDecimals: 8,
            tokenSymbol: (ticker as any).tokenSymbol,
            tokenAddress: '', // Not available from direct pricing
            updatedAt: formattedTickers.sampleTime
          }));
          
          setTickers(tickersArray as unknown as TickersResponse);
        
          setLoading(false);
          setLastUpdated(Date.now());
          return;
        }
      } catch (directErr) {
        logger.warn('Failed to fetch direct prices, falling back to tickers:', directErr);
      }
      
      // Fallback to regular tickers API - this should never run if keeper is null
      // due to our early return above, but TypeScript doesn't know that
      if (keeper) {
        const data = await keeper.fetchTickers();
        setTickers(data);
        setLastUpdated(Date.now());
        setLoading(false);
      } else {
        // This is a safety check - we should never reach here
        setError(new Error('Oracle Keeper not initialized'));
        setLoading(false);
      }
    } catch (err) {
      logger.error('Error fetching prices:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [isWorldChain, chainId, keeper, setTickers, setLoading, setError, setLastUpdated]);

  // Fetch prices on mount and periodically
  // The fetchPrices function depends on multiple state variables and needs to be included in dependencies
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
  }, [isWorldChain, keeper, chainId, fetchPrices]);

  return {
    keeper,
    tickers,
    loading,
    error,
    lastUpdated,
    refetch: fetchPrices,
    isWorldChain, // Additional info to help debug
    chainId
  };
}
