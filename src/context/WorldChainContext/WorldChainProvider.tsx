import React, { createContext, ReactNode, useContext, useEffect, useState, useMemo } from 'react';
import { WORLD, isChainInDevelopment } from 'sdk/configs/chains';
import { useChainId } from 'lib/chains';

interface OracleData {
  prices: Record<string, number> | null;
  isLoading: boolean;
  error: Error | null;
}

interface WorldChainContextType {
  isWorldChain: boolean;
  isDevMode: boolean;
  mockDataAvailable: boolean;
  oracleData: OracleData;
  withFallback: <T>(fn: () => T, fallbackValue: T) => T;
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
  },
  withFallback: <T>(fn: () => T, fallbackValue: T): T => {
    try {
      return fn();
    } catch (err) {
      console.warn('Function failed in development mode, using fallback', err);
      return fallbackValue;
    }
  },
};

const WorldChainContext = createContext<WorldChainContextType>(defaultContextValue);

/**
 * Provider component for World Chain specific configuration and settings.
 * Handles development mode and mock data for World Chain integration.
 */
export function WorldChainProvider({ children }: { children: ReactNode }): JSX.Element {
  const { chainId } = useChainId();
  
  const isWorldChain = chainId === WORLD;
  const isDevMode = isChainInDevelopment(chainId);
  
  // Check if our Oracle Keeper is available for mock data
  const [mockDataAvailable, setMockDataAvailable] = useState<boolean>(false);
  const [prices, setPrices] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch prices from Oracle Keeper if on World Chain
  useEffect(() => {
    if (isWorldChain) {
      setIsLoading(true);
      
      fetch('https://oracle-keeper.kevin8396.workers.dev/prices')
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Oracle Keeper returned error response');
        })
        .then(data => {
          setPrices(data);
          setMockDataAvailable(true);
          setIsLoading(false);
          console.log('World Chain Oracle Keeper is available', data);
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setMockDataAvailable(false);
          setIsLoading(false);
          console.warn('World Chain Oracle Keeper is not available:', err);
        });
    }
  }, [isWorldChain]);
  
  // Utility function for safely handling functions that might fail due to missing contracts
  const withFallback = useMemo(() => {
    return <T>(fn: () => T, fallbackValue: T): T => {
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
        prices,
      });
    }
  }, [isWorldChain, isDevMode, mockDataAvailable, prices]);
  
  const contextValue = useMemo(() => ({
    isWorldChain,
    isDevMode,
    mockDataAvailable,
    oracleData: {
      prices,
      isLoading,
      error,
    },
    withFallback,
  }), [isWorldChain, isDevMode, mockDataAvailable, prices, isLoading, error, withFallback]);
  
  return (
    <WorldChainContext.Provider value={contextValue}>
      {children}
    </WorldChainContext.Provider>
  );
}

/**
 * Hook to access World Chain specific configuration and state
 * @returns World Chain context value
 */
export function useWorldChain(): WorldChainContextType {
  return useContext(WorldChainContext);
}
