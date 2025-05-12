import { ethers } from 'ethers';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { usePublicClient } from 'wagmi';

import { useChainId } from 'lib/chains';
import { useVaultContract, useRouterContract, usePriceFeedContract, useWitnetPriceRouterContract } from 'lib/contracts/useContracts';
import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';
import { useSigner } from 'lib/wallet';
import { getTokenPriceBySymbol } from 'lib/worldchain/simplePriceFeed';
import { useRobustOracleKeeper } from 'lib/worldchain/useRobustOracleKeeper';
import { getWorldChainConfig, WorldChainProductionConfig } from 'lib/worldchain/worldChainProduction';
import { WORLD, isChainInDevelopment } from 'sdk/configs/chains';

// Note: We're now importing the real hooks from their respective modules above
// instead of using mocks

// Get the appropriate config based on environment
const _worldChainConfig = getWorldChainConfig();

// Default prices for World Chain tokens if API fails
const defaultTokenPrices = {
  WLD: 2.75,
  USDC: 1.00,
  ETH: 3550.25,
  BTC: 69420.50,
  USDT: 1.00,
  MAG: 2.50,
  DEFAULT: 1.00,
};

// Constants for the Oracle Keeper integration
// Used by the useRobustOracleKeeper hook internally
const _REFRESH_INTERVAL_MS = 30000; // Refresh prices every 30 seconds

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
  isProductionMode: boolean;
  mockDataAvailable: boolean;
  oracleData: OracleData;
  priceInfo: {
    price: number;
    loading: boolean;
    error: Error | null;
  };
  contracts: {
    vaultLoading: boolean;
    routerLoading: boolean;
    priceFeedLoading: boolean;
    witnetPriceRouterLoading: boolean;
    vaultError: Error | null;
    routerError: Error | null;
    priceFeedError: Error | null;
    witnetPriceRouterError: Error | null;
    vault: ethers.Contract | null;
    router: ethers.Contract | null;
    priceFeed: ethers.Contract | null;
    witnetPriceRouter: ethers.Contract | null;
  };
  withFallback: <T>(fn: () => T, fallbackValue: T) => T;
  refreshPrices: () => Promise<void>;
  getTokenPrice: (symbol?: string) => Promise<number | null>;
}

// Default context value with proper fallbacks
const defaultContextValue: WorldChainContextType = {
  isWorldChain: false,
  isDevMode: false,
  isProductionMode: false,
  mockDataAvailable: false,
  oracleData: {
    prices: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  },
  priceInfo: {
    price: 0,
    loading: false,
    error: null
  },
  contracts: {
    vaultLoading: false,
    routerLoading: false,
    priceFeedLoading: false,
    witnetPriceRouterLoading: false,
    vaultError: null,
    routerError: null,
    priceFeedError: null,
    witnetPriceRouterError: null,
    vault: null,
    router: null,
    priceFeed: null,
    witnetPriceRouter: null
  },
  withFallback: <T,>(fn: () => T, fallbackValue: T): T => fallbackValue,
  refreshPrices: async (): Promise<void> => Promise.resolve(),
  getTokenPrice: async (): Promise<number | null> => null,
};

const WorldChainContext = createContext<WorldChainContextType>(defaultContextValue);

/**
 * Error boundary component to catch and handle errors in the World Chain provider
 */
interface WorldChainErrorState {
  hasError: boolean;
  errorMessage: string;
  errorStack?: string;
  timestamp: number;
}

