import { WORLD, isChainInDevelopment } from "sdk/configs/chains";

// Constants
// Using our CoinGecko-powered Oracle Keeper deployed on Cloudflare Workers
const WORLD_ORACLE_KEEPER_URL = "https://oracle-keeper.kevin8396.workers.dev";

/**
 * Special configuration flags for World Chain development mode
 */
export const WorldChainConfig = {
  // Feature flags for World Chain - required to prevent undefined errors
  feature_flags: {
    use_coingecko_prices: true,
    enable_test_tokens: true
  },

  // Default mock data to use when Oracle Keeper is not available
  defaultPrices: {
    WLD: 2.75,        // World native token
    USDC: 1.00,       // Stablecoin
    ETH: 3550.25,     // Ethereum
    BTC: 69420.50,    // Bitcoin
    USDT: 1.00,       // Tether stablecoin
    MAG: 2.50,        // Magnate token
    // Add fallback for any token
    DEFAULT: 1.00,    // Default price for any other token
  },
  
  // Price data source configuration
  price_sources: {
    // Primary price source is CoinGecko
    primary: "coingecko",
    // Oracle Keeper direct prices endpoint URL
    direct_prices_endpoint: import.meta.env.VITE_ORACLE_KEEPER_DIRECT_PRICES_URL as string || "/direct-prices",
    // Default tokens to track
    trackedTokens: ["WLD", "WETH", "MAG"],
  },
  
  // Token configurations for World Chain
  tokens: {
    WLD: {
      address: "0x163f8C2467924be0ae7B5347228CABF260318753",
      decimals: 18,
      coingecko_id: "worldcoin"
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
      coingecko_id: "ethereum"
    },
    USDC: {
      address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
      decimals: 6,
      coingecko_id: "usd-coin"
    }
  },
  
  // Market configurations for World Chain
  markets: {
    "WLD-USDC": {
      base: "WLD",
      quote: "USDC"
    },
    "WETH-USDC": {
      base: "WETH",
      quote: "USDC"
    }
  },
  
  // DEPRECATED CONFIGURATIONS
  // The following configurations are kept for backward compatibility
  // but are no longer used in the current implementation
  
  // DEPRECATED: Legacy Witnet integration (no longer used)
  witnet: {
    enabled: false,
    priceRouterAddress: "",
    trackedTokens: ["WLD", "WETH", "MAG"],
  },
  
  // DEPRECATED: Legacy RedStone integration (no longer used)
  redstone: {
    enabled: false,
    priceFeedAddress: "",
    trackedTokens: [],
  },
  
  // Market configuration for World Chain
  // Using a source-agnostic structure that supports various price sources
  markets_v2: {
    // Modern-style market definitions with base/quote tokens
    "WLD-USDC": {
      base: "WLD",
      quote: "USDC",
      enabled: true
    },
    "WETH-USDC": {
      base: "WETH",
      quote: "USDC",
      enabled: true
    }
  },
  
  // DEPRECATED: Legacy market definitions - kept for backward compatibility
  // This structure will be removed in future updates
  legacy_markets: {
    WLD_USDC: {
      marketTokenAddress: "0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
      indexTokenAddress: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // WLD
      longTokenAddress: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
      shortTokenAddress: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
    },
    ETH_USDC: {
      marketTokenAddress: "0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
      indexTokenAddress: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2", // ETH
      longTokenAddress: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
      shortTokenAddress: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
    },
    BTC_USDC: {
      marketTokenAddress: "0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3",
      indexTokenAddress: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3", // BTC
      longTokenAddress: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
      shortTokenAddress: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1", // USDC
    }
  },
  
  // Token configuration for World Chain - merged from all definitions
  tokens_v2: {
    // Expanded token definitions with metadata
    WLD: {
      address: "0x163f8C2467924be0ae7B5347228CABF260318753",
      decimals: 18,
      coingecko_id: "worldcoin"
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
      coingecko_id: "ethereum"
    },
    USDC: {
      address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
      decimals: 6,
      coingecko_id: "usd-coin"
    },
    // Legacy token address definitions
    ETH: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
    BTC: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3",
    USDT: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
  },
  
  // Flag to explicitly enable development mode for diagnostics
  useMockData: isChainInDevelopment(WORLD),
  enableDevMode: isChainInDevelopment(WORLD),
  oracleKeeperUrl: WORLD_ORACLE_KEEPER_URL,
};

/**
 * Checks if the current chain is World Chain
 * @param chainId Chain ID to check
 * @returns True if chain is World Chain
 */
export function isWorldChain(chainId: number): boolean {
  return chainId === WORLD;
}

