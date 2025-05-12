import { ethers } from "ethers";

import { logger } from "../oracleKeeperFetcher/oracleKeeperUtils.new";
import { WORLD } from "config/chains";
import { RPC_PROVIDERS } from "config/chains";

// Global provider cache to avoid creating multiple instances
const providerCache: { [endpoint: string]: ethers.JsonRpcProvider } = {};

/**
 * Creates a properly configured JSON-RPC provider for World Chain
 * Uses QuickNode's recommended pattern for ethers.js
 * 
 * @returns JsonRpcProvider instance
 */
export function createWorldChainProvider(): ethers.JsonRpcProvider {
  try {
    // Get the preferred RPC URL
    const preferredRpcUrl = RPC_PROVIDERS[WORLD][0];
    
    // Return cached provider if available
    if (providerCache[preferredRpcUrl]) {
      return providerCache[preferredRpcUrl];
    }
    
    logger.info(`Creating new JsonRpcProvider with URL: ${preferredRpcUrl}`);
    
    // Create ethers provider following QuickNode's recommended pattern
    // This also automatically sets the correct headers and configurations
    const provider = new ethers.JsonRpcProvider(preferredRpcUrl);
    
    // Configure optimal settings for World Chain
    provider.pollingInterval = 4000; // 4 seconds polling for new blocks
    
    // Test the connection to ensure it works
    provider.getBlockNumber()
      .then(blockNumber => {
        logger.info(`Successfully connected to World Chain, block: ${blockNumber}`);
      })
      .catch(error => {
        logger.error(`Failed to connect to World Chain RPC: ${error.message}`);
      });
    
    // Cache the provider
    providerCache[preferredRpcUrl] = provider;
    
    return provider;
  } catch (error) {
    logger.error(`Error creating World Chain provider: ${error.message}`);
    throw error;
  }
}

/**
 * Get a singleton World Chain provider instance
 * @returns JsonRpcProvider for World Chain
 */
export function getWorldChainProvider(): ethers.JsonRpcProvider {
  // Use the cached instance or create a new one
  return providerCache[RPC_PROVIDERS[WORLD][0]] || createWorldChainProvider();
}
