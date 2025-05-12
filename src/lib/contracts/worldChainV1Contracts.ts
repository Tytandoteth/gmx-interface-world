/**
 * World Chain V1 Contracts Utilities
 * Provides contract hooks and utilities for V1 contracts on World Chain
 */

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { getContractAddress } from '../../config/worldChainContracts';
import { WORLD } from '../../config/chains';

// Basic contract interfaces for ethers v6 compatibility
const BASIC_CONTRACT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// The QuikNode endpoint should always be used as the primary connection
export const WORLD_CHAIN_RPC = 'https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/';

/**
 * Creates a read-only provider for World Chain
 * Always uses the preferred QuikNode endpoint
 */
export function createWorldChainProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(WORLD_CHAIN_RPC);
}

/**
 * Wrapper for contract creation to handle errors
 * @param address Contract address
 * @param provider Provider instance
 * @returns Contract instance or null if error
 */
export function createContractSafe(
  address: string,
  provider: ethers.JsonRpcProvider
): ethers.Contract | null {
  try {
    return new ethers.Contract(address, BASIC_CONTRACT_ABI, provider);
  } catch (error) {
    console.warn(`Error creating contract at ${address}:`, error);
    return null;
  }
}

/**
 * Hook to use the Vault contract for World Chain
 */
export function useWorldChainVault() {
  const [vault, setVault] = useState<ethers.Contract | null>(null);
  const [vaultFallback, setVaultFallback] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize read-only provider on mount
  useEffect(() => {
    const initializeVault = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get contract address and create read-only provider
        const vaultAddr = getContractAddress(WORLD, 'Vault');
        const provider = createWorldChainProvider();
        
        // Create fallback (read-only) contract
        const fallbackContract = createContractSafe(vaultAddr, provider);
        setVaultFallback(fallbackContract);
        
        setIsLoading(false);
      } catch (err) {
        console.warn('Error initializing Vault contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initializeVault();
  }, []);

  return { vault, vaultFallback, isLoading, error };
}

/**
 * Hook to use the Router contract for World Chain
 */
export function useWorldChainRouter() {
  const [router, setRouter] = useState<ethers.Contract | null>(null);
  const [routerFallback, setRouterFallback] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize read-only provider on mount
  useEffect(() => {
    const initializeRouter = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get contract address and create read-only provider
        const routerAddr = getContractAddress(WORLD, 'Router');
        const provider = createWorldChainProvider();
        
        // Create fallback (read-only) contract with simplified ABI
        const fallbackContract = createContractSafe(routerAddr, provider);
        setRouterFallback(fallbackContract);
        
        setIsLoading(false);
      } catch (err) {
        console.warn('Error initializing Router contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initializeRouter();
  }, []);

  return { router, routerFallback, isLoading, error };
}

/**
 * Hook to use the VaultPriceFeed contract for World Chain
 */
export function useWorldChainVaultPriceFeed() {
  const [vaultPriceFeed, setVaultPriceFeed] = useState<ethers.Contract | null>(null);
  const [vaultPriceFeedFallback, setVaultPriceFeedFallback] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize read-only provider on mount
  useEffect(() => {
    const initializeVaultPriceFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get contract address and create read-only provider
        const priceFeedAddr = getContractAddress(WORLD, 'VaultPriceFeed');
        const provider = createWorldChainProvider();
        
        // Create fallback (read-only) contract with simplified ABI
        const fallbackContract = createContractSafe(priceFeedAddr, provider);
        setVaultPriceFeedFallback(fallbackContract);
        
        setIsLoading(false);
      } catch (err) {
        console.warn('Error initializing VaultPriceFeed contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initializeVaultPriceFeed();
  }, []);

  return { vaultPriceFeed, vaultPriceFeedFallback, isLoading, error };
}

/**
 * Hook to use the PositionRouter contract for World Chain
 */
export function useWorldChainPositionRouter() {
  const [positionRouter, setPositionRouter] = useState<ethers.Contract | null>(null);
  const [positionRouterFallback, setPositionRouterFallback] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize read-only provider on mount
  useEffect(() => {
    const initializePositionRouter = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get contract address and create read-only provider
        const positionRouterAddr = getContractAddress(WORLD, 'PositionRouter');
        const provider = createWorldChainProvider();
        
        // Create fallback (read-only) contract with simplified ABI
        const fallbackContract = createContractSafe(positionRouterAddr, provider);
        setPositionRouterFallback(fallbackContract);
        
        setIsLoading(false);
      } catch (err) {
        console.warn('Error initializing PositionRouter contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initializePositionRouter();
  }, []);

  return { positionRouter, positionRouterFallback, isLoading, error };
}

/**
 * Hook to use any World Chain V1 contract with appropriate fallbacks
 * @param contractName Name of the contract from config
 */
export function useWorldChainContract(contractName: string) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [contractFallback, setContractFallback] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize contracts
  useEffect(() => {
    const initializeContract = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get contract address
        const contractAddr = getContractAddress(WORLD, contractName);
        if (!contractAddr) {
          throw new Error(`Contract ${contractName} address not found`);
        }

        // Create read-only provider
        const provider = createWorldChainProvider();
        
        // Create fallback (read-only) contract with simplified ABI
        const fallbackContract = createContractSafe(contractAddr, provider);
        setContractFallback(fallbackContract);
        
        setIsLoading(false);
      } catch (err) {
        console.warn(`Error initializing ${contractName} contract:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initializeContract();
  }, [contractName]);

  return { contract, contractFallback, isLoading, error };
}
