import React, { createContext, ReactNode, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { WORLD, isChainInDevelopment } from 'sdk/configs/chains';
import { useChainId } from 'lib/chains';
import { useRobustOracleKeeper } from 'lib/worldchain/useRobustOracleKeeper';

// Constants for the Oracle Keeper integration
const ORACLE_KEEPER_URL = 'https://oracle-keeper.kevin8396.workers.dev';
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;
const REFRESH_INTERVAL_MS = 30000; // Refresh prices every 30 seconds

// Types for Oracle Keeper data
interface PriceData {
  [tokenSymbol: string]: number;
}

interface OracleData {
  prices: PriceData | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

interface WorldChainContextType {
  isWorldChain: boolean;
  isDevMode: boolean;
  mockDataAvailable: boolean;
  oracleData: OracleData;
  withFallback: <T>(fn: () => T, fallbackValue: T) => T;
  refreshPrices: () => Promise<void>;
}

// Default context value with proper fallbacks
const defaultContextValue: WorldChainContextType = {
  isWorldChain: false,
  isDevMode: false,
  mockDataAvailable: false,
  oracleData: {
    prices: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  },
  withFallback: <T,>(fn: () => T, fallbackValue: T): T => fallbackValue,
  refreshPrices: async (): Promise<void> => Promise.resolve(),
};

const WorldChainContext = createContext<WorldChainContextType>(defaultContextValue);

/**
 * Error boundary component to catch and handle errors in the World Chain provider
 */
class WorldChainErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): {hasError: boolean} {
    return { hasError: true };
  }

  componentDidCatch(error: Error | unknown): void {
    // Enhanced error logging to handle non-Error objects
    if (error instanceof Error) {
      console.error("Error in WorldChainProvider:", error.message, error.stack);
    } else {
      console.error("Error in WorldChainProvider:", error);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Provide a graceful fallback UI
      return (
        <div style={{ padding: '10px', backgroundColor: '#FFEBEE', color: '#B71C1C', borderRadius: '4px' }}>
          <h4>World Chain Configuration Error</h4>
          <p>There was an error loading World Chain data. The application will continue with limited functionality.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Helper function to delay execution
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Provider component for World Chain specific configuration and settings.
 * Handles development mode and mock data for World Chain integration.
 */
export function WorldChainProvider({ children }: { children: ReactNode }): JSX.Element {
  const { chainId } = useChainId();
  
  const isWorldChain = chainId === WORLD;
  const isDevMode = isChainInDevelopment(chainId);
  
  // Use our robust Oracle Keeper implementation
  const {
    tickers,
    loading: isLoading,
    error,
    lastUpdated,
    refresh: refreshPrices
  } = useRobustOracleKeeper();
  
  // Extract price data from tickers
  const prices = useMemo(() => {
    if (!tickers || !tickers.length) return null;
    
    // Convert the tickers format to the price format expected by the app
    const priceData: Record<string, number> = {};
    
    tickers.forEach(ticker => {
      if (ticker.tokenSymbol && ticker.minPrice) {
        // Use average of min and max prices if available
        const minPrice = parseFloat(ticker.minPrice);
        const maxPrice = parseFloat(ticker.maxPrice || ticker.minPrice);
        priceData[ticker.tokenSymbol] = (minPrice + maxPrice) / 2;
      }
    });
    
    return Object.keys(priceData).length > 0 ? priceData : null;
  }, [tickers]);
  
  // Determine if mock data is available based on having prices
  const mockDataAvailable = Boolean(prices && Object.keys(prices || {}).length > 0);
  
  // Log World Chain status for debugging
  useEffect(() => {
    if (isWorldChain) {
      console.log('World Chain Mode:', {
        isDevMode,
        mockDataAvailable,
        pricesCount: prices ? Object.keys(prices).length : 0,
        lastUpdated,
        oracleStatus: error ? 'Error' : isLoading ? 'Loading' : 'Active'
      });
    }
  }, [isWorldChain, isDevMode, mockDataAvailable, prices, lastUpdated, isLoading, error]);
  
  // Utility function for safely handling functions that might fail due to missing contracts
  const withFallback = useMemo(() => {
    return <T,>(fn: () => T, fallbackValue: T): T => {
      if (!isDevMode) return fn(); // Only use fallbacks in dev mode
      
      try {
        return fn();
      } catch (err) {
        console.warn('Function failed in development mode, using fallback', err);
        return fallbackValue;
      }
    };
  }, [isDevMode]);
  
  // Log World Chain status for debugging
  useEffect(() => {
    if (isWorldChain) {
      console.log('World Chain Mode:', {
        isDevMode,
        mockDataAvailable,
        pricesCount: prices ? Object.keys(prices).length : 0,
        lastUpdated,
      });
    }
  }, [isWorldChain, isDevMode, mockDataAvailable, prices, lastUpdated]);
  
  const contextValue = useMemo((): WorldChainContextType => ({
    isWorldChain,
    isDevMode,
    mockDataAvailable,
    oracleData: {
      prices,
      isLoading,
      error,
      lastUpdated,
    },
    withFallback,
    refreshPrices,
  }), [isWorldChain, isDevMode, mockDataAvailable, prices, isLoading, error, lastUpdated, withFallback, refreshPrices]);
  
  return (
    <WorldChainErrorBoundary>
      <WorldChainContext.Provider value={contextValue}>
        {children}
      </WorldChainContext.Provider>
    </WorldChainErrorBoundary>
  );
}

/**
 * Hook to access World Chain specific configuration and state
 * @returns World Chain context value
 */
export function useWorldChain(): WorldChainContextType {
  return useContext(WorldChainContext);
}
