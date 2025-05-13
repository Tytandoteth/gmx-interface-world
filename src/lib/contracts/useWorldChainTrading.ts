/**
 * World Chain Trading Hooks
 * Provides specialized hooks for trading operations on World Chain
 */

import { ethers } from 'ethers';
import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

import { WORLD } from '../../config/chains';
import { getContractAddress } from '../../config/worldChainContracts';
import { useChainId } from '../chains';
import { Logger } from '../logger';
import { 
  useWorldChainVault, 
  useWorldChainRouter, 
  useWorldChainPositionRouter 
} from './worldChainV1Contracts';

// Import ABIs dynamically to avoid circular dependencies
import RouterAbi from '../../abis/Router.json';
// Note: Using Router ABI as a fallback since PositionRouter has similar interface
import VaultAbi from '../../abis/Vault.json';

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
}

/**
 * Hook for swap operations on World Chain
 * Provides functions to execute swaps with proper error handling
 */
export function useWorldChainSwap() {
  const { chainId } = useChainId();
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
  const executeSwap = useCallback(async (
    params: SwapParams
  ): Promise<TradingResult> => {
    if (!signer || chainId !== WORLD) {
      return { 
        success: false, 
        error: new Error('Invalid signer or chain') 
      };
    }
    
    if (!router) {
      return { 
        success: false, 
        error: new Error('Router not initialized') 
      };
    }
    
    try {
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
      Logger.error(`Swap failed: ${error.message}`);
      setError(error);
      
      return {
        success: false,
        error
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
  const { chainId } = useChainId();
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
    if (!signer || chainId !== WORLD) {
      return { 
        success: false, 
        error: new Error('Invalid signer or chain') 
      };
    }
    
    if (!positionRouter) {
      return { 
        success: false, 
        error: new Error('PositionRouter not initialized') 
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
      const error = err instanceof Error ? err : new Error(String(err));
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
  
  // Fetch prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        // Use Oracle Keeper URL from environment
        const oracleKeeperUrl = import.meta.env.VITE_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev';
        
        // Fetch direct prices for real-time data
        const response = await fetch(`${oracleKeeperUrl}/direct-prices`);
        if (!response.ok) {
          throw new Error(`Oracle Keeper error: ${response.status}`);
        }
        
        const data = await response.json();
        setPrices(data.prices || {});
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Failed to fetch prices: ${error.message}`);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrices();
    // Refresh prices every 15 seconds
    const interval = setInterval(fetchPrices, 15000);
    
    return () => clearInterval(interval);
  }, []);
  
  /**
   * Gets the price of a token in USD
   */
  const getTokenPrice = useCallback((symbol: string): number | undefined => {
    return prices[symbol.toUpperCase()];
  }, [prices]);
  
  return {
    prices,
    getTokenPrice,
    isLoading,
    error
  };
}
