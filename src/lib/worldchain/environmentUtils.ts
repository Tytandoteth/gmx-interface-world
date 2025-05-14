/**
 * Environment Utilities for the World Chain GMX Interface
 * Provides standardized functions for detecting environments and accessing environment variables
 */

import { Logger } from '../logger';

/**
 * Environment types supported by the application
 */
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Returns the current environment based on environment variables
 * Uses a combination of Vite's MODE and our custom production flag
 */
export function getEnvironment(): Environment {
  // First check for explicit production mode flag
  const useProductionMode = import.meta.env.VITE_APP_USE_PRODUCTION_MODE === 'true';
  if (useProductionMode) {
    return Environment.PRODUCTION;
  }

  // Then fall back to Vite's built-in mode
  if (import.meta.env.MODE === 'production') {
    return Environment.PRODUCTION;
  } else if (import.meta.env.MODE === 'test') {
    return Environment.TEST;
  }

  // Default to development
  return Environment.DEVELOPMENT;
}

/**
 * Checks if the application is running in production mode
 */
export function isProductionEnvironment(): boolean {
  return getEnvironment() === Environment.PRODUCTION;
}

/**
 * Checks if the application is running in development mode
 */
export function isDevelopmentEnvironment(): boolean {
  return getEnvironment() === Environment.DEVELOPMENT;
}

/**
 * Checks if the application is running in test mode
 */
export function isTestEnvironment(): boolean {
  return getEnvironment() === Environment.TEST;
}

/**
 * Checks if test tokens should be used instead of real tokens
 */
export function shouldUseTestTokens(): boolean {
  // In production, never use test tokens regardless of flag
  if (isProductionEnvironment()) {
    return false;
  }
  
  return import.meta.env.VITE_APP_USE_TEST_TOKENS === 'true';
}

/**
 * Safely gets an environment variable with type checking and fallback
 * @param key The environment variable key
 * @param fallback The fallback value if the key is not found
 * @param required Whether the variable is required in production
 */
export function getEnvVariable<T>(
  key: string, 
  fallback: T, 
  required = false
): T {
  const value = import.meta.env[key];
  
  // If value is undefined, return fallback
  if (value === undefined) {
    if (required && isProductionEnvironment()) {
      Logger.error(`Required environment variable "${key}" is missing in production!`);
    } else if (isDevelopmentEnvironment()) {
      Logger.warn(`Environment variable "${key}" is missing, using fallback value: ${fallback}`);
    }
    return fallback;
  }
  
  // Handle type conversion based on fallback type
  try {
    if (typeof fallback === 'number') {
      return Number(value) as unknown as T;
    } else if (typeof fallback === 'boolean') {
      return (value === 'true') as unknown as T;
    }
    
    // Default to string or original value
    return value as unknown as T;
  } catch (error) {
    Logger.error(`Failed to parse environment variable "${key}": ${error}`);
    return fallback;
  }
}

/**
 * Gets the World Chain RPC URL
 */
export function getWorldChainRpcUrl() {
  return getEnvVariable(
    'VITE_APP_WORLD_CHAIN_URL', 
    isProductionEnvironment() 
      ? 'https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/' 
      : 'https://rpc-testnet.world-chain.example.com',
    isProductionEnvironment()
  );
}

/**
 * Gets the Oracle Keeper URL
 */
export function getOracleKeeperUrl() {
  return getEnvVariable(
    'VITE_APP_ORACLE_KEEPER_URL',
    'https://oracle-keeper.kevin8396.workers.dev',
    false
  );
}

/**
 * Gets the log level from environment variables
 */
export function getLogLevel(): number {
  return getEnvVariable(
    'VITE_APP_LOG_LEVEL',
    isDevelopmentEnvironment() ? 2 : 0,
    false
  );
}

/**
 * Gets a contract address from environment variables
 * @param contractType The type of contract
 * @param fallback The fallback address to use if not found
 * @param required Whether the address is required in production
 */
export function getContractAddress(
  contractType: 'vault' | 'router' | 'positionRouter' | 'positionManager' | 'witnetPriceRouter',
  fallback = '',
  required = isProductionEnvironment()
) {
  const contractKey: Record<string, string> = {
    vault: 'VITE_APP_WORLD_VAULT_ADDRESS',
    router: 'VITE_APP_WORLD_ROUTER_ADDRESS',
    positionRouter: 'VITE_APP_WORLD_POSITION_ROUTER_ADDRESS',
    positionManager: 'VITE_APP_WORLD_POSITION_MANAGER_ADDRESS',
    witnetPriceRouter: 'VITE_APP_WITNET_PRICE_ROUTER_ADDRESS'
  };

  return getEnvVariable(contractKey[contractType], fallback, required);
}

/**
 * Gets a token address from environment variables
 * @param tokenSymbol The token symbol (e.g., WLD, ETH, USDC)
 * @param fallback The fallback address to use if not found
 * @param required Whether the address is required in production
 */
export function getTokenAddress(
  tokenSymbol: 'WLD' | 'ETH' | 'USDC' | 'MAG' | 'BTC' | 'USDT' | 'WLD_USDC_MARKET' | 'ETH_USDC_MARKET',
  fallback = '',
  required = isProductionEnvironment()
) {
  const tokenKey: Record<string, string> = {
    WLD: 'VITE_APP_WORLD_WLD_TOKEN',
    ETH: 'VITE_APP_WORLD_ETH_TOKEN',
    USDC: 'VITE_APP_WORLD_USDC_TOKEN',
    MAG: 'VITE_APP_WORLD_MAG_TOKEN',
    BTC: 'VITE_APP_WORLD_BTC_TOKEN',
    USDT: 'VITE_APP_WORLD_USDT_TOKEN',
    WLD_USDC_MARKET: 'VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN',
    ETH_USDC_MARKET: 'VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN'
  };

  return getEnvVariable(tokenKey[tokenSymbol], fallback, required);
}
