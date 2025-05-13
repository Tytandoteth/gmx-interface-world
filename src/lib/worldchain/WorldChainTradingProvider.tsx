import { ethers } from 'ethers';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

import { WORLD } from '../../config/chains';
import { useChainId } from '../chains';
import { Logger } from '../logger';
import { 
  createWorldChainProvider, 
  getWorldChainVaultContract,
  getWorldChainRouterContract,
  getWorldChainPositionRouterContract,
  fetchWorldChainPrices,
  callWorldChainContract,
  areWorldChainContractsConfigured
} from './worldChainContractUtils';

// Use the imported Logger for consistent logging

// Interface for trading context
interface WorldChainTradingContextType {
  // Contract instances
  vaultContract: ethers.Contract | null;
  routerContract: ethers.Contract | null;
  positionRouterContract: ethers.Contract | null;
  
  // Contract status
  areContractsConfigured: boolean;
  isContractsLoading: boolean;
  contractsError: Error | null;
  
  // Price data
  prices: Record<string, number>;
  isPricesLoading: boolean;
  pricesError: Error | null;
  refreshPrices: () => Promise<void>;
  
  // Trading functions
  swap: (
    fromToken: string, 
    toToken: string, 
    amountIn: bigint, 
    minOut: bigint
  ) => Promise<string | null>;
  
  increasePosition: (
    path: string[],
    indexToken: string,
    amountIn: bigint,
    minOut: bigint,
    sizeDelta: bigint,
    isLong: boolean,
    acceptablePrice: bigint,
    executionFee: bigint
  ) => Promise<string | null>;
  
  // Utility functions
  getMinExecutionFee: () => Promise<bigint>;
}

// Default context value
const defaultContextValue: WorldChainTradingContextType = {
  vaultContract: null,
  routerContract: null,
  positionRouterContract: null,
  
  areContractsConfigured: false,
  isContractsLoading: true,
  contractsError: null,
  
  prices: {},
  isPricesLoading: true,
  pricesError: null,
  refreshPrices: async () => {
    // This method will be implemented below
    // void return to satisfy the Promise<void> type
  },
  
  swap: async () => null,
  increasePosition: async () => null,
  getMinExecutionFee: async () => 300000000000000n // Default 0.0003 ETH
};

// Create the context
const WorldChainTradingContext = createContext<WorldChainTradingContextType>(defaultContextValue);

// Hook to use the context
export const useWorldChainTrading = (): WorldChainTradingContextType => {
  const context = useContext(WorldChainTradingContext);
  if (!context) {
    throw new Error('useWorldChainTrading must be used within a WorldChainTradingProvider');
  }
  return context;
};

// Provider props interface
interface WorldChainTradingProviderProps {
  children: React.ReactNode;
}

