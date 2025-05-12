/**
 * RedstoneContractWrapper
 * 
 * This utility provides wrapper functions for contract interactions that require
 * RedStone oracle data for World Chain.
 */

import { WrapperBuilder } from '@redstone-finance/evm-connector';
import { ethers } from 'ethers';

import { getWorldChainConfig, shouldUseProductionMode } from 'lib/worldchain/worldChainProduction';
import { WORLD } from 'sdk/configs/chains';

// Get the appropriate config based on environment
const worldChainConfig = getWorldChainConfig();

/**
 * Wraps a contract with RedStone price feeds
 * @param contract - ethers Contract instance
 * @param dataServiceId - RedStone data service ID (default: 'redstone-main-demo')
 * @param uniqueSignersCount - Number of required unique signers (default: 1)
 * @returns Wrapped contract with RedStone functionality
 */
export function wrapContractWithRedstone<T extends ethers.Contract>(
  contract: T,
  dataServiceId = 'redstone-main-demo',
  uniqueSignersCount = 1
): T {
  // Only use RedStone wrapping on World Chain
  // and when in production mode (unless explicitly overridden)
  const isRedstoneEnabled = shouldUseProductionMode() && 
    worldChainConfig.redstone?.enabled;
  
  if (!isRedstoneEnabled) {
    // eslint-disable-next-line no-console
    console.warn('RedStone wrapping is disabled - using unwrapped contract');
    return contract;
  }
  
  try {
    // Using any type assertion for WrapperBuilder since the types may not be up to date
    // with the actual implementation
    return (WrapperBuilder as any)
      .wrapLite(contract)
      .usingDataService(dataServiceId, { uniqueSignersCount })
      .build() as T;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error wrapping contract with RedStone:', error);
    throw new Error(`Failed to wrap contract with RedStone: ${error}`);
  }
}

/**
 * Gets the appropriate price feed contract based on environment
 * @param signer - ethers Signer for transactions
 * @param chainId - Chain ID of the current network
 * @returns Price feed contract instance
 */
export async function getPriceFeedContract(
  signer: ethers.Signer,
  chainId: number
): Promise<ethers.Contract> {
  // Only use RedStone on World Chain
  if (chainId !== WORLD) {
    throw new Error('RedStone price feed is only available on World Chain');
  }
  
  // Get the price feed address from config or environment
  const priceFeedAddress = worldChainConfig.redstone?.priceFeedAddress;
  
  if (!priceFeedAddress) {
    throw new Error('RedStone price feed address not configured');
  }
  
  // Import ABI dynamically to avoid circular dependencies
  const { default: RedStonePriceFeedABI } = await import('abis/RedStonePriceFeed.json');
  
  // Create the Interface from the ABI and then create the contract instance
  const contractInterface = new ethers.Interface(RedStonePriceFeedABI);
  
  // Create the contract instance with the interface
  const contract = new ethers.Contract(
    priceFeedAddress,
    contractInterface,
    signer
  );
  
  // Return the wrapped contract
  return wrapContractWithRedstone(contract);
}

/**
 * Creates a wrapped instance of any GMX contract
 * @param contractName - Name of the contract (e.g., 'Vault', 'Router')
 * @param signer - ethers Signer for transactions
 * @param chainId - Chain ID of the current network
 * @returns Wrapped contract instance
 */
export async function getWrappedGmxContract(
  contractName: string,
  signer: ethers.Signer,
  chainId: number
): Promise<ethers.Contract> {
  if (chainId !== WORLD) {
    throw new Error(`RedStone wrapping is only available on World Chain`);
  }
  
  // Get address from the world chain config
  // The contracts property might not be defined in the TypeScript interface,
  // but it's expected to be there at runtime
  const worldConfig = worldChainConfig as any;
  const contractAddress = worldConfig.contracts?.[contractName.toLowerCase()];
  
  if (!contractAddress) {
    throw new Error(`Address for ${contractName} not found in config`);
  }
  
  // Import ABI dynamically
  const { default: contractABI } = await import(`abis/${contractName}.json`);
  
  // Create the Interface from the ABI first - required for ethers.js v6
  const contractInterface = new ethers.Interface(contractABI);
  
  // Create contract instance using the interface
  const contract = new ethers.Contract(
    contractAddress,
    contractInterface,
    signer
  );
  
  // Return wrapped contract
  return wrapContractWithRedstone(contract);
}

/**
 * List of supported tokens for price feed
 */
export const SUPPORTED_TOKENS = worldChainConfig.redstone?.trackedTokens || [];

/**
 * Check if a token is supported by RedStone price feed
 * @param symbol - Token symbol to check
 * @returns Boolean indicating if token is supported
 */
export function isTokenSupported(symbol: string): boolean {
  return SUPPORTED_TOKENS.includes(symbol.toUpperCase());
}
