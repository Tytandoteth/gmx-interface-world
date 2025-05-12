/**
 * Debugging utilities for World Chain integration
 * These help track down issues with token loading, price data, and network configuration
 */
import { WORLD_CHAIN_ID } from "config/contracts";
import { WORLD } from "sdk/configs/chains";

import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';

/**
 * Logs debug information about the current environment
 * Helps track down issues with token loading and price data
 */
export const debugWorldChainEnvironment = (): void => {
  // Check for chain ID consistency
  logger.info('[Debug] Chain ID Constants:');
  logger.info(`- SDK WORLD: ${WORLD}`);
  logger.info(`- Config WORLD_CHAIN_ID: ${WORLD_CHAIN_ID}`);
  
  // Check RPC URL 
  const rpcUrl = import.meta.env.VITE_WORLD_RPC_URL || "Not set";
  logger.info('[Debug] RPC URL:', rpcUrl);
  
  // Log environment mode
  logger.info('[Debug] Environment Mode:', 
    import.meta.env.MODE === 'development' ? 'Development' : 'Production');
};

/**
 * Debug token loading issues 
 * @param tokens The token map to debug
 * @param chainId Current chain ID
 */
export const debugTokenLoading = (tokens: Record<string, any>, chainId: number): void => {
  console.log(`[Debug] Token Loading for chain ${chainId}:`);
  console.log(`- Is World Chain: ${chainId === WORLD}`);
  console.log(`- Number of tokens: ${Object.keys(tokens).length}`);
  
  if (Object.keys(tokens).length > 0) {
    console.log('- Token addresses:');
    Object.entries(tokens).forEach(([address, token]) => {
      console.log(`  - ${token.symbol}: ${address}`);
    });
  } else {
    console.log('- No tokens loaded');
  }
};

/**
 * Debug price fetching issues
 * @param prices Price data object
 */
export const debugPriceData = (prices: Record<string, any>): void => {
  console.log('[Debug] Price Data:');
  
  if (!prices || Object.keys(prices).length === 0) {
    console.log('- No price data available');
    return;
  }
  
  console.log('- Available token prices:');
  Object.entries(prices).forEach(([symbol, price]) => {
    console.log(`  - ${symbol}: $${price}`);
  });
};

/**
 * Checks if the Test Environment should be used
 */
export const shouldUseTestEnvironment = (): boolean => {
  return process.env.VITE_USE_TEST_TOKENS === 'true';
};