/**
 * Wrapper for function calls that might fail in development mode
 * Provides graceful fallbacks for World Chain
 * 
 * @param fn Function to execute
 * @param fallback Fallback value to return if function fails
 * @param chainId Current chain ID
 * @returns Function result or fallback value
 */
export function withWorldChainFallback<T>(
  fn: () => T,
  fallback: T,
  chainId: number
): T {
  // Only apply fallbacks for World Chain in development mode
  if (!isWorldChain(chainId) || !isChainInDevelopment(chainId)) {
    return fn();
  }
  
  try {
    return fn();
  } catch (error) {
    console.warn("Function call failed in World Chain dev mode, using fallback:", error);
    return fallback;
  }
}

/**
 * Gets mock data for different components when actual data is not available
 * @param dataType Type of data to get mock values for
 * @returns Mock data for the specified type
 */
export function getWorldChainMockData<T>(dataType: string): T | null {
  console.debug(`[World Chain Dev] Getting mock data for ${dataType}`);
  
  // Return appropriate mock data based on the requested type
  if (dataType === "prices") {
    return WorldChainConfig.defaultPrices as unknown as T;
  }
  
  if (dataType === "fees") {
    return {
      totalFees: 0,
      feeUsd: 0,
      feeTokens: [],
    } as unknown as T;
  }

  if (dataType === "gas") {
    return {
      gasPrice: 0,
      maxGasPrice: 0,
      minGasPrice: 0,
      maxPriorityFeePerGas: 0,
    } as unknown as T;
  }

  if (dataType === "positions") {
    return {
      positions: [],
      isLoading: false,
    } as unknown as T;
  }
  
  if (dataType === "markets") {
    // Return a properly structured market config with name field and token addresses that match our token setup
    const marketsData: Record<string, any> = {};

    Object.entries(WorldChainConfig.markets).forEach(([marketKey, market]) => {
      const [indexToken, longToken] = marketKey.split('_');
      const indexTokenKey = indexToken as keyof typeof WorldChainConfig.tokens;
      const longTokenKey = longToken as keyof typeof WorldChainConfig.tokens;
      
      marketsData[market.marketTokenAddress] = {
        ...market,
        name: marketKey, // Add a name field which is expected by the UI
        isDisabled: false, // Make sure markets are enabled
        longToken: WorldChainConfig.tokens[longTokenKey],
        indexToken: WorldChainConfig.tokens[indexTokenKey],
        isSameCollaterals: market.longTokenAddress === market.shortTokenAddress,
        hasMaxAvailableLong: false,
        hasMaxAvailableShort: false,
      };
    });
    
    return marketsData as unknown as T;
  }

  if (dataType === "tokens") {
    // Build a complete token dictionary keyed by address
    const tokenDict: Record<string, any> = {};
    
    // Add all tokens with complete data structures including prices and decimal info
    Object.entries(WorldChainConfig.tokens).forEach(([symbol, address]) => {
      if (!address) return;
      
      const symbolKey = symbol as keyof typeof WorldChainConfig.defaultPrices;
      const price = WorldChainConfig.defaultPrices[symbolKey] || 
                    WorldChainConfig.defaultPrices.DEFAULT;
      const priceValue = BigInt(Math.floor(price * 10**30));
      
      // Set appropriate decimals based on token type
      const decimals = symbol === 'USDC' || symbol === 'USDT' ? 6 : 
                       symbol === 'BTC' ? 8 : 18;
      
      tokenDict[address] = {
        name: symbol,
        symbol: symbol,
        decimals: decimals,
        address: address,
        isNative: symbol === 'WLD',
        isStable: symbol === 'USDC' || symbol === 'USDT',
        isShortable: symbol === 'WLD' || symbol === 'ETH' || symbol === 'BTC',
        prices: {
          minPrice: priceValue,
          maxPrice: priceValue
        },
        balance: BigInt(0),
        totalSupply: BigInt(10 ** 18),
      };
    });
    
    return tokenDict as unknown as T;
  }
  
  if (dataType === "marketsInfo") {
    // Get mock tokens data - ensure it's not null
    const tokensData = getWorldChainMockData<Record<string, any>>("tokens");
    // Create a defensive non-null version of the tokens data
    const safeTokensData: Record<string, any> = tokensData || {};
    
    // Create market info data with references to our token data
    const marketsData: Record<string, any> = {};
    
    Object.entries(WorldChainConfig.markets).forEach(([marketKey, market]) => {
      const [indexToken, longToken] = marketKey.split('_');
      const indexTokenKey = indexToken as keyof typeof WorldChainConfig.tokens;
      const longTokenKey = longToken as keyof typeof WorldChainConfig.tokens;
      
      const indexTokenAddress = WorldChainConfig.tokens[indexTokenKey];
      const longTokenAddress = WorldChainConfig.tokens[longTokenKey];
      const shortTokenAddress = market.shortTokenAddress;
      
      // Make sure we have valid token addresses
      if (!indexTokenAddress || !longTokenAddress || !shortTokenAddress) return;
      
      // Make sure we have token data objects
      if (!safeTokensData[indexTokenAddress] || !safeTokensData[longTokenAddress] || !safeTokensData[shortTokenAddress]) {
        console.warn(`Missing token data for market ${marketKey}`);
        return;
      }
      
      // Create full market info with all required fields
      marketsData[market.marketTokenAddress] = {
        marketTokenAddress: market.marketTokenAddress,
        indexTokenAddress: indexTokenAddress,
        longTokenAddress: longTokenAddress,  
        shortTokenAddress: shortTokenAddress,
        isSameCollaterals: longTokenAddress === shortTokenAddress,
        name: marketKey,
        isDisabled: false,
        longToken: safeTokensData[longTokenAddress],
        shortToken: safeTokensData[shortTokenAddress],
        indexToken: safeTokensData[indexTokenAddress],
        longTokenPriceDecimals: safeTokensData[longTokenAddress]?.decimals || 30,
        shortTokenPriceDecimals: safeTokensData[shortTokenAddress]?.decimals || 30,
        indexTokenPriceDecimals: safeTokensData[indexTokenAddress]?.decimals || 30,
        minLeverage: BigInt(1 * 10000),
        maxLeverage: BigInt(100 * 10000),
        fees: {
          depositFee: BigInt(0),
          withdrawFee: BigInt(0),
          swapFee: BigInt(0),
          positionFee: BigInt(1 * 10**8), // 0.1%
        },
        prices: {
          indexTokenPrice: BigInt(Math.floor((WorldChainConfig.defaultPrices[indexTokenKey] || 1) * 10**30)),
          longTokenPrice: BigInt(Math.floor((WorldChainConfig.defaultPrices[longTokenKey] || 1) * 10**30)),
          shortTokenPrice: BigInt(Math.floor((WorldChainConfig.defaultPrices[longTokenKey] || 1) * 10**30)),
        },
        liquidity: {
          longLiquidity: BigInt(1000000 * 10**30),
          shortLiquidity: BigInt(1000000 * 10**30),
        },
        reserveFactorLong: BigInt(10000), // 100% in basis points 
        reserveFactorShort: BigInt(10000), // 100% in basis points
        openInterestReserveFactorLong: BigInt(8000), // 80% in basis points
        openInterestReserveFactorShort: BigInt(8000), // 80% in basis points
        maxOpenInterestLong: BigInt(10000000 * 10**30), // $10M max long OI
        maxOpenInterestShort: BigInt(10000000 * 10**30), // $10M max short OI
        maxLongTokenPoolAmount: BigInt(1000000 * 10**30),
        maxShortTokenPoolAmount: BigInt(1000000 * 10**30),
        poolValueMax: BigInt(10000000 * 10**30), // $10M max pool value
        poolValueMin: BigInt(100000 * 10**30), // $100k min pool value
        positionImpactPoolAmount: BigInt(1000000 * 10**30),
        minCollateralUsd: BigInt(10 * 10**30), // $10 min collateral
      };
    });
    
    // Return a complete market info structure with tokens data
    return {
      marketsInfoData: marketsData,
      tokensData: safeTokensData,
    } as unknown as T;
  }
  
  // Return null for unsupported data types
  return null;
}