// Provider component
export const WorldChainTradingProvider: React.FC<WorldChainTradingProviderProps> = ({ children }) => {
  const { chainId } = useChainId();
  const { address, connector } = useAccount();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  
  // Get signer when account changes
  useEffect(() => {
    const getSigner = async () => {
      if (address && connector) {
        try {
          const provider = await connector.getProvider();
          // Convert unknown provider to appropriate type
          const ethersProvider = new ethers.BrowserProvider(provider as ethers.Eip1193Provider);
          const walletSigner = await ethersProvider.getSigner();
          setSigner(walletSigner);
        } catch (error) {
          Logger.error("Failed to get signer", error);
          setSigner(null);
        }
      } else {
        setSigner(null);
      }
    };
    
    getSigner();
  }, [address, connector]);
  
  // State for contract instances
  const [vaultContract, setVaultContract] = useState<ethers.Contract | null>(null);
  const [routerContract, setRouterContract] = useState<ethers.Contract | null>(null);
  const [positionRouterContract, setPositionRouterContract] = useState<ethers.Contract | null>(null);
  
  // State for contract status
  const [isContractsLoading, setIsContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<Error | null>(null);
  
  // State for price data
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isPricesLoading, setIsPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<Error | null>(null);
  
  // Initialize contracts when signer changes
  useEffect(() => {
    const initializeContracts = async (): Promise<void> => {
      if (chainId !== WORLD) {
        setIsContractsLoading(false);
        return;
      }
      
      try {
        setIsContractsLoading(true);
        setContractsError(null);
        
        // Check if contracts are configured
        const configured = areWorldChainContractsConfigured();
        if (!configured) {
          throw new Error('World Chain contracts not properly configured');
        }
        
        // Create provider for read-only operations if no signer
        const signerOrProvider = signer || createWorldChainProvider();
        
        // Create contract instances
        const vault = getWorldChainVaultContract(signerOrProvider);
        const router = getWorldChainRouterContract(signerOrProvider);
        const positionRouter = getWorldChainPositionRouterContract(signerOrProvider);
        
        // Update state
        setVaultContract(vault);
        setRouterContract(router);
        setPositionRouterContract(positionRouter);
        
        Logger.info('World Chain contracts initialized successfully');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Failed to initialize contracts: ${error.message}`);
        setContractsError(error);
      } finally {
        setIsContractsLoading(false);
      }
    };
    
    initializeContracts();
  }, [chainId, signer]);
  
  // Fetch price data on mount and periodically
  useEffect(() => {
    const fetchPriceData = async (): Promise<void> => {
      if (chainId !== WORLD) {
        setIsPricesLoading(false);
        return;
      }
      
      try {
        setIsPricesLoading(true);
        setPricesError(null);
        
        const priceData = await fetchWorldChainPrices();
        if (priceData) {
          setPrices(priceData);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Failed to fetch prices: ${error.message}`);
        setPricesError(error);
      } finally {
        setIsPricesLoading(false);
      }
    };
    
    // Fetch initial data
    fetchPriceData();
    
    // Set up interval for refreshing price data
    const intervalId = setInterval(fetchPriceData, 15000); // 15 seconds
    
    return () => clearInterval(intervalId);
  }, [chainId]);
  
  // Function to manually refresh prices
  const refreshPrices = useCallback(async (): Promise<void> => {
    try {
      setPricesError(null);
      
      const priceData = await fetchWorldChainPrices();
      if (priceData) {
        setPrices(priceData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Failed to refresh prices: ${error.message}`);
      setPricesError(error);
    }
  }, []);
  
  // Swap function
  const swap = useCallback(async (
    fromToken: string,
    toToken: string,
    amountIn: bigint,
    minOut: bigint
  ): Promise<string | null> => {
    if (!routerContract || !signer) {
      Logger.error('Router contract or signer not available');
      return null;
    }
    
    try {
      // Determine swap method based on tokens
      let method = 'swap';
      let params: any[] = [[fromToken, toToken], amountIn, minOut, signer.getAddress()];
      let value = 0n;
      
      if (fromToken === ethers.ZeroAddress) {
        method = 'swapETHToTokens';
        params = [[toToken], minOut, signer.getAddress()];
        value = amountIn;
      } else if (toToken === ethers.ZeroAddress) {
        method = 'swapTokensToETH';
        params = [[fromToken], amountIn, minOut, signer.getAddress()];
      }
      
      // Call the contract
      const tx = await callWorldChainContract(
        routerContract,
        method,
        params,
        { value }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      Logger.info(`Swap executed successfully. Hash: ${receipt?.hash || tx.hash}`);
      return receipt?.hash || tx.hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Swap failed: ${error.message}`);
      throw error;
    }
  }, [routerContract, signer]);
  
  // Increase position function
  const increasePosition = useCallback(async (
    path: string[],
    indexToken: string,
    amountIn: bigint,
    minOut: bigint,
    sizeDelta: bigint,
    isLong: boolean,
    acceptablePrice: bigint,
    executionFee: bigint
  ): Promise<string | null> => {
    if (!positionRouterContract || !signer) {
      Logger.error('PositionRouter contract or signer not available');
      return null;
    }
    
    try {
      // Get referral code (empty for now)
      const referralCode = ethers.ZeroHash;
      
      // Determine method based on tokens
      const isETHIn = path[0] === ethers.ZeroAddress;
      let method = 'createIncreasePosition';
      let params: any[] = [
        path,
        indexToken,
        amountIn,
        minOut,
        sizeDelta,
        isLong,
        acceptablePrice,
        executionFee,
        referralCode,
        ethers.ZeroAddress // callback target
      ];
      let value = executionFee;
      
      if (isETHIn) {
        method = 'createIncreasePositionETH';
        params = [
          path.slice(1), // Remove ETH from path
          indexToken,
          minOut,
          sizeDelta,
          isLong,
          acceptablePrice,
          executionFee,
          referralCode,
          ethers.ZeroAddress // callback target
        ];
        value = amountIn + executionFee;
      }
      
      // Call the contract
      const tx = await callWorldChainContract(
        positionRouterContract,
        method,
        params,
        { value }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      Logger.info(`Position increase executed successfully. Hash: ${receipt?.hash || tx.hash}`);
      return receipt?.hash || tx.hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Position increase failed: ${error.message}`);
      throw error;
    }
  }, [positionRouterContract, signer]);
  
  // Get minimum execution fee
  const getMinExecutionFee = useCallback(async (): Promise<bigint> => {
    if (!positionRouterContract) {
      Logger.warn('PositionRouter contract not available, using default execution fee');
      return 300000000000000n; // Default 0.0003 ETH
    }
    
    try {
      const fee = await positionRouterContract.minExecutionFee();
      Logger.info(`Min execution fee: ${fee}`);
      return fee;
    } catch (err) {
      Logger.error('Error getting min execution fee, using default', err);
      return 300000000000000n; // Default 0.0003 ETH
    }
  }, [positionRouterContract]);
  
  // Context value setup is moved to useMemo below
  
  // Use individual props for useMemo instead of the contextValue object to avoid lint warnings
  const memoizedValue = React.useMemo(() => ({
    vaultContract,
    routerContract,
    positionRouterContract,
    areContractsConfigured: areWorldChainContractsConfigured(),
    isContractsLoading,
    contractsError,
    prices,
    isPricesLoading,
    pricesError,
    refreshPrices,
    swap,
    increasePosition,
    getMinExecutionFee
  }), [
    vaultContract, routerContract, positionRouterContract,
    isContractsLoading, contractsError, prices, isPricesLoading, pricesError,
    refreshPrices, swap, increasePosition, getMinExecutionFee
  ]);
  
  return (
    <WorldChainTradingContext.Provider value={memoizedValue}>
      {children}
    </WorldChainTradingContext.Provider>
  );
};

export default WorldChainTradingProvider;
