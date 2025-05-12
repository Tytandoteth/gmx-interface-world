import React, { createContext, useContext, ReactNode } from 'react';
import { useChainId } from 'lib/chains';
import { isWorldChain } from 'lib/worldchain';
import { PricesMap } from 'domain/prices/apis';
import { useDirectPrices } from 'domain/prices/useDirectPrices';

type OraclePricesContextType = {
  prices: PricesMap;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
};

const defaultContext: OraclePricesContextType = {
  prices: {},
  loading: false,
  error: null,
  lastUpdated: null,
  refresh: async () => {},
};

const OraclePricesContext = createContext<OraclePricesContextType>(defaultContext);

type Props = {
  children: ReactNode;
  pollInterval?: number;
};

/**
 * Provider component that makes Oracle Keeper price data available throughout the application
 */
export function OraclePricesProvider({ children, pollInterval = 15000 }: Props) {
  // Get chain ID
  const chainIdObj = useChainId();
  const chainId = typeof chainIdObj === 'number' ? chainIdObj : chainIdObj.chainId;
  
  // Only enable for World Chain
  const isWorldChainNetwork = isWorldChain(chainId);
  
  // Get price data from Oracle Keeper
  const { 
    prices, 
    loading, 
    error, 
    lastUpdated, 
    refresh 
  } = useDirectPrices({
    pollInterval,
    enabled: isWorldChainNetwork,
    tokens: ['WLD', 'WETH', 'MAG'],
  });
  
  const contextValue: OraclePricesContextType = {
    prices,
    loading,
    error,
    lastUpdated,
    refresh,
  };
  
  return (
    <OraclePricesContext.Provider value={contextValue}>
      {children}
    </OraclePricesContext.Provider>
  );
}

/**
 * Hook to use Oracle Keeper price data from anywhere in the application
 */
export function useOraclePrices(): OraclePricesContextType {
  const context = useContext(OraclePricesContext);
  
  if (!context) {
    throw new Error('useOraclePrices must be used within an OraclePricesProvider');
  }
  
  return context;
}