/**
 * Force initialization of World Chain configuration
 * Call this early in the application lifecycle
 */
export function initWorldChainDevMode(): void {
  console.debug("Initializing World Chain development mode configuration");
  
  // Make sure global WorldChainConfig is properly set up
  if (!WorldChainConfig.tokens || !WorldChainConfig.markets) {
    console.error("World Chain configuration is incomplete");
    return;
  }
  
  // Initialize mock data and make sure it's valid
  const testTokens = getWorldChainMockData<Record<string, any>>("tokens");
  if (!testTokens || Object.keys(testTokens).length === 0) {
    console.error("Failed to initialize World Chain token configuration");
    return;
  }
  
  // Pre-populate localStorage configuration values for World Chain
  try {
    const oracleKeeperKey = "ORACLE_KEEPER_INSTANCES";
    const storedConfig = localStorage.getItem(oracleKeeperKey);
    const updatedConfig = storedConfig ? JSON.parse(storedConfig) : {};
    
    // Always force World Chain to use the first Oracle Keeper URL
    updatedConfig[WORLD] = 0;
    
    localStorage.setItem(oracleKeeperKey, JSON.stringify(updatedConfig));
    console.debug("World Chain Oracle Keeper configuration initialized");
  } catch (error) {
    console.error("Failed to initialize World Chain configuration:", error);
  }
}
