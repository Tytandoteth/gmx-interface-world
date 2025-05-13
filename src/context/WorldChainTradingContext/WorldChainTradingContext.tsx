/**
 * World Chain Trading Context
 * Provides access to World Chain trading functionality throughout the application
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ethers } from 'ethers';

import { 
  useWorldChainSwap, 
  useWorldChainPosition,
  useWorldChainPrices,
  SwapParams,
  PositionParams,
  TradingResult
} from '../../lib/contracts/useWorldChainTrading';

// Define the context properties
interface WorldChainTradingContextType {
  // Swap functionality
  executeSwap: (params: SwapParams) => Promise<TradingResult>;
  isSwapping: boolean;
  swapLastTx: ethers.TransactionResponse | null;
  swapError: Error | null;
  
  // Position functionality
  increasePosition: (params: PositionParams) => Promise<TradingResult>;
  getMinExecutionFee: () => Promise<bigint>;
  isProcessingPosition: boolean;
  positionLastTx: ethers.TransactionResponse | null;
  positionError: Error | null;
  
  // Price data
  prices: Record<string, number>;
  getTokenPrice: (symbol: string) => number | undefined;
  isPricesLoading: boolean;
  pricesError: Error | null;
  
  // Loading states
  isLoading: boolean;
}

// Create the context with default values
const WorldChainTradingContext = createContext<WorldChainTradingContextType>({
  // Default values for swap functionality
  executeSwap: async () => ({ success: false, error: new Error('Context not initialized') }),
  isSwapping: false,
  swapLastTx: null,
  swapError: null,
  
  // Default values for position functionality
  increasePosition: async () => ({ success: false, error: new Error('Context not initialized') }),
  getMinExecutionFee: async () => 300000000000000n,
  isProcessingPosition: false,
  positionLastTx: null,
  positionError: null,
  
  // Default values for price data
  prices: {},
  getTokenPrice: () => undefined,
  isPricesLoading: true,
  pricesError: null,
  
  // Loading state
  isLoading: true
});

// Props for the provider component
interface WorldChainTradingProviderProps {
  children: ReactNode;
}

/**
 * Provider component for World Chain trading functionality
 */
export const WorldChainTradingProvider: React.FC<WorldChainTradingProviderProps> = ({ children }) => {
  // Use the custom hooks
  const { 
    executeSwap, 
    isSwapping, 
    lastTx: swapLastTx, 
    error: swapError,
    isLoading: isSwapLoading
  } = useWorldChainSwap();
  
  const {
    increasePosition,
    getMinExecutionFee,
    isProcessing: isProcessingPosition,
    lastTx: positionLastTx,
    error: positionError,
    isLoading: isPositionLoading
  } = useWorldChainPosition();
  
  const {
    prices,
    getTokenPrice,
    isLoading: isPricesLoading,
    error: pricesError
  } = useWorldChainPrices();
  
  // Combined loading state
  const isLoading = isSwapLoading || isPositionLoading || isPricesLoading;
  
  // Create the context value
  const contextValue: WorldChainTradingContextType = {
    // Swap functionality
    executeSwap,
    isSwapping,
    swapLastTx,
    swapError,
    
    // Position functionality
    increasePosition,
    getMinExecutionFee,
    isProcessingPosition,
    positionLastTx,
    positionError,
    
    // Price data
    prices,
    getTokenPrice,
    isPricesLoading,
    pricesError,
    
    // Loading state
    isLoading
  };
  
  return (
    <WorldChainTradingContext.Provider value={contextValue}>
      {children}
    </WorldChainTradingContext.Provider>
  );
};

/**
 * Hook to use the World Chain trading context
 */
export const useWorldChainTrading = (): WorldChainTradingContextType => {
  const context = useContext(WorldChainTradingContext);
  
  if (context === undefined) {
    throw new Error('useWorldChainTrading must be used within a WorldChainTradingProvider');
  }
  
  return context;
};

export default WorldChainTradingContext;
