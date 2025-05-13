/**
 * World Chain Token Configuration
 * This module defines token metadata for World Chain
 */

import { TokensData, TokenData, TokenPrices } from "domain/synthetics/tokens";
import { WORLD as _WORLD } from "sdk/configs/chains";

import { isWorldChain, WorldChainConfig } from "./worldChainDevMode";

/**
 * Convert a price number to a BigInt with proper precision for TokenPrices
 * @param price The price value as a number
 * @returns BigInt price value with proper precision
 */
function convertPriceToBigInt(price: number): bigint {
  // Using 10^30 precision as observed in the GMX codebase
  return BigInt(Math.floor(price * 10**30));
}

/**
 * Create TokenPrices object from a price number
 * @param price The price as a number
 * @returns TokenPrices object with minPrice and maxPrice
 */
function createTokenPrices(price: number): TokenPrices {
  try {
    const priceBigInt = convertPriceToBigInt(price || WorldChainConfig.defaultPrices.DEFAULT);
    return {
      minPrice: priceBigInt,
      maxPrice: priceBigInt
    };
  } catch (error) {
    // Using Logger instead of console for better ESLint compliance
    const errorMsg = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn("[World Chain] Error creating token prices:", errorMsg);
    // Return a safe fallback
    const fallbackPrice = convertPriceToBigInt(WorldChainConfig.defaultPrices.DEFAULT);
    return {
      minPrice: fallbackPrice,
      maxPrice: fallbackPrice
    };
  }
}

// World Chain token addresses
// Real World Chain token addresses for production use
export const WORLD_WLD_TOKEN = "0x163f8C2467924be0ae7B5347228CABF260318753"; // WLD (World token)
export const WORLD_USDC_TOKEN = "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4"; // USDC
export const WORLD_ETH_TOKEN = "0x4200000000000000000000000000000000000006"; // WETH

// For compatibility with existing code - ETH is our primary token
export const WORLD_NATIVE_TOKEN = WORLD_WLD_TOKEN; // WLD is native on World Chain

// These tokens may not exist on World Chain yet - using placeholders
// Update with real addresses when available
export const WORLD_BTC_TOKEN = "0x0000000000000000000000000000000000000000"; // BTC (placeholder)
export const WORLD_WBTC_TOKEN = "0x0000000000000000000000000000000000000000"; // WBTC (placeholder)
// Update with real addresses when available
export const WORLD_USDT_TOKEN = "0x0000000000000000000000000000000000000000"; // USDT (placeholder)
export const WORLD_MAG_TOKEN = "0x123456789012345678901234567890abcdef1234"; // MAG (Magic Token)

/**
 * World Chain token metadata and prices
 * This fully conforms to the TokenData interface requirements
 */
const WORLD_CHAIN_TOKEN_INFO = {
  // WLD token is the native token for World Chain
  [WORLD_WLD_TOKEN]: {
    name: "World",
    symbol: "WLD",
    decimals: 18,
    address: WORLD_WLD_TOKEN,
    isNative: true, // WLD is the native token on World Chain
    isShortable: true,
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/31069/standard/WorldCoin.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/worldcoin",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_WLD_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.WLD
  },
  [WORLD_USDC_TOKEN]: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: WORLD_USDC_TOKEN,
    isStable: true,
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_USDC_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.USDC
  },
  // Using a unique identifier for WETH to avoid duplicate property error
  [`${WORLD_ETH_TOKEN}-wrapped`]: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    address: WORLD_ETH_TOKEN,
    isShortable: true,
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_ETH_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.ETH
  },
  [WORLD_BTC_TOKEN]: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    address: WORLD_BTC_TOKEN,
    isShortable: true,
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_BTC_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.BTC
  },
  [WORLD_USDT_TOKEN]: {
    name: "Tether",
    symbol: "USDT",
    decimals: 6,
    address: WORLD_USDT_TOKEN,
    isStable: true,
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_USDT_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.USDT
  },
  // Magic (MAG) token
  [WORLD_MAG_TOKEN]: {
    name: "Magic",
    symbol: "MAG",
    decimals: 18,
    address: WORLD_MAG_TOKEN,
    isShortable: true,
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/18623/standard/magic.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/magic",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_MAG_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.MAG || 2.50
  },
  // WBTC token
  [WORLD_WBTC_TOKEN]: {
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    decimals: 8,
    address: WORLD_WBTC_TOKEN,
    isShortable: true, 
    isV2: false, // Using V1 contracts only
    imageUrl: "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png",
    coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
    explorerUrl: "https://explorer.world.com/token/" + WORLD_WBTC_TOKEN,
    // Default price from config
    defaultPrice: WorldChainConfig.defaultPrices.BTC || 55000.00
  },
};