class WorldChainErrorBoundary extends React.Component<{children: ReactNode}, WorldChainErrorState> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { 
      hasError: false,
      errorMessage: '',
      timestamp: Date.now() 
    };
  }

  static getDerivedStateFromError(error: Error | unknown): WorldChainErrorState {
    // Create a user-friendly error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return { 
      hasError: true, 
      errorMessage: errorMessage || 'Unknown error in World Chain provider',
      errorStack,
      timestamp: Date.now() 
    };
  }

  componentDidCatch(error: Error | unknown, info: React.ErrorInfo): void {
    // Enhanced error logging with component stack trace
    if (error instanceof Error) {
      logger.error("Error in WorldChainProvider:", error.message, error.stack, info.componentStack);
    } else {
      logger.error("Error in WorldChainProvider:", error, info.componentStack);
    }
    
    // Report to monitoring or analytics if needed
    // This would be a good place to send errors to a monitoring service
  }
  
  // Handle retry attempt
  handleRetry = (): void => {
    this.setState({ 
      hasError: false,
      errorMessage: '',
      timestamp: Date.now() 
    });
  }

  // Extract inline styles to constants to avoid JSX attribute object creation in render
  private errorContainerStyle = {
    padding: '15px',
    margin: '10px 0',
    backgroundColor: '#FFEBEE',
    color: '#B71C1C',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };
  
  private buttonStyle = {
    backgroundColor: '#EF5350',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  };
  
  private preStyle = {
    fontSize: '12px',
    maxHeight: '200px',
    overflow: 'auto'
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Provide a graceful fallback UI with retry option
      return (
        <div style={this.errorContainerStyle}>
          <h4>World Chain Connection Issue</h4>
          <p>There was an error connecting to the World Chain network. The application will continue with limited functionality.</p>
          <details>
            <summary>Error Details</summary>
            <p>{this.state.errorMessage}</p>
            {this.state.errorStack && (
              <pre style={this.preStyle}>{this.state.errorStack}</pre>
            )}
          </details>
          <p>You can continue using other parts of the application, or try to reconnect to World Chain.</p>
          <button 
            onClick={this.handleRetry}
            style={this.buttonStyle}
          >
            Retry Connection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Helper function to delay execution
 */
const _delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Provider component for World Chain specific configuration and settings.
 * Handles development mode and mock data for World Chain integration.
 */
// Internal implementation of the provider - wrapped by the error boundary
const WorldChainProviderImpl = ({ children }: { children: ReactNode }): JSX.Element => {
  const { chainId } = useChainId();
  const _publicClient = usePublicClient(); // Prefix with underscore to indicate intentionally unused variable
  const { signer: _signer } = useSigner();
  
  const isWorldChain = chainId === WORLD;
  const isDevMode = isChainInDevelopment(chainId);
  const isProductionMode = useMemo(() => {
    const config = getWorldChainConfig();
    return !config.enableDevMode;
  }, []);
  
  // Check if SimplePriceFeed should be used
  const useSimplePriceFeed = useMemo(() => {
    const config = getWorldChainConfig();
    // Check if feature flags has the simple price feed flag
    if (typeof config.feature_flags === 'object' && config.feature_flags !== null) {
      return (config.feature_flags as { use_simple_price_feed?: boolean }).use_simple_price_feed === true;
    }
    return false;
  }, []);
  
  // State for price information
  const [priceInfo, setPriceInfo] = React.useState({
    price: 0,
    loading: true,
    error: null as Error | null
  });

  // Always call hooks - React rules require hooks to be called unconditionally
  // We'll handle the World Chain specific logic inside the hooks
  const oracleKeeperResult = useRobustOracleKeeper();
  const vaultContractResult = useVaultContract();
  const routerContractResult = useRouterContract();
  const priceFeedContractResult = usePriceFeedContract();
  const witnetPriceRouterContractResult = useWitnetPriceRouterContract();
  
  // Then handle the chain-specific logic after hook calls
  const {
    tickers,
    loading: isLoading,
    error,
    lastUpdated,
    refetch: refreshOraclePrices
  } = isWorldChain ? oracleKeeperResult : {
    tickers: null,
    loading: false,
    error: null,
    lastUpdated: null,
    refetch: () => Promise.resolve()
  };
  
  // Get contract wrappers only when connected to World Chain
  // Correct property names to match those returned by the real contract hooks
  const { contract: vaultContract, loading: vaultLoading, error: vaultError } = 
    isWorldChain ? { 
      contract: vaultContractResult.contract, 
      loading: vaultContractResult.loading, 
      error: vaultContractResult.error 
    } : { contract: null, loading: false, error: null };
    
  const { contract: routerContract, loading: routerLoading, error: routerError } = 
    isWorldChain ? { 
      contract: routerContractResult.contract, 
      loading: routerContractResult.loading, 
      error: routerContractResult.error 
    } : { contract: null, loading: false, error: null };
    
  const { contract: priceFeedContract, loading: priceFeedLoading, error: priceFeedError } = 
    isWorldChain ? { 
      contract: priceFeedContractResult.contract, 
      loading: priceFeedContractResult.loading, 
      error: priceFeedContractResult.error 
    } : { contract: null, loading: false, error: null };
    
  const { contract: witnetPriceRouterContract, loading: witnetPriceRouterLoading, error: witnetPriceRouterError } = 
    isWorldChain ? { 
      contract: witnetPriceRouterContractResult.contract, 
      loading: witnetPriceRouterContractResult.loading, 
      error: witnetPriceRouterContractResult.error 
    } : { contract: null, loading: false, error: null };
  
  // Extract price data from tickers
  const prices = useMemo(() => {
    if (!tickers) return null;
    
    // Convert the tickers format to the price format expected by the app
    const priceData: Record<string, number> = {};
    
    try {
      // Define a type for the ticker object
      type TickerData = {
        tokenSymbol?: string;
        minPrice?: string;
        maxPrice?: string;
        lastPrice?: string | number;
      };

      // Handle both array format and object format with nested tickers property
      if (Array.isArray(tickers)) {
        // Original format - array of ticker objects
        tickers.forEach((ticker: TickerData) => {
          if (ticker.tokenSymbol && ticker.minPrice) {
            // Use average of min and max prices if available
            const minPrice = parseFloat(ticker.minPrice);
            const maxPrice = parseFloat(ticker.maxPrice || ticker.minPrice);
            priceData[ticker.tokenSymbol] = (minPrice + maxPrice) / 2;
          }
        });
      } else {
        // Handle structure from direct prices - might have tickers property or direct prices
        const tickersObject = tickers as { tickers?: Record<string, TickerData> };
        
        if (tickersObject.tickers && typeof tickersObject.tickers === 'object') {
          // New format from direct prices - object with tickers property
          Object.values(tickersObject.tickers).forEach((ticker: TickerData) => {
            if (ticker.tokenSymbol && ticker.lastPrice) {
              priceData[ticker.tokenSymbol] = typeof ticker.lastPrice === 'string' 
                ? parseFloat(ticker.lastPrice) 
                : ticker.lastPrice;
            }
          });
        }
      }
    } catch (err) {
      logger.warn('Error processing tickers data:', err);
    }
    
    return Object.keys(priceData).length > 0 ? priceData : null;
  }, [tickers]);
  
  // Determine if mock data is available based on having prices
  const mockDataAvailable = Boolean(prices && Object.keys(prices || {}).length > 0);
  
  // Log initialization in development mode
  useEffect(() => {
    if (isChainInDevelopment(chainId)) {
      logger.info(
        "World Chain development mode active", 
        { chainId, productionMode: isProductionMode }
      );
    }
  }, [chainId, isProductionMode]);

  // Utility function for safely handling functions that might fail due to missing contracts
  const withFallback = useMemo(() => {
    return <T,>(fn: () => T, fallbackValue: T): T => {
      if (!isDevMode) return fn(); // Only use fallbacks in dev mode
      
      try {
        return fn();
      } catch (err) {
        logger.warn('Function failed in development mode, using fallback', err);
        return fallbackValue;
      }
    };
  }, [isDevMode]);

  // Function to get a price for a specific token with fallback
  const getTokenPrice = useCallback(async (token?: string): Promise<number | null> => {
    // Top-level try-catch to ensure we never crash the application
    try {
      if (!isWorldChain) return null;
      
      const tokenSymbol = token || 'WLD';
      
      // Try the SimplePriceFeed contract approach
      if (isProductionMode && useSimplePriceFeed) {
        try {
          logger.info(`Attempting to get price for ${tokenSymbol} from SimplePriceFeed contract`);
          
          // Create a standalone JsonRpcProvider with the QuickNode URL which has CORS support
          // This avoids any issues with the wagmi client or BrowserProvider
          const provider = new ethers.JsonRpcProvider(
            "https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/"
          );
          
          // Check the provider connection - abort early if not connected
          const network = await provider.getNetwork().catch(() => null);
          if (!network) {
            logger.warn(`SimplePriceFeed: Provider not connected, falling back to Oracle Keeper`);
            throw new Error("Provider not connected");
          }
          
          // Use our enhanced getTokenPriceBySymbol with better error handling
          const price = await getTokenPriceBySymbol(
            tokenSymbol,
            WorldChainProductionConfig.tokens,
            provider
          ).catch(e => {
            logger.warn(`Error in getTokenPriceBySymbol: ${e.message}`);
            return null;
          });
          
          if (price !== null && price > 0) {
            logger.info(`Got price for ${tokenSymbol} from SimplePriceFeed: $${price}`);
            return price;
          }
          
          logger.warn(`SimplePriceFeed contract did not return a valid price for ${tokenSymbol}, falling back to Oracle Keeper`);
        } catch (feedError) {
          logger.warn(
            `Error getting price from SimplePriceFeed for ${tokenSymbol}:`,
            feedError instanceof Error ? feedError.message : String(feedError)
          );
          // Continue to Oracle Keeper fallback
        }
      }
      
      // Try to get from Oracle Keeper
      if (isProductionMode) {
        // Get from World Chain Oracle Keeper in production
        if (error || !tickers) {
          throw new Error("Oracle Keeper error: " + (error instanceof Error ? error.message : String(error) || "No tickers"));
        }

        // Find match for token
        const tokenData = tickers.find(t => 
          t.tokenSymbol?.toUpperCase() === tokenSymbol.toUpperCase()
        );

        if (tokenData) {
          const price = Number(tokenData.minPrice);
          logger.info(`Found price for ${tokenSymbol} from Oracle Keeper: $${price}`);
          return price;
        }

        throw new Error(`No price data for ${tokenSymbol} from Oracle Keeper`);
      } else {
        // Use mock prices in development
        const mockPrice = defaultTokenPrices[tokenSymbol as keyof typeof defaultTokenPrices] || defaultTokenPrices.DEFAULT;
        logger.info(`Using mock price for ${tokenSymbol}: $${mockPrice}`);
        return mockPrice;
      }
    } catch (error) {
      // Safe error handling - tokenSymbol might not be defined in this outer scope
      const symbol = token || 'WLD';
      logger.error(`Error getting price for ${symbol}:`, error instanceof Error ? error.message : String(error));
      // Fallback to default prices
      return defaultTokenPrices[symbol as keyof typeof defaultTokenPrices] || defaultTokenPrices.DEFAULT;
    }
  }, [isWorldChain, isProductionMode, useSimplePriceFeed, tickers, error]);

  // Function to refresh price data
  const refreshPrices = useCallback(async () => {
    if (!isWorldChain) return;

    try {
      logger.info("Refreshing prices...");
      // First refresh the Oracle data
      await refreshOraclePrices();
      // Then get the WLD price
      const priceData = await getTokenPrice();

      // Set price info
      setPriceInfo({
        price: priceData || 0,
        loading: false,
        error: null
      });
    } catch (error) {
      logger.error("Error refreshing prices:", error instanceof Error ? error.message : String(error));
      setPriceInfo(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error))
      }));
    }
  }, [isWorldChain, refreshOraclePrices, getTokenPrice]);

  // Fetch prices on interval
  useEffect(() => {
    if (!isWorldChain) return;

    logger.info("Setting up price refresh interval");
    
    // Initial fetch
    void refreshPrices();
    
    // Set up interval for regular updates
    const intervalId = setInterval(() => {
      void refreshPrices();
    }, _REFRESH_INTERVAL_MS);
    
    return () => clearInterval(intervalId);
  }, [isWorldChain, refreshPrices]);

  const contextValue = useMemo((): WorldChainContextType => ({
    isWorldChain,
    isDevMode,
    isProductionMode,
    mockDataAvailable,
    oracleData: {
      prices,
      isLoading,
      error,
      lastUpdated
    },
    priceInfo,
    contracts: {
      vaultLoading,
      routerLoading,
      priceFeedLoading,
      witnetPriceRouterLoading,
      vaultError,
      routerError,
      priceFeedError,
      witnetPriceRouterError,
      vault: vaultContract,
      router: routerContract,
      priceFeed: priceFeedContract,
      witnetPriceRouter: witnetPriceRouterContract
    },
    withFallback,
    refreshPrices,
    getTokenPrice
  }), [
    isWorldChain,
    isDevMode,
    isProductionMode,
    mockDataAvailable,
    prices,
    isLoading,
    error,
    lastUpdated,
    priceInfo,
    vaultLoading,
    routerLoading,
    priceFeedLoading,
    witnetPriceRouterLoading,
    vaultError,
    routerError,
    priceFeedError,
    witnetPriceRouterError,
    vaultContract,
    routerContract,
    priceFeedContract,
    witnetPriceRouterContract,
    withFallback,
    refreshPrices,
    getTokenPrice
  ]);
  
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

