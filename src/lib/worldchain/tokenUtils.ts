/**
 * Token Utility Functions for World Chain
 * 
 * Provides safe access to token data with fallbacks to prevent
 * "Cannot read properties of undefined (reading 'symbol')" errors
 */

import { WORLD_ETH_TOKEN, WORLD_USDC_TOKEN, getWorldChainNativeToken } from './index';

// Default token symbols when not available
const DEFAULT_SYMBOLS = {
  NATIVE: 'WLD',
  STABLE: 'USDC',
  ETH: 'WETH'
};

/**
 * Gets a token symbol safely, returning a fallback if the token is undefined
 * @param token The token object which may be undefined
 * @param fallback Fallback symbol to use if token is undefined or has no symbol
 * @returns The token symbol or fallback
 */
export function getSafeTokenSymbol(token: any, fallback: string = 'TOKEN'): string {
  if (!token) return fallback;
  return token.symbol || fallback;
}

/**
 * Gets a token name safely, returning a fallback if the token is undefined
 * @param token The token object which may be undefined
 * @param fallback Fallback name to use if token is undefined or has no name
 * @returns The token name or fallback
 */
export function getSafeTokenName(token: any, fallback: string = 'Token'): string {
  if (!token) return fallback;
  return token.name || fallback;
}

/**
 * Gets a token address safely, returning a fallback if the token is undefined
 * @param token The token object which may be undefined
 * @param fallbackAddress Fallback address to use if token is undefined or has no address
 * @returns The token address or fallback 
 */
export function getSafeTokenAddress(token: any, fallbackAddress?: string): string {
  if (!token) {
    return fallbackAddress || getWorldChainNativeToken();
  }
  return token.address || fallbackAddress || getWorldChainNativeToken();
}

/**
 * Gets a token decimals safely, returning a fallback if the token is undefined
 * @param token The token object which may be undefined
 * @param fallback Fallback decimals to use if token is undefined or has no decimals
 * @returns The token decimals or fallback
 */
export function getSafeTokenDecimals(token: any, fallback: number = 18): number {
  if (!token) return fallback;
  return token.decimals || fallback;
}

/**
 * Creates a safe minimal token object with fallbacks for all properties
 * @param address Token address
 * @param symbol Token symbol
 * @param name Token name
 * @param decimals Token decimals
 * @returns A safe token object with all required properties
 */
export function createSafeToken(
  address: string = getWorldChainNativeToken(),
  symbol: string = DEFAULT_SYMBOLS.NATIVE,
  name: string = 'World',
  decimals: number = 18
): any {
  return {
    address,
    symbol,
    name,
    decimals,
    isNative: address === getWorldChainNativeToken(),
    isStable: address === WORLD_USDC_TOKEN,
    isShortable: address !== WORLD_USDC_TOKEN,
    prices: {
      minPrice: 0n,
      maxPrice: 0n
    }
  };
}

/**
 * Gets essential World Chain tokens with safe fallbacks
 * @returns Object with WLD, WETH, and USDC token objects
 */
export function getEssentialWorldChainTokens(): Record<string, any> {
  return {
    [getWorldChainNativeToken()]: createSafeToken(
      getWorldChainNativeToken(),
      DEFAULT_SYMBOLS.NATIVE,
      'World',
      18
    ),
    [WORLD_ETH_TOKEN]: createSafeToken(
      WORLD_ETH_TOKEN,
      DEFAULT_SYMBOLS.ETH,
      'Wrapped Ethereum',
      18
    ),
    [WORLD_USDC_TOKEN]: createSafeToken(
      WORLD_USDC_TOKEN,
      DEFAULT_SYMBOLS.STABLE,
      'USD Coin',
      6
    )
  };
}
