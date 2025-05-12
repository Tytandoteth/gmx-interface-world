/**
 * World Chain Contract Configuration for V1
 * Contains addresses and utilities for GMX V1 contracts on World Chain
 */

import { ethers } from 'ethers';

import { WORLD } from './chains';

// Contract addresses for V1 on World Chain - using ethers.getAddress to ensure checksummed format
export const V1_CONTRACTS = {
  [WORLD]: {
    // Core contracts
    Vault: "0x6519e08ecc9b2763fbef360132a8303dc2e9cce5",
    VaultV2: "0x6519e08ecc9b2763fbef360132a8303dc2e9cce5", // Same as Vault for World Chain
    Router: "0x1958f6cba8eb87902bdc1805a2a3bd5842be645b",
    VaultPriceFeed: "0x8727d91c1174b4ab7cfd5780296aae8ef4b0e6bf",
    OrderBook: "0x8179d468ff072b8a9203a293a37ef70edca850fc",
    PositionRouter: "0x566e66c17a6dfe5b0964fa0afc85cf3cc5963daf",
    PositionManager: "0x0ac8566466e68678d2d32f625d2d3cd9e6cf088d",
    VaultReader: "0x8c3f7850f5b178e76bc2ec711523f4f4cb987eb3",
    Reader: "0x2b43c90d1b727cee1df34ce3d7f8f517ba4c4769",
    
    // Custom contracts for World Chain integration
    SimplePriceFeed: "0xa19f571b0b00a36028ce47721afa1395bb581e5d",
    
    // Contract addresses for auxiliary contracts
    USDG: "0x45096e7aA921f27590f8F19e457794EB09678141", // USDG token address
    ShortsTracker: "0x52e4419b9d33c6e0cfa6cc1490df2740b2c2b65c", // ShortsTracker contract
  }
};

/**
 * Gets a contract address for the specified chain and contract name
 * @param chainId Chain ID to get contract for
 * @param name Contract name
 * @returns Contract address string
 * @throws Error if chain or contract not supported
 */
export function getContractAddress(chainId: number, name: string): string {
  if (!V1_CONTRACTS[chainId]) {
    throw new Error(`Chain ${chainId} not supported for V1 contracts`);
  }
  
  const address = V1_CONTRACTS[chainId][name];
  if (!address) {
    throw new Error(`Contract ${name} not configured for chain ${chainId}`);
  }
  
  return address;
}

/**
 * Creates a contract instance for the specified chain, name, and library
 * @param name Contract name
 * @param chainId Chain ID
 * @param library Provider or signer
 * @param abi Contract ABI
 * @returns Ethers Contract instance
 */
export function createContract(
  name: string, 
  chainId: number,
  library: ethers.Provider | ethers.Signer,
  abi: any
): ethers.Contract {
  const address = getContractAddress(chainId, name);
  return new ethers.Contract(address, abi, library);
}

/**
 * Check if a chain has V1 contracts configured
 * @param chainId Chain ID to check
 * @returns True if V1 contracts are configured for the chain
 */
export function hasV1Contracts(chainId: number): boolean {
  return !!V1_CONTRACTS[chainId];
}

/**
 * Get all V1 contract addresses for a specific chain
 * @param chainId Chain ID
 * @returns Record of contract names to addresses, or empty object if not supported
 */
export function getV1Contracts(chainId: number): Record<string, string> {
  return V1_CONTRACTS[chainId] || {};
}