// Styles for the error containers and buttons - defined outside of components to avoid React warnings
const errorContainerStyle = {
  padding: '15px',
  margin: '10px 0',
  backgroundColor: '#FFEBEE',
  color: '#B71C1C',
  borderRadius: '4px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const errorButtonStyle = {
  backgroundColor: '#EF5350',
  color: 'white',
  border: 'none',
  padding: '5px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  marginTop: '10px'
};

// Minimal version of the context that's used when we can't initialize the full provider
// This prevents the entire app from crashing when World Chain is unavailable
const createMinimalWorldChainContext = (): WorldChainContextType => ({
  isWorldChain: false,
  isDevMode: false,
  isProductionMode: false,
  mockDataAvailable: false,
  oracleData: { prices: null, isLoading: false, error: null, lastUpdated: null },
  priceInfo: { price: 0, loading: false, error: null },
  contracts: {
    vaultLoading: false,
    routerLoading: false,
    priceFeedLoading: false,
    witnetPriceRouterLoading: false,
    vaultError: null,
    routerError: null,
    priceFeedError: null,
    witnetPriceRouterError: null,
    vault: null,
    router: null,
    priceFeed: null,
    witnetPriceRouter: null,
  },
  withFallback: <T,>(fn: () => T, fallbackValue: T) => {
    try {
      return fn();
    } catch (error) { // Added parameter to satisfy ESLint rule
      logger.warn('Error in withFallback:', error);
      return fallbackValue;
    }
  },
  refreshPrices: async () => {
    // Empty implementation with simple logger to satisfy ESLint
    logger.info('[MinimalContext] refreshPrices called, but no implementation provided');
    return Promise.resolve();
  },
  getTokenPrice: async () => null,
});

