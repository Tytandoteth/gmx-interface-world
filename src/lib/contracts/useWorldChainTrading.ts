/**
 * World Chain Trading Hooks
 * Provides specialized hooks for trading operations on World Chain
 */

import { ethers } from 'ethers';
import { useEffect, useState, useCallback } from 'react';
import { useChainId, useAccount, useConnect } from 'wagmi';
import { BigNumber } from 'ethers';

import { WORLD } from '../../config/chains';
import { useWorldChainRouter, useWorldChainVault, useWorldChainPositionRouter } from './worldChainV1Contracts';
import { usePrices } from '../prices/usePrices';
import { Logger } from '../logger';

import { NetworkError, NetworkErrorCode } from '../errors/networkErrors';

// Configure constants for the module

// Interface for swap parameters
export interface SwapParams {
  path: string[];
  amountIn: bigint;
  minOut: bigint;
  referralCode?: string;
}

// Interface for position parameters
export interface PositionParams {
  path: string[];
  indexToken: string;
  amountIn: bigint;
  minOut: bigint;
  sizeDelta: bigint;
  isLong: boolean;
  acceptablePrice: bigint;
  executionFee: bigint;
  referralCode?: string;
}

// Result interface for trading functions
export interface TradingResult {
  success: boolean;
  hash?: string;
  error?: Error;
  errorCode?: 'USER_DENIED' | 'SWAP_FAILED' | 'POSITION_FAILED' | 'INVALID_PARAMS';
}

/**
 * Hook for swap operations on World Chain
 * Provides functions to execute swaps with proper error handling
 */