/**
 * Create proper TokensData format with required prices property
 * This follows the TokenData interface requirements
 */
export const WORLD_CHAIN_TOKENS: TokensData = Object.fromEntries(
  Object.entries(WORLD_CHAIN_TOKEN_INFO).map(([address, token]) => [
    address,
    {
      // Must include prices property for TokenData interface
      prices: createTokenPrices(token.defaultPrice),
      // Add balance and totalSupply as optional
      balance: undefined,
      totalSupply: undefined,
      // Include all other token properties
      ...(token as any),
    } as TokenData,
  ])
);

/**
 * Get token info for a specific token address on World Chain
 * @param tokenAddress The token address to get info for
 * @returns Token metadata or undefined if not found
 */
export function getWorldChainTokenInfo(tokenAddress: string): TokenData | undefined {
  return WORLD_CHAIN_TOKENS[tokenAddress];
}

/**
 * Get native token data for World Chain
 * @returns Native token data (TokenData object)
 */
export function getWorldChainNativeTokenData(): TokenData | undefined {
  return WORLD_CHAIN_TOKENS[WORLD_NATIVE_TOKEN];
}

/**
 * Get USDC token data for World Chain
 * @returns USDC token data (TokenData object)
 */
export function getWorldChainUsdcTokenData(): TokenData | undefined {
  return WORLD_CHAIN_TOKENS[WORLD_USDC_TOKEN];
}

/**
 * Get tokens data for World Chain with fallbacks and merged data
 * @param existingData Existing tokens data to merge with World Chain data
 * @param chainId The chain ID
 * @returns TokensData for World Chain
 */
export function getWorldChainTokensData(existingData: TokensData | Record<string, any>, chainId: number): TokensData {
  try {
    // For non-World Chain, simply return the existing data
    if (!isWorldChain(chainId)) {
      return existingData as TokensData;
    }
    
    // Start with our predefined tokens as a base
    const worldChainTokens: TokensData = { ...WORLD_CHAIN_TOKENS };
    
    // Validate that all of our predefined tokens have valid prices
    Object.entries(worldChainTokens).forEach(([address, tokenData]) => {
      if (!tokenData.prices || !tokenData.prices.minPrice || !tokenData.prices.maxPrice) {
        // eslint-disable-next-line no-console
        console.log("[World Chain] Native token address:", WORLD_NATIVE_TOKEN);
        console.log("[World Chain] Token address not found in WORLD_CHAIN_TOKEN_INFO:", address);
        worldChainTokens[address] = {
          ...tokenData,
          prices: createTokenPrices(WorldChainConfig.defaultPrices.DEFAULT)
        };
      }
    });
    
    // If we have existing data, merge it with our token data
    if (existingData && Object.keys(existingData).length > 0) {
      // Merging existing token data with World Chain tokens
      
      Object.entries(existingData).forEach(([address, tokenData]) => {
        try {
          // For tokens we already have defined
          if (worldChainTokens[address]) {
            worldChainTokens[address] = {
              ...worldChainTokens[address],
              ...tokenData,
              // Ensure prices property is always valid
              prices: (tokenData.prices && tokenData.prices.minPrice) 
                ? tokenData.prices 
                : worldChainTokens[address].prices
            };
          } 
          // For new tokens not in our predefined list
          else if (tokenData && typeof tokenData === 'object') {
            // Only add if it has a valid prices property or we can create one
            if (tokenData.prices && tokenData.prices.minPrice && tokenData.prices.maxPrice) {
              worldChainTokens[address] = tokenData;
            } else if (tokenData.symbol && WorldChainConfig.defaultPrices[tokenData.symbol]) {
              // For known symbols, use their default price
              worldChainTokens[address] = {
                ...tokenData,
                prices: createTokenPrices(WorldChainConfig.defaultPrices[tokenData.symbol])
              };
            } else {
              // Use default price for unknown tokens
              worldChainTokens[address] = {
                ...tokenData,
                prices: createTokenPrices(WorldChainConfig.defaultPrices.DEFAULT)
              };
            }
          }
        } catch (err) {
          console.error(`[World Chain] Error processing token ${address}:`, err);
        }
      });
    }
    
    return worldChainTokens;
  } catch (error) {
    console.error("[World Chain] Critical error in getWorldChainTokensData:", error);
    // In case of any error, return our predefined tokens as a fallback
    return WORLD_CHAIN_TOKENS;
  }
}

/**
 * Get the native token address for World Chain
 * @returns The native token address for World Chain
 */
export function getWorldChainNativeToken(): string {
  return WORLD_NATIVE_TOKEN;
}

/**
 * Get the USDC token address for World Chain
 * @returns The USDC token address for World Chain
 */
export function getWorldChainUsdcToken(): string {
  return WORLD_USDC_TOKEN;
}
