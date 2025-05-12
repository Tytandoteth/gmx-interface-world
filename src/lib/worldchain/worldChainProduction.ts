import { WORLD as _WORLD } from "sdk/configs/chains";

// Production Oracle Keeper URL
export const WORLD_ORACLE_KEEPER_PROD_URL = "https://oracle-keeper.kevin8396.workers.dev";

// SimplePriceFeed contract address
export const SIMPLE_PRICE_FEED_ADDRESS = import.meta.env.VITE_APP_WORLD_SIMPLE_PRICE_FEED as string || "0x7e402dE1894f3dCed30f9bECBc51aD08F2016095";

/**
 * Production configuration for World Chain
 * Use this configuration when deploying to production
 */
export interface WorldChainConfig {
  feature_flags: {
    use_coingecko: boolean;
    use_redstone: boolean;
    use_oracle_keeper: boolean;
    use_simple_price_feed: boolean;
    enable_test_tokens: boolean;
  };
  redstone?: {
    enabled: boolean;
    priceFeedAddress: string;
    trackedTokens: string[];
  };
  markets: Record<string, {
    marketTokenAddress: string;
    indexTokenAddress: string;
    longTokenAddress: string;
    shortTokenAddress: string;
  }>;
  contracts: Record<string, string>;
  tokens: Record<string, string>;
  oracleKeeperUrl: string;
  enableDevMode: boolean;
  // Default prices for tokens when contract price feeds are unavailable
  defaultPrices?: Record<string, number>;
}

export const WorldChainProductionConfig: WorldChainConfig = {
  // Feature flags for production environment
  feature_flags: {
    // Use CoinGecko as primary data source in production
    use_coingecko: true,
    // Disable RedStone integration in production
    use_redstone: false,
    // Oracle flags
    use_oracle_keeper: true,
    // Enable simple price feed contract
    use_simple_price_feed: true,
    // Enable test tokens in production (for simple price feed integration)
    enable_test_tokens: true
  },
  
  // RedStone integration configuration (production)
  redstone: {
    // Enable RedStone integration
    enabled: false, // Changed to false since we're using CoinGecko
    // RedStone price feed contract address - use environment variable when deployed
    priceFeedAddress: import.meta.env.VITE_APP_WORLD_REDSTONE_PRICE_FEED as string || "0xA63636C9d557793234dD5E33a24EAd68c36Df148",
    // Supported tokens
    trackedTokens: ["WLD", "ETH", "BTC", "USDC", "USDT", "MAG"],
  },
  
  // Production market configuration
  markets: {
    // Define production market addresses
    WLD_USDC: {
      marketTokenAddress: import.meta.env.VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN as string || "0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
      indexTokenAddress: import.meta.env.VITE_APP_WORLD_WLD_TOKEN as string || "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // WLD
      longTokenAddress: import.meta.env.VITE_APP_WORLD_USDC_TOKEN as string || "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
      shortTokenAddress: import.meta.env.VITE_APP_WORLD_USDC_TOKEN as string || "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
    },
    ETH_USDC: {
      marketTokenAddress: import.meta.env.VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN as string || "0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
      indexTokenAddress: import.meta.env.VITE_APP_WORLD_ETH_TOKEN as string || "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2", // ETH
      longTokenAddress: import.meta.env.VITE_APP_WORLD_USDC_TOKEN as string || "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
      shortTokenAddress: import.meta.env.VITE_APP_WORLD_USDC_TOKEN as string || "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
    },
  },
  
  // Contract addresses (production)
  contracts: {
    vault: import.meta.env.VITE_APP_WORLD_VAULT_ADDRESS as string || "",
    router: import.meta.env.VITE_APP_WORLD_ROUTER_ADDRESS as string || "",
    positionRouter: import.meta.env.VITE_APP_WORLD_POSITION_ROUTER_ADDRESS as string || "",
    glpManager: import.meta.env.VITE_APP_WORLD_GLP_MANAGER_ADDRESS as string || "",
    simplePriceFeed: SIMPLE_PRICE_FEED_ADDRESS,
  },
  
  // Token addresses (production)
  tokens: {
    // Original tokens
    WLD: import.meta.env.VITE_APP_WORLD_WLD_TOKEN as string || "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
    ETH: import.meta.env.VITE_APP_WORLD_ETH_TOKEN as string || "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
    BTC: import.meta.env.VITE_APP_WORLD_BTC_TOKEN as string || "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3",
    USDC: import.meta.env.VITE_APP_WORLD_USDC_TOKEN as string || "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
    USDT: import.meta.env.VITE_APP_WORLD_USDT_TOKEN as string || "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
    MAG: import.meta.env.VITE_APP_WORLD_MAG_TOKEN as string || "0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
    
    // New test tokens with fixed prices
    TUSD: import.meta.env.VITE_APP_WORLD_TUSD_TOKEN as string || "0x0000000000000000000000000000000000000001",
    TBTC: import.meta.env.VITE_APP_WORLD_TBTC_TOKEN as string || "0x0000000000000000000000000000000000000002",
    TETH: import.meta.env.VITE_APP_WORLD_TETH_TOKEN as string || "0x0000000000000000000000000000000000000003",
  },
  
  // Oracle keeper URL for World Chain
  oracleKeeperUrl: WORLD_ORACLE_KEEPER_PROD_URL,
  
  // This is intentionally false for production
  enableDevMode: false,
  
  // Default prices for tokens when contract price feeds are unavailable
  defaultPrices: {
    WLD: 1.25,     // World token price
    ETH: 3000.00,  // Ethereum price
    BTC: 60000.00, // Bitcoin price
    USDC: 1.00,    // USDC stablecoin
    USDT: 1.00,    // USDT stablecoin
    MAG: 2.50,     // MAG token price
  }
};

/**
 * Determines if the application should use production or development mode
 * @returns True if production mode should be used
 */
export function shouldUseProductionMode(): boolean {
  // In local development, respect the DEV_MODE env var
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_USE_PRODUCTION_MODE === "true";
  }
  
  // In production builds, always use production mode
  return true;
}

/**
 * Get the appropriate configuration based on environment
 * @returns Either development or production configuration
 */
// Import development config directly to avoid require() which doesn't work with Vite
import { WorldChainConfig as DevModeConfig } from "./worldChainDevMode";

export function getWorldChainConfig() {
  if (shouldUseProductionMode()) {
    return WorldChainProductionConfig;
  }
  
  // Use imported development config
  return DevModeConfig;
}
