/**
 * Token Configuration
 * 
 * Provides token definitions and utility functions for working with tokens
 * in the GMX World Chain interface.
 */

import { Environment, getEnvironment } from '../lib/worldchain/environmentUtils';

type TokenInfo = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  isShortable?: boolean;
  imageUrl?: string;
  coingeckoUrl?: string;
  explorerUrl?: string;
};

// Token map by chain and symbol
const TOKENS: Record<string, Record<string, TokenInfo>> = {
  worldchain: {
    WLD: {
      name: "World",
      symbol: "WLD",
      address: import.meta.env.VITE_APP_WORLD_WLD_TOKEN || "0x163f8C2467924be0ae7B5347228CABF260318753",
      decimals: 18,
      isNative: false,
      imageUrl: "/tokens/wld.svg",
    },
    ETH: {
      name: "Ethereum",
      symbol: "ETH",
      address: import.meta.env.VITE_APP_WORLD_ETH_TOKEN || "0x4200000000000000000000000000000000000006",
      decimals: 18,
      isNative: true,
      imageUrl: "/tokens/eth.svg"
    },
    USDC: {
      name: "USD Coin",
      symbol: "USDC",
      address: import.meta.env.VITE_APP_WORLD_USDC_TOKEN || "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
      decimals: 6,
      isNative: false,
      imageUrl: "/tokens/usdc.svg"
    },
    // Add more tokens as needed
  }
};

// Test tokens for development environment
const TEST_TOKENS: Record<string, Record<string, TokenInfo>> = {
  worldchain: {
    WLD: {
      name: "Test World",
      symbol: "WLD",
      address: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
      decimals: 18,
      isNative: false,
      imageUrl: "/tokens/wld.svg",
    },
    ETH: {
      name: "Test Ethereum",
      symbol: "ETH",
      address: "0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2",
      decimals: 18,
      isNative: true,
      imageUrl: "/tokens/eth.svg"
    },
    USDC: {
      name: "Test USD Coin",
      symbol: "USDC",
      address: "0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1",
      decimals: 6,
      isNative: false,
      imageUrl: "/tokens/usdc.svg"
    },
    // Add more test tokens as needed
  }
};

/**
 * Get tokens for the specified chain
 */
export function getTokens(chain: string = 'worldchain') {
  const env = getEnvironment();
  // Use test tokens in development mode
  if (env === Environment.DEVELOPMENT) {
    return TEST_TOKENS[chain] || {};
  }
  return TOKENS[chain] || {};
}

/**
 * Get a specific token by its symbol
 */
export function getTokenBySymbol(chain = 'worldchain', symbol: string) {
  const tokens = getTokens(chain);
  return tokens[symbol];
}

/**
 * Get a specific token by its address
 */
export function getTokenByAddress(chain: string, address: string) {
  const tokens = getTokens(chain);
  const normalizedAddress = address.toLowerCase();
  
  for (const token of Object.values(tokens)) {
    if (token.address.toLowerCase() === normalizedAddress) {
      return token;
    }
  }
  return undefined;
}

/**
 * Legacy function to maintain compatibility with existing code
 */
export function getTokenV2(chainId: string, address: string, symbol: string, isNative?: boolean) {
  const tokens = getTokens('worldchain');
  if (tokens[symbol]) {
    return tokens[symbol];
  }
  
  // Fallback to a minimal token definition
  return {
    name: symbol,
    symbol,
    address: address || '',
    decimals: 18,
    isNative: Boolean(isNative),
  };
}

export default {
  getTokens,
  getTokenBySymbol,
  getTokenByAddress,
  getTokenV2
};
