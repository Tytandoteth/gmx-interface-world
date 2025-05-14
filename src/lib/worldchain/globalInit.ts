/**
 * Global initialization functions for World Chain
 * These are designed to be called as early as possible in the application lifecycle
 * to prevent "undefined" errors
 */

import { WorldChainConfig } from "./worldChainDevMode";
import { WorldChainProductionConfig, shouldUseProductionMode } from "./worldChainProduction";
import { initWorldChainConfig } from "./initConfig";

/**
 * Initialize global window config to prevent undefined errors
 * Called before any React component mounts
 */
export function initializeGlobalConfig(): void {
  // Create global window.worldChainConfig if it doesn't exist
  if (typeof window !== 'undefined') {
    // Initialize window.worldChainConfig as an empty object if it doesn't exist
    if (!(window as any).worldChainConfig) {
      (window as any).worldChainConfig = {};
    }
    
    // Add feature_flags if they don't exist
    if (!(window as any).worldChainConfig.feature_flags) {
      (window as any).worldChainConfig.feature_flags = {
        use_coingecko_prices: true,
        enable_test_tokens: !shouldUseProductionMode(),
        use_simple_price_feed: true
      };
    }
    
    // Initialize tokens and markets as empty objects if they don't exist
    if (!(window as any).worldChainConfig.tokens) {
      (window as any).worldChainConfig.tokens = {};
    }
    
    if (!(window as any).worldChainConfig.markets) {
      (window as any).worldChainConfig.markets = {};
    }
    
    // Call standard initialization
    initWorldChainConfig();
    
    // Copy from the correct config based on mode
    const source = shouldUseProductionMode() ? WorldChainProductionConfig : WorldChainConfig;
    
    // Apply config to the window object
    (window as any).worldChainConfig = {
      ...(window as any).worldChainConfig,
      ...source
    };
  }
}

// Run the global initialization immediately when this module is loaded
initializeGlobalConfig();

// Export window.worldChainConfig as a backup
export const worldChainConfig = typeof window !== 'undefined' ? (window as any).worldChainConfig : {};
