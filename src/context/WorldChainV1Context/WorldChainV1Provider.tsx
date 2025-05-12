/**
 * World Chain V1 Context Provider
 * Provides contract instances and utilities for V1 contracts on World Chain
 */

import { ethers } from 'ethers';
import React, { createContext, useContext, useState, useEffect } from 'react';

import { WORLD } from '../../config/chains';
import { getContractAddress } from '../../config/worldChainContracts';
import { createWorldChainProvider } from '../../lib/contracts/worldChainV1Contracts';

// For MVP simplicity, we'll use basic ABIs that contain the essential functions we need
// This sidesteps the module resolution issues with importing JSON files
const BASIC_CONTRACT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Context structure
interface WorldChainV1ContextType {
  // Contract instances
  vault: ethers.Contract | null;
  router: ethers.Contract | null;
  vaultPriceFeed: ethers.Contract | null;
  positionRouter: ethers.Contract | null;
  orderBook: ethers.Contract | null;
  positionManager: ethers.Contract | null;
  
  // Fallback contracts (read-only)
  vaultFallback: ethers.Contract | null;
  routerFallback: ethers.Contract | null;
  vaultPriceFeedFallback: ethers.Contract | null;
  positionRouterFallback: ethers.Contract | null;
  orderBookFallback: ethers.Contract | null;
  positionManagerFallback: ethers.Contract | null;
  
  // Context status
  isLoading: boolean;
  isConnected: boolean;
  chainId: number | null;
  error: Error | null;
}

// Default context values
const defaultContext: WorldChainV1ContextType = {
  vault: null,
  router: null,
  vaultPriceFeed: null,
  positionRouter: null,
  orderBook: null,
  positionManager: null,
  
  vaultFallback: null,
  routerFallback: null,
  vaultPriceFeedFallback: null,
  positionRouterFallback: null,
  orderBookFallback: null,
  positionManagerFallback: null,
  
  isLoading: true,
  isConnected: false,
  chainId: null,
  error: null
};

// Create context
const WorldChainV1Context = createContext<WorldChainV1ContextType>(defaultContext);

/**
 * Hook to use the WorldChainV1 context
 */
export function useWorldChainV1Contracts(): WorldChainV1ContextType {
  const context = useContext(WorldChainV1Context);
  if (!context) {
    throw new Error('useWorldChainV1Contracts must be used within a WorldChainV1Provider');
  }
  return context;
}

/**
 * Provider component for WorldChainV1Context
 */
export const WorldChainV1Provider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // Since we can't use @web3-react/core, we'll get chainId from another source
  const [chainId, setChainId] = useState<number | null>(WORLD); // Default to WORLD for this implementation
  const [active, setActive] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Initialize contract states
  const [vault, setVault] = useState<ethers.Contract | null>(null);
  const [router, setRouter] = useState<ethers.Contract | null>(null);
  const [vaultPriceFeed, setVaultPriceFeed] = useState<ethers.Contract | null>(null);
  const [positionRouter, setPositionRouter] = useState<ethers.Contract | null>(null);
  const [orderBook, setOrderBook] = useState<ethers.Contract | null>(null);
  const [positionManager, setPositionManager] = useState<ethers.Contract | null>(null);
  
  // Initialize fallback contracts (read-only)
  const [vaultFallback, setVaultFallback] = useState<ethers.Contract | null>(null);
  const [routerFallback, setRouterFallback] = useState<ethers.Contract | null>(null);
  const [vaultPriceFeedFallback, setVaultPriceFeedFallback] = useState<ethers.Contract | null>(null);
  const [positionRouterFallback, setPositionRouterFallback] = useState<ethers.Contract | null>(null);
  const [orderBookFallback, setOrderBookFallback] = useState<ethers.Contract | null>(null);
  const [positionManagerFallback, setPositionManagerFallback] = useState<ethers.Contract | null>(null);
  
  // Initialize read-only contracts that don't require signing
  useEffect(() => {
    const initializeFallbackContracts = async () => {
      try {
        // Create a read-only provider using the QuikNode endpoint
        // Always use the preferred QuikNode endpoint per user's preference
        const provider = createWorldChainProvider();
        
        // Create contract instances with addresses from the config
        const vaultAddr = getContractAddress(WORLD, 'Vault');
        const routerAddr = getContractAddress(WORLD, 'Router');
        const vaultPriceFeedAddr = getContractAddress(WORLD, 'VaultPriceFeed');
        const positionRouterAddr = getContractAddress(WORLD, 'PositionRouter');
        const orderBookAddr = getContractAddress(WORLD, 'OrderBook');
        const positionManagerAddr = getContractAddress(WORLD, 'PositionManager');
        
        // Create contract instances with our basic ABI
        // For MVP, we're using a simplified ABI that works for basic interactions
        setVaultFallback(new ethers.Contract(vaultAddr, BASIC_CONTRACT_ABI, provider));
        setRouterFallback(new ethers.Contract(routerAddr, BASIC_CONTRACT_ABI, provider));
        setVaultPriceFeedFallback(new ethers.Contract(vaultPriceFeedAddr, BASIC_CONTRACT_ABI, provider));
        setPositionRouterFallback(new ethers.Contract(positionRouterAddr, BASIC_CONTRACT_ABI, provider));
        setOrderBookFallback(new ethers.Contract(orderBookAddr, BASIC_CONTRACT_ABI, provider));
        setPositionManagerFallback(new ethers.Contract(positionManagerAddr, BASIC_CONTRACT_ABI, provider));
        
        setIsLoading(false);
      } catch (err) {
        console.warn('Error initializing fallback contracts:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    
    if (chainId === WORLD) {
      initializeFallbackContracts();
    }
  }, [chainId]);
  
  // For the MVP implementation, we'll only handle the fallback contracts
  // No need for signer contracts in this initial version
  useEffect(() => {
    // Just clear the signer contracts for now
    setVault(null);
    setRouter(null);
    setVaultPriceFeed(null);
    setPositionRouter(null);
    setOrderBook(null);
    setPositionManager(null);
  }, [chainId]);
  
  // Check for connection errors
  useEffect(() => {
    if (chainId !== WORLD) {
      setError(new Error('Not connected to World Chain network'));
    } else {
      setError(null);
    }
  }, [chainId]);
  
  // Context value
  const contextValue: WorldChainV1ContextType = {
    vault,
    router,
    vaultPriceFeed,
    positionRouter,
    orderBook,
    positionManager,
    
    vaultFallback,
    routerFallback,
    vaultPriceFeedFallback,
    positionRouterFallback,
    orderBookFallback,
    positionManagerFallback,
    
    isLoading,
    isConnected: chainId === WORLD && active,
    chainId: chainId || null,
    error
  };
  
  return (
    <WorldChainV1Context.Provider value={contextValue}>
      {children}
    </WorldChainV1Context.Provider>
  );
};

export default WorldChainV1Provider;
