/**
 * World Chain Token Configuration for V1
 * Contains token information for GMX V1 on World Chain
 */

import { WORLD } from './chains';

export interface V1TokenInfo {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  isStable: boolean;
  isShortable: boolean;
  priceSource?: string; // Optional, for custom price sources
  priceScale?: number; // Optional scaling factor
  imageUrl?: string;
}

// World Chain Mainnet tokens
export const WORLD_CHAIN_TOKENS: Record<string, V1TokenInfo> = {
  // Native token
  WLD: {
    name: "World",
    symbol: "WLD",
    address: "0x163f8C2467924be0ae7B5347228CABF260318753",
    decimals: 18,
    isStable: false,
    isShortable: true,
    imageUrl: "/icons/ic_wld_40.svg" // Update with actual icon path
  },
  
  // Stablecoins
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
    decimals: 6,
    isStable: true,
    isShortable: false,
    imageUrl: "/icons/ic_usdc_40.svg"
  },
  
  // Additional tokens
  WETH: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    isStable: false,
    isShortable: true,
    imageUrl: "/icons/ic_eth_40.svg"
  },
  
  // Custom token for World Chain
  MAG: {
    name: "Magnate",
    symbol: "MAG",
    address: "0x9f8c163cBA728e99993ABe7495F06c87abC9E5d2", // Replace with actual address
    decimals: 18,
    isStable: false,
    isShortable: true,
    imageUrl: "/icons/ic_token_default.svg" // Replace with actual icon
  }
};

/**
 * Whitelisted tokens allowed for trading
 * In V1, this list controls which tokens can be used
 */
export const WORLD_CHAIN_WHITELISTED_TOKENS = [
  WORLD_CHAIN_TOKENS.USDC, // Stable token
  WORLD_CHAIN_TOKENS.WLD,  // Native token
  WORLD_CHAIN_TOKENS.WETH, // Major token
  WORLD_CHAIN_TOKENS.MAG,  // Custom token
];

/**
 * Gets tokens information for a specific chain
 * @param chainId Chain ID
 * @returns Record of token symbol to token info, or empty object if not supported
 */
export function getV1Tokens(chainId: number): Record<string, V1TokenInfo> {
  if (chainId === WORLD) {
    return WORLD_CHAIN_TOKENS;
  }
  return {};
}

/**
 * Gets whitelisted tokens for a specific chain
 * @param chainId Chain ID
 * @returns Array of token info objects, or empty array if not supported
 */
export function getV1WhitelistedTokens(chainId: number): V1TokenInfo[] {
  if (chainId === WORLD) {
    return WORLD_CHAIN_WHITELISTED_TOKENS;
  }
  return [];
}

/**
 * Gets a token by symbol for a specific chain
 * @param chainId Chain ID
 * @param symbol Token symbol
 * @returns Token info or undefined if not found
 */
export function getV1TokenBySymbol(chainId: number, symbol: string): V1TokenInfo | undefined {
  const tokens = getV1Tokens(chainId);
  return tokens[symbol];
}

/**
 * Gets a token by address for a specific chain
 * @param chainId Chain ID
 * @param address Token address
 * @returns Token info or undefined if not found
 */
export function getV1TokenByAddress(chainId: number, address: string): V1TokenInfo | undefined {
  const tokens = getV1Tokens(chainId);
  const lowerCaseAddress = address.toLowerCase();
  
  return Object.values(tokens).find(
    token => token.address.toLowerCase() === lowerCaseAddress
  );
}
