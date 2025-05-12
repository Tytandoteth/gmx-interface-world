import { WORLD } from "sdk/configs/chains";

import { WorldChainConfig } from "./worldChainDevMode";
import { WorldChainProductionConfig, shouldUseProductionMode } from "./worldChainProduction";

/**
 * Initialize the WorldChainConfig singleton to ensure it's ready before any component tries to use it
 * This prevents the "Cannot read properties of undefined (reading 'feature_flags')" error
 */
export function initWorldChainConfig(): void {
  // Ensure WorldChainConfig is initialized
  
  // Get the appropriate config based on mode
  const config = shouldUseProductionMode() ? WorldChainProductionConfig : WorldChainConfig;
  
  // We'll make sure feature_flags exists on both configs
  if (!config.feature_flags) {
    // Add missing feature_flags to WorldChainConfig
    config.feature_flags = {
      use_coingecko_prices: true,
      enable_test_tokens: !shouldUseProductionMode()
    };
  }

  // Make sure tokens and markets are properly initialized
  if (!config.tokens || Object.keys(config.tokens).length === 0) {
    // WorldChainConfig tokens not initialized
  }
  
  if (!config.markets || Object.keys(config.markets).length === 0) {
    // WorldChainConfig markets not initialized
  }
  
  // Pre-populate localStorage configuration values for World Chain
  try {
    const oracleKeeperKey = "ORACLE_KEEPER_INSTANCES";
    const storedConfig = localStorage.getItem(oracleKeeperKey);
    const updatedConfig = storedConfig ? JSON.parse(storedConfig) : {};
    
    // Always force World Chain to use the first Oracle Keeper URL
    updatedConfig[WORLD] = 0;
    
    localStorage.setItem(oracleKeeperKey, JSON.stringify(updatedConfig));
    // World Chain Oracle Keeper configuration initialized
  } catch (error) {
    // Failed to initialize World Chain configuration, silently continue
  }
  
  // Set global flag to indicate config is initialized
  (window as any).__WORLD_CHAIN_CONFIG_INITIALIZED = true;
}

/**
 * Check if the WorldChainConfig has been initialized
 */
export function isWorldChainConfigInitialized(): boolean {
  return (window as any).__WORLD_CHAIN_CONFIG_INITIALIZED === true;
}