export function useWorldChainSwap() {
  const chainId = useChainId();
  const { address, connector } = useAccount();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  
  // Get signer when account changes
  useEffect(() => {
    const getSigner = async () => {
      if (address && connector) {
        try {
          const provider = await connector.getProvider();
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
  const { router, routerFallback, isLoading, error: routerError } = useWorldChainRouter();
  
  const [isSwapping, setIsSwapping] = useState(false);
  const [lastTx, setLastTx] = useState<ethers.TransactionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Reset errors when chain or signer changes
  useEffect(() => {
    setError(null);
  }, [chainId, signer]);
  
  /**
   * Execute a token swap on World Chain
   */
  const executeSwap = useCallback(async (params: SwapParams): Promise<TradingResult> => {
    try {
      // Check for correct network
      if (chainId !== WORLD) {
        return { 
          success: false, 
          error: new NetworkError(
            'Please connect to World Chain', 
            NetworkErrorCode.WRONG_NETWORK
          )
        };
      }

      // Check for wallet connection
      if (!signer) {
        return { 
          success: false, 
          error: new NetworkError(
            'Please connect your wallet', 
            NetworkErrorCode.NO_WALLET
          ) 
        };
      }

      // Check contract initialization
      if (!router) {
        return { 
          success: false, 
          error: new NetworkError(
            'Router contract not initialized', 
            NetworkErrorCode.CONTRACT_UNAVAILABLE
          ) 
        };
      }

      setIsSwapping(true);
      setError(null);
      
      Logger.info(`Executing swap with: ${JSON.stringify({
        path: params.path,
        amountIn: params.amountIn.toString(),
        minOut: params.minOut.toString()
      })}`);
      
      // Determine if we need ETH special handling
      const isETHIn = params.path[0] === ethers.ZeroAddress;
      const isETHOut = params.path[params.path.length - 1] === ethers.ZeroAddress;
      
      let method = 'swap';
      let txParams: any[] = [params.path, params.amountIn, params.minOut, params.referralCode || ethers.ZeroHash];
      let value = 0n;
      
      if (isETHIn) {
        method = 'swapETHToTokens';
        txParams = [params.path.slice(1), params.minOut, params.referralCode || ethers.ZeroHash];
        value = params.amountIn;
      } else if (isETHOut) {
        method = 'swapTokensToETH';
        txParams = [params.path.slice(0, -1), params.amountIn, params.minOut, params.referralCode || ethers.ZeroHash];
      }
      
      // Execute transaction
      const tx = await router[method](...txParams, { value });
      setLastTx(tx);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      Logger.info(`Swap successful. Hash: ${receipt.hash}`);
      
      return {
        success: true,
        hash: receipt.hash
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Swap failed: ${error.message}`, {
        path: params.path,
        amountIn: params.amountIn.toString(),
        minOut: params.minOut.toString(),
        error
      });
      setError(error);
      
      return {
        success: false,
        error,
        errorCode: error.message.includes('denied') ? 'USER_DENIED' : 'SWAP_FAILED'
      };
    } finally {
      setIsSwapping(false);
    }
  }, [chainId, router, signer]);
  
  return {
    executeSwap,
    isSwapping,
    lastTx,
    isLoading,
    error: error || routerError
  };
}

/**
 * Hook for position operations on World Chain
 * Provides functions to open, close and manage positions
 */
export function useWorldChainPosition() {
  const chainId = useChainId();
  const { address, connector } = useAccount();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  
  // Get signer when account changes
  useEffect(() => {
    const getSigner = async () => {
      if (address && connector) {
        try {
          const provider = await connector.getProvider();
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
  const { 
    positionRouter, 
    positionRouterFallback, 
    isLoading, 
    error: positionRouterError 
  } = useWorldChainPositionRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTx, setLastTx] = useState<ethers.TransactionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Reset errors when chain or signer changes
  useEffect(() => {
    setError(null);
  }, [chainId, signer]);
  
  /**
   * Open or increase a position on World Chain
   */
  const increasePosition = useCallback(async (
    params: PositionParams
  ): Promise<TradingResult> => {
    // Check for correct network
    if (chainId !== WORLD) {
      return { 
        success: false, 
        error: new NetworkError(
          'Please connect to World Chain', 
          NetworkErrorCode.WRONG_NETWORK
        )
      };
    }

    // Check for wallet connection
    if (!signer) {
      return { 
        success: false, 
        error: new NetworkError(
          'Please connect your wallet', 
          NetworkErrorCode.NO_WALLET
        ) 
      };
    }

    // Check contract initialization
    if (!positionRouter) {
      return { 
        success: false, 
        error: new NetworkError(
          'PositionRouter contract not initialized', 
          NetworkErrorCode.CONTRACT_UNAVAILABLE
        ) 
      };
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      Logger.info(`Increasing position with: ${JSON.stringify({
        path: params.path,
        indexToken: params.indexToken,
        amountIn: params.amountIn.toString(),
        sizeDelta: params.sizeDelta.toString(),
        isLong: params.isLong
      })}`);
      
      // Determine if ETH is being used
      const isETHIn = params.path[0] === ethers.ZeroAddress;
      
      let method = 'createIncreasePosition';
      let txParams: any[] = [
        params.path,
        params.indexToken,
        params.amountIn,
        params.minOut,
        params.sizeDelta,
        params.isLong,
        params.acceptablePrice,
        params.executionFee,
        params.referralCode || ethers.ZeroHash,
        ethers.ZeroAddress // callbackTarget
      ];
      let value = params.executionFee;
      
      if (isETHIn) {
        method = 'createIncreasePositionETH';
        txParams = [
          params.path.slice(1), // Remove ETH from path
          params.indexToken,
          params.minOut,
          params.sizeDelta,
          params.isLong,
          params.acceptablePrice,
          params.executionFee,
          params.referralCode || ethers.ZeroHash,
          ethers.ZeroAddress // callbackTarget
        ];
        value = params.amountIn + params.executionFee;
      }
      
      // Execute transaction
      const tx = await positionRouter[method](...txParams, { value });
      setLastTx(tx);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      Logger.info(`Position increase successful. Hash: ${receipt.hash}`);
      
      return {
        success: true,
        hash: receipt.hash
      };
    } catch (err) {
      // Create appropriate error type based on the error
      let error: Error;
      
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          error = new NetworkError(
            'Transaction was rejected by user', 
            NetworkErrorCode.TX_REJECTED
          );
        } else if (err.message.includes('insufficient funds')) {
          error = new NetworkError(
            'Insufficient funds for transaction', 
            NetworkErrorCode.TX_FAILED
          );
        } else if (err.message.includes('execution reverted')) {
          error = new NetworkError(
            'Transaction execution failed', 
            NetworkErrorCode.EXECUTION_REVERTED
          );
        } else {
          error = err;
        }
      } else {
        error = new Error(String(err));
      }
      
      Logger.error(`Position increase failed: ${error.message}`);
      setError(error);
      
      return {
        success: false,
        error
      };
    } finally {
      setIsProcessing(false);
    }
  }, [chainId, positionRouter, signer]);
  
  /**
   * Gets the minimum execution fee for position operations
   */
  const getMinExecutionFee = useCallback(async (): Promise<bigint> => {
    if (!positionRouter) {
      Logger.warn('PositionRouter contract not available, using default execution fee');
      return 300000000000000n; // Default 0.0003 ETH
    }
    
    try {
      const contract = positionRouter || positionRouterFallback;
      if (!contract) {
        Logger.warn('No contract available for fetching min execution fee');
        return 300000000000000n; // Default 0.0003 ETH
      }
      
      const fee = await contract.minExecutionFee();
      return fee;
    } catch (error) {
      Logger.error('Error getting min execution fee:', error);
      return 300000000000000n; // Fallback value
    }
  }, [positionRouter, positionRouterFallback]);
  
  return {
    increasePosition,
    getMinExecutionFee,
    isProcessing,
    lastTx,
    isLoading,
    error: error || positionRouterError
  };
}

/**
 * Hook for getting price data from Oracle Keeper
 * Provides functions to get token prices for trading
 */
export function useWorldChainPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        const response = await fetchOracleKeeperPrices();
        if (isMounted && response && response.prices) {
          setPrices(response.prices || {});
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          // Use warning instead of console.error to follow ESLint rules
          console.warn('Error fetching token prices:', err);
          setError(err instanceof Error ? err : new Error('Unknown error fetching prices'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPrices();
    
    // Refresh prices every 15 seconds
    const interval = setInterval(fetchPrices, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  
  /**
   * Gets the price of a token in USD with safety checks
   * @param symbol The token symbol to get price for
   * @param fallbackPrice Optional fallback price if token price not found
   * @returns The token price in USD or fallback/undefined
   */
  const getTokenPrice = useCallback((symbol: string, fallbackPrice?: number): number | undefined => {
    if (!symbol || typeof symbol !== 'string') {
      return fallbackPrice;
    }
    
    const uppercaseSymbol = symbol.toUpperCase();
    return prices && prices[uppercaseSymbol] !== undefined ? 
      prices[uppercaseSymbol] : 
      fallbackPrice;
  }, [prices]);
  
  /**
   * Checks if a price is available for a given token symbol
   * @param symbol The token symbol to check
   * @returns True if the price is available, false otherwise
   */
  const isPriceAvailable = useCallback((symbol: string): boolean => {
    if (!symbol || typeof symbol !== 'string') {
      return false;
    }
    
    const uppercaseSymbol = symbol.toUpperCase();
    return Boolean(prices && prices[uppercaseSymbol] !== undefined);
  }, [prices]);
  
  return {
    prices,
    getTokenPrice,
    isLoading,
    error,
    isPriceAvailable
  };
}

/**
 * Combined hook for World Chain trading operations
 * Provides a unified interface for all trading functions
 */
export const useWorldChainTrading = () => {
  // Get the chain ID to check for the correct network
  const chainId = useChainId();
  const isCorrectNetwork = chainId === WORLD;

  // Function to request network switch to World Chain
  const switchToWorldChain = useCallback(() => {
    if (window.ethereum && chainId !== WORLD) {
      window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${WORLD.toString(16)}` }],
      }).catch((error) => {
        Logger.error('Failed to switch to World Chain:', error);
      });
    }
  }, [chainId]);
  
  const { 
    executeSwap: swapFn, 
    isSwapping, 
    lastTx: swapLastTx, 
    error: swapError,
    isLoading: isSwapLoading
  } = useWorldChainSwap();
  
  const {
    increasePosition: positionFn,
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
    error: pricesError,
    isPriceAvailable
  } = useWorldChainPrices();
  
  const isLoading = isSwapLoading || isPositionLoading || isPricesLoading;

  // Return all trading functionality
  return {
    // Swap operations
    executeSwap: swapFn,
    isSwapping,
    swapLastTx,
    swapError,
    
    // Position operations
    increasePosition: positionFn,
    getMinExecutionFee,
    isProcessingPosition,
    positionLastTx,
    positionError,
    
    // Price data
    prices,
    getTokenPrice,
    isPricesLoading,
    pricesError,
    isPriceAvailable,
    
    // Network state
    isCorrectNetwork,
    requiredChainId: WORLD,
    switchToWorldChain,
    
    // Loading state
    isLoading
  };
};
