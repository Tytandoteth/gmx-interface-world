/**
 * World Chain Contract Utilities
 * Provides direct access to World Chain contracts using the latest address configurations
 */

import { ethers } from 'ethers';

import { abis } from "sdk/abis";
import { WORLD } from '../../config/chains';
import { Logger } from '../logger';

import { getContractAddress, getOracleKeeperUrl as fetchOracleKeeperUrl } from './environmentUtils';
import { getWorldChainProvider } from './providers';

// Create a simple logger interface
const logger = {
  error: (...args: any[]) => Logger.error('[worldChainContractUtils]', ...args),
  warn: (...args: any[]) => Logger.warn('[worldChainContractUtils]', ...args),
  info: (...args: any[]) => Logger.info('[worldChainContractUtils]', ...args),
  debug: (...args: any[]) => Logger.debug('[worldChainContractUtils]', ...args),
};

// Get contract addresses using standardized environment utilities
const getVaultAddress = (): string => 
  getContractAddress('vault', '0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5', true);

const getRouterAddress = (): string => 
  getContractAddress('router', '0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b', true);

const getPositionRouterAddress = (): string => 
  getContractAddress('positionRouter', '0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF', true);

const getPositionManagerAddress = (): string => 
  getContractAddress('positionManager', '0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D', true);

// Use the standardized utility for Oracle Keeper URL
const getOracleKeeperUrl = (): string => {
  return fetchOracleKeeperUrl();
};

/**
 * Create a provider for World Chain
 * Uses the standardized provider from providers.ts
 * @returns Ethers provider instance
 */
export function createWorldChainProvider(): ethers.JsonRpcProvider {
  // Use the standardized provider from providers.ts
  logger.info('Creating World Chain provider using standard implementation');
  return getWorldChainProvider();
}

/**
 * Get the Vault contract
 * @param signerOrProvider Signer or provider to use
 * @returns Contract instance
 */
export function getWorldChainVaultContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  const vaultAddress = getVaultAddress();
  logger.info(`Creating Vault contract at ${vaultAddress}`);
  return new ethers.Contract(vaultAddress, abis.Vault, signerOrProvider);
}

/**
 * Get the Router contract
 * @param signerOrProvider Signer or provider to use
 * @returns Contract instance
 */
export function getWorldChainRouterContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  const routerAddress = getRouterAddress();
  logger.info(`Creating Router contract at ${routerAddress}`);
  return new ethers.Contract(routerAddress, abis.Router, signerOrProvider);
}

/**
 * Get the Position Router contract
 * @param signerOrProvider Signer or provider to use
 * @returns Contract instance
 */
export function getWorldChainPositionRouterContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  const positionRouterAddress = getPositionRouterAddress();
  logger.info(`Creating Position Router contract at ${positionRouterAddress}`);
  return new ethers.Contract(positionRouterAddress, abis.PositionRouter, signerOrProvider);
}

/**
 * Get the Position Manager contract
 * @param signerOrProvider Signer or provider to use
 * @returns Contract instance
 */
export function getWorldChainPositionManagerContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  const positionManagerAddress = getPositionManagerAddress();
  logger.info(`Creating Position Manager contract at ${positionManagerAddress}`);
  return new ethers.Contract(positionManagerAddress, abis.PositionManager, signerOrProvider);
}

/**
 * Fetch prices from Oracle Keeper
 * @returns Promise with token prices or null if error
 */
export async function fetchWorldChainPrices(): Promise<Record<string, number> | null> {
  try {
    const oracleKeeperUrl = getOracleKeeperUrl();
    logger.info(`Fetching prices from Oracle Keeper: ${oracleKeeperUrl}`);
    
    const response = await fetch(`${oracleKeeperUrl}/direct-prices`);
    if (!response.ok) {
      throw new Error(`Oracle Keeper error: ${response.status}`);
    }
    
    const data = await response.json();
    logger.info(`Successfully fetched prices for ${Object.keys(data.prices).length} tokens`);
    return data.prices || {};
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Failed to fetch prices: ${error.message}`);
    return null;
  }
}

/**
 * Call a contract method with proper error handling
 * @param contract Contract instance
 * @param method Method name
 * @param params Method parameters
 * @param options Options including value to send
 * @returns Promise with transaction response
 */
export async function callWorldChainContract(
  contract: ethers.Contract,
  method: string,
  params: any[],
  options: { value?: bigint } = {}
): Promise<ethers.TransactionResponse> {
  try {
    logger.info(`Calling ${method} on contract ${contract.target}`);
    return await contract[method](...params, options);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Contract call failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a contract address is configured
 * @param address Contract address to check
 * @returns True if the address is non-empty and not a placeholder
 */
export function isContractAddressConfigured(address: string): boolean {
  return address !== '' && !address.includes('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
}

/**
 * Check if all required contracts are configured
 * @returns True if all contract addresses are properly configured
 */
export function areWorldChainContractsConfigured(): boolean {
  return (
    isContractAddressConfigured(getVaultAddress()) &&
    isContractAddressConfigured(getRouterAddress()) &&
    isContractAddressConfigured(getPositionRouterAddress()) &&
    isContractAddressConfigured(getPositionManagerAddress())
  );
}

/**
 * Get the URL for the Oracle Keeper debug UI
 * @returns The debug UI URL
 */
export function getOracleKeeperDebugUrl(): string {
  const baseUrl = getOracleKeeperUrl();
  return `${baseUrl}/health?debug=true`;
}