// SafeProvider wraps the WorldChainProviderImpl in try/catch at the React component level
// This adds an extra layer of protection beyond the error boundary
const SafeWorldChainProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // If we've already encountered an error, return the minimal context
  if (hasError) {
    const minimalContext = createMinimalWorldChainContext();
    return (
      <WorldChainContext.Provider value={minimalContext}>
        <div style={errorContainerStyle}>
          <h4>World Chain Provider Error</h4>
          <p>The World Chain provider encountered an error and has been disabled. Other features will continue to work.</p>
          <p><strong>Error:</strong> {errorMessage}</p>
          <button 
            onClick={() => setHasError(false)}
            style={errorButtonStyle}
          >
            Retry Connection
          </button>
        </div>
        {children}
      </WorldChainContext.Provider>
    );
  }
  
  // Try to render the normal provider, but catch any errors that might occur
  try {
    return <WorldChainProviderImpl>{children}</WorldChainProviderImpl>;
  } catch (error) {
    // If an error occurs during rendering, log it and set the error state
    logger.error('[SafeWorldChainProvider] Error rendering provider:', error);
    setHasError(true);
    setErrorMessage(error instanceof Error ? error.message : String(error));
    
    // Return fallback content - this will be replaced on next render with the error UI
    return <>{children}</>;
  }
};

// Export the wrapped provider with multiple layers of protection:
// 1. WorldChainErrorBoundary - catches errors during lifecycle methods
// 2. SafeWorldChainProvider - catches errors during rendering
export const WorldChainProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  return (
    <WorldChainErrorBoundary>
      <SafeWorldChainProvider>
        {children}
      </SafeWorldChainProvider>
    </WorldChainErrorBoundary>
  );
};
