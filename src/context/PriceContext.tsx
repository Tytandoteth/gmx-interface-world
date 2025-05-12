import React, { createContext, useContext, ReactNode } from 'react';
import { usePrices } from '../hooks/usePrices';
import { MappedPrices } from '../services/priceMappingService';

// Interface for the price context value
interface PriceContextValue {
  prices: MappedPrices | null;
  loading: boolean;
  error: Error | null;
  refreshPrices: () => Promise<void>;
  priceSource: string;
}

// Create the context with a default empty value
const PriceContext = createContext<PriceContextValue>({
  prices: null,
  loading: true,
  error: null,
  refreshPrices: async () => {
    // Empty default implementation
  },
  priceSource: 'Not initialized'
});

interface PriceProviderProps {
  children: ReactNode;
  refreshInterval?: number;
}

/**
 * Provider component for price data from Oracle Keeper
 * 
 * This provider abstracts the source of price data (CoinGecko, etc.)
 * and makes it available throughout the application.
 */
export const PriceProvider: React.FC<PriceProviderProps> = ({ 
  children, 
  refreshInterval = 30000 
}) => {
  // Use the price hook to get the latest price data
  const priceData = usePrices(refreshInterval);
  
  return (
    <PriceContext.Provider value={priceData}>
      {children}
    </PriceContext.Provider>
  );
};

/**
 * Hook to access price data throughout the application
 * @returns Price context value with prices, loading state, error, refresh function, and price source
 */
export const usePriceContext = (): PriceContextValue => {
  const context = useContext(PriceContext);
  
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  
  return context;
};

/**
 * A component to display current price source information in the UI
 */
export const PriceSourceIndicator: React.FC = () => {
  const { priceSource, loading } = usePriceContext();
  
  return (
    <div className="price-source-indicator">
      <div className="source-badge">
        <span className="source-label">Price source:</span>
        <span className={`source-value ${loading ? 'loading' : ''}`}>
          {priceSource}
        </span>
      </div>
    </div>
  );
};

/**
 * Hook to get a specific token price
 * @param symbol The token symbol to get the price for
 * @param useTestPrice Whether to use test token prices (default: false)
 * @returns The token price or null if not available
 */
export const useTokenPrice = (symbol: string, useTestPrice = false): number | null => {
  const { prices } = usePriceContext();
  
  if (!prices) return null;
  
  // Determine which price map to use (real or test tokens)
  const priceMap = useTestPrice ? prices.test : prices.real;
  
  // Return the price if available, otherwise null
  return priceMap[symbol] || null;
};
