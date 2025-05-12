/**
 * World Chain V1 Contract Hooks
 * Custom hooks for working with V1 contracts on World Chain
 */

import { ethers } from 'ethers';
import { useCallback } from 'react';

import { WORLD } from '../../config/chains';
import { getIsV1Supported } from '../../config/features';
import { useWorldChainV1Contracts } from '../../context/WorldChainV1Context';
import { useChainId } from '../chains';
import { WORLD_CHAIN_RPC } from './worldChainV1Contracts';

/**
 * Helper to create a read-only provider for World Chain
 * @returns JsonRpcProvider configured for World Chain
 */
export function createWorldChainReadOnlyProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(WORLD_CHAIN_RPC);
}

/**
 * Hook to check if World Chain V1 contracts are available
 * @returns Boolean indicating if V1 contracts are available
 */
export function useIsWorldChainV1Available(): boolean {
  const chainIdObj = useChainId();
  const actualChainId = typeof chainIdObj === 'number' ? chainIdObj : chainIdObj?.chainId || 0;
  
  return actualChainId === WORLD && getIsV1Supported(WORLD);
}

/**
 * Hook to access World Chain V1 Vault contract
 * @returns Vault contract instance and status data
 */
export function useWorldChainV1Vault() {
  const { vault, vaultFallback, isLoading, error } = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Returns the best available contract instance
  // If user is connected, returns the signer-connected instance
  // Otherwise returns the fallback read-only instance
  const contract = vault || vaultFallback;
  
  return {
    contract,
    isLoading,
    error,
    isAvailable: isV1Available && !!contract
  };
}

/**
 * Hook to access World Chain V1 Router contract
 * @returns Router contract instance and status data
 */
export function useWorldChainV1Router() {
  const { router, routerFallback, isLoading, error } = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Returns the best available contract instance
  const contract = router || routerFallback;
  
  return {
    contract,
    isLoading,
    error,
    isAvailable: isV1Available && !!contract
  };
}

/**
 * Hook to access World Chain V1 Price Feed contract
 * @returns VaultPriceFeed contract instance and status data
 */
export function useWorldChainV1PriceFeed() {
  const { vaultPriceFeed, vaultPriceFeedFallback, isLoading, error } = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Returns the best available contract instance
  const contract = vaultPriceFeed || vaultPriceFeedFallback;
  
  return {
    contract,
    isLoading,
    error,
    isAvailable: isV1Available && !!contract
  };
}

/**
 * Hook to access World Chain V1 Position Router contract
 * @returns PositionRouter contract instance and status data
 */
export function useWorldChainV1PositionRouter() {
  const { positionRouter, positionRouterFallback, isLoading, error } = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Returns the best available contract instance
  const contract = positionRouter || positionRouterFallback;
  
  return {
    contract,
    isLoading,
    error,
    isAvailable: isV1Available && !!contract
  };
}

/**
 * Hook to access World Chain V1 Order Book contract
 * @returns OrderBook contract instance and status data
 */
export function useWorldChainV1OrderBook() {
  const { orderBook, orderBookFallback, isLoading, error } = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Returns the best available contract instance
  const contract = orderBook || orderBookFallback;
  
  return {
    contract,
    isLoading,
    error,
    isAvailable: isV1Available && !!contract
  };
}

/**
 * Hook to access World Chain V1 Position Manager contract
 * @returns PositionManager contract instance and status data
 */
export function useWorldChainV1PositionManager() {
  const { positionManager, positionManagerFallback, isLoading, error } = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Returns the best available contract instance
  const contract = positionManager || positionManagerFallback;
  
  return {
    contract,
    isLoading,
    error,
    isAvailable: isV1Available && !!contract
  };
}

/**
 * Hook to access all World Chain V1 contracts at once
 * @returns Object containing all V1 contract instances
 */
export function useAllWorldChainV1Contracts() {
  const v1Contracts = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  const {
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
    error
  } = v1Contracts;
  
  return {
    contracts: {
      vault: vault || vaultFallback,
      router: router || routerFallback,
      vaultPriceFeed: vaultPriceFeed || vaultPriceFeedFallback,
      positionRouter: positionRouter || positionRouterFallback,
      orderBook: orderBook || orderBookFallback,
      positionManager: positionManager || positionManagerFallback
    },
    isLoading,
    error,
    isAvailable: isV1Available && !isLoading
  };
}

/**
 * Hook to get a specific World Chain V1 contract by name
 * @param contractName Name of the contract to retrieve
 * @returns Contract instance and status data
 */
export function useWorldChainV1ContractByName(contractName: string) {
  const v1Contracts = useWorldChainV1Contracts();
  const isV1Available = useIsWorldChainV1Available();
  
  // Function to get the contract by name
  const getContract = useCallback(() => {
    switch (contractName.toLowerCase()) {
      case 'vault':
        return v1Contracts.vault || v1Contracts.vaultFallback;
      case 'router':
        return v1Contracts.router || v1Contracts.routerFallback;
      case 'vaultpricefeed':
        return v1Contracts.vaultPriceFeed || v1Contracts.vaultPriceFeedFallback;
      case 'positionrouter':
        return v1Contracts.positionRouter || v1Contracts.positionRouterFallback;
      case 'orderbook':
        return v1Contracts.orderBook || v1Contracts.orderBookFallback;
      case 'positionmanager':
        return v1Contracts.positionManager || v1Contracts.positionManagerFallback;
      default:
        // Use console.warn as it's permitted by ESLint rules
        console.warn(`Unknown contract name: ${contractName}`);
        return null;
    }
  }, [contractName, v1Contracts]);
  
  return {
    contract: getContract(),
    isLoading: v1Contracts.isLoading,
    error: v1Contracts.error,
    isAvailable: isV1Available && !v1Contracts.isLoading && !!getContract()
  };
}
