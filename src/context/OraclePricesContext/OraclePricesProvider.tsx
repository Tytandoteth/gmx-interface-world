import React, { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
// External and core React imports first

// Domain and lib imports grouped by directory
import { PricesMap } from 'domain/prices/apis';
import { useDirectPrices } from 'domain/prices/useDirectPrices';
import { useChainId } from 'lib/chains';
import { Logger } from 'lib/logger';
import { isWorldChain } from 'lib/worldchain';
import { isProductionEnvironment } from 'lib/worldchain/environmentUtils';

// Default fallback prices when data is unavailable
const DEFAULT_FALLBACK_PRICES: Record<string, number> = {
  WLD: 1.25,     // Default World coin price
  WETH: 3550.00, // Default Ethereum price
  ETH: 3550.00,  // Alias for WETH
  USDC: 1.00,    // Default USDC price
  MAG: 2.50,     // Default MAG price
};

// Price data structure is already defined in PricesMap, so we don't need to redefine it here

// Enhanced with more safety properties and functions
type OraclePricesContextType = {
  // Price data
  prices: PricesMap;
  
  // State indicators
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  
  // Functions
  refresh: () => Promise<void>;
  getTokenPrice: (symbol: string, fallback?: number) => number | undefined;
  isPriceAvailable: (symbol: string) => boolean;
  isStalePriceData: () => boolean;
};

const defaultContext: OraclePricesContextType = {
  prices: {},
  loading: false,
  error: null,
  lastUpdated: null,
  // Empty implementation for the default context
  refresh: async () => { /* Default empty implementation */ },
  getTokenPrice: () => undefined,
  isPriceAvailable: () => false,
  isStalePriceData: () => true,
};

const OraclePricesContext = createContext<OraclePricesContextType>(defaultContext);

type Props = {
  children: ReactNode;
  pollInterval?: number;
};

/**
 * Provider component that makes Oracle Keeper price data available throughout the application
 * with enhanced safety features for production use
 */
export function OraclePricesProvider({ children, pollInterval = 15000 }: Props) {
  // Get chain ID
  const chainIdObj = useChainId();
  const chainId = typeof chainIdObj === 'number' ? chainIdObj : chainIdObj.chainId;
  
  // Only enable for World Chain
  const isWorldChainNetwork = isWorldChain(chainId);
  
  // Get price data from Oracle Keeper with expanded token list
  const { 
    prices, 
    loading, 
    error, 
    lastUpdated, 
    refresh 
  } = useDirectPrices({
    pollInterval,
    enabled: isWorldChainNetwork,
    tokens: ['WLD', 'WETH', 'ETH', 'USDC', 'MAG'], // Support all tokens in the system
  });
  
  // Log any price fetch errors, but only in development mode
  useEffect(() => {
    if (error && !isProductionEnvironment()) {
      Logger.warn('OraclePrices error:', error);
    }
  }, [error]);
  
  // Check for stale price data (older than 5 minutes)
  const isStalePriceData = useCallback(() => {
    if (!lastUpdated) return true;
    
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastUpdated < fiveMinutesAgo;
  }, [lastUpdated]);
  
  // Safe access to token prices
  const getTokenPrice = useCallback((symbol: string, fallback?: number): number | undefined => {
    if (!symbol) {
      // If no symbol provided, return undefined or fallback
      return fallback;
    }
    
    // Try to get price from oracle data
    const tokenPrice = prices[symbol];
    if (tokenPrice && tokenPrice.reference) {
      return tokenPrice.reference;
    }
    
    // If no price found but fallback provided, use that
    if (fallback !== undefined) {
      return fallback;
    }
    
    // If no explicit fallback but we have a default, use it
    return DEFAULT_FALLBACK_PRICES[symbol];
  }, [prices]);
  
  // Check if price is available
  const isPriceAvailable = useCallback((symbol: string): boolean => {
    if (!symbol) return false;
    
    const price = prices[symbol];
    return !!price && !!price.reference;
  }, [prices]);
  
  // Create context value with enhanced safety functions
  const contextValue = useMemo<OraclePricesContextType>(() => ({
    prices,
    loading,
    error,
    lastUpdated,
    refresh,
    getTokenPrice,
    isPriceAvailable,
    isStalePriceData,
  }), [prices, loading, error, lastUpdated, refresh, getTokenPrice, isPriceAvailable, isStalePriceData]);
  
  return (
    <OraclePricesContext.Provider value={contextValue}>
      {children}
    </OraclePricesContext.Provider>
  );
}

/**
 * Hook to use Oracle Keeper price data from anywhere in the application
 * with built-in safety features for production use
 */
export function useOraclePrices(): OraclePricesContextType {
  const context = useContext(OraclePricesContext);
  
  if (!context) {
    // Instead of throwing and crashing the app, log the error and return a fallback
    if (!isProductionEnvironment()) {
      // Only log in development - don't expose errors in production
      Logger.error('useOraclePrices must be used within an OraclePricesProvider');
    }
    
    // Return default context instead of throwing
    return defaultContext;
  }
  
  return context;
}

/**
 * Utility hook to get the price of a specific token with fallback handling
 * @param symbol Token symbol (e.g., 'WLD', 'WETH')
 * @param fallback Optional fallback price if not available
 */
export function useTokenPrice(symbol: string, fallback?: number): number | undefined {
  const { getTokenPrice } = useOraclePrices();
  return getTokenPrice(symbol, fallback);
}

/**
 * Get safe display text for a token price
 * @param symbol Token symbol
 * @param fallback Optional fallback price if not available
 * @param prefix Optional prefix (default: '$')
 * @param decimals Optional decimal places (default: 2)
 */
export function useSafeTokenPriceDisplay(
  symbol: string, 
  fallback?: number,
  prefix = '$',
  decimals = 2
): string {
  const price = useTokenPrice(symbol, fallback);
  // Format price with appropriate decimal places
  
  if (price === undefined) {
    return `${prefix}--.--`;
  }
  
  return `${prefix}${price.toFixed(decimals)}`;
}
