/**
 * TokenAddressService
 * 
 * A centralized service to manage token addresses throughout the application
 * with standardized environment detection, error handling, and fallback values.
 */

import { ethers } from 'ethers';
import { 
  getEnvironment, 
  Environment, 
  isProductionEnvironment, 
  getTokenAddress 
} from 'lib/worldchain/environmentUtils';
import { Logger } from 'lib/logger';
import { getSafeTokenSymbol } from 'lib/worldchain/tokenUtils';

// Supported token types in the application
export enum TokenType {
  WLD = 'WLD',
  ETH = 'ETH',
  WETH = 'ETH', // Alias for ETH
  USDC = 'USDC',
  MAG = 'MAG',
  WLD_USDC_LP = 'WLD_USDC_MARKET',
  ETH_USDC_LP = 'ETH_USDC_MARKET'
}

// Address constants for development mode with fallbacks
const TOKEN_ADDRESS_FALLBACKS: Record<TokenType, string> = {
  [TokenType.WLD]: '0x163f8C2467924be0ae7B5347228CABF260318753',
  [TokenType.ETH]: '0x4200000000000000000000000000000000000006',
  [TokenType.USDC]: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
  [TokenType.MAG]: '0x52A8cb0De9Bd1f3B69d5927F2AD5e581C9bc0D13',
  [TokenType.WLD_USDC_LP]: '0x9bb32E24C978E715F44031CD0863A7c2b1D1F9a3',
  [TokenType.ETH_USDC_LP]: '0x82539D86203997E2711F4b6f20502787C68CSf4c'
};

// Environment-specific token info
interface TokenAddressInfo {
  address: string;
  symbol: string;
  verified: boolean;
  source: 'environment' | 'fallback' | 'map';
}

// Used to keep a cache of token addresses
const tokenAddressCache = new Map<string, TokenAddressInfo>();

/**
 * Get token address with proper environment detection and error handling
 * @param tokenType - The token type (WLD, ETH, etc.)
 * @param options - Optional settings
 * @returns Token address or null if not found
 */
export function getTokenAddressSafe(
  tokenType: TokenType | string,
  options: {
    required?: boolean;
    validateAddress?: boolean;
    allowFallback?: boolean;
    chainId?: number;
  } = {}
): string | null {
  const {
    required = isProductionEnvironment(),
    validateAddress = true,
    allowFallback = !isProductionEnvironment()
  } = options;
  
  const tokenTypeNormalized = tokenType.toUpperCase() as TokenType;
  const cacheKey = `${tokenTypeNormalized}`;
  
  // Try to get from cache first
  if (tokenAddressCache.has(cacheKey)) {
    return tokenAddressCache.get(cacheKey)!.address;
  }
  
  // First try to get from environment utils (which handles env variables)
  try {
    const envTokenAddress = getTokenAddress(tokenTypeNormalized as any, '', required);
    
    if (envTokenAddress && envTokenAddress !== '') {
      // Validate the address format if requested
      if (validateAddress && !ethers.utils.isAddress(envTokenAddress)) {
        Logger.warn(`Invalid token address format for ${tokenTypeNormalized}: ${envTokenAddress}`);
        
        // If fallbacks aren't allowed, return null for invalid addresses
        if (!allowFallback) {
          return null;
        }
      } else {
        // Cache the valid address
        tokenAddressCache.set(cacheKey, {
          address: envTokenAddress,
          symbol: tokenTypeNormalized,
          verified: true,
          source: 'environment'
        });
        return envTokenAddress;
      }
    }
  } catch (error) {
    // Log error but continue to try fallback
    if (!isProductionEnvironment()) {
      Logger.warn(`Error getting token address for ${tokenTypeNormalized}:`, error);
    }
  }
  
  // If not found or invalid, try fallback if allowed
  if (allowFallback) {
    const fallbackAddress = TOKEN_ADDRESS_FALLBACKS[tokenTypeNormalized];
    
    if (fallbackAddress) {
      tokenAddressCache.set(cacheKey, {
        address: fallbackAddress,
        symbol: tokenTypeNormalized,
        verified: false,
        source: 'fallback'
      });
      
      if (!isProductionEnvironment()) {
        Logger.warn(`Using fallback address for ${tokenTypeNormalized}: ${fallbackAddress}`);
      }
      
      return fallbackAddress;
    }
  }
  
  // If required and not found, log error
  if (required) {
    Logger.error(`Required token address not found for ${tokenTypeNormalized}. This will cause errors in production.`);
  }
  
  return null;
}

/**
 * Get token address with built-in fallback to empty string
 * @param tokenType Token type to get address for
 * @returns Token address or empty string
 */
export function getTokenAddressString(tokenType: TokenType | string): string {
  return getTokenAddressSafe(tokenType) || '';
}

/**
 * Check if a token address is valid and available
 * @param tokenType Token type to check
 * @returns True if token address is available and valid
 */
export function isTokenAddressValid(tokenType: TokenType | string): boolean {
  const address = getTokenAddressSafe(tokenType, { validateAddress: true });
  return address !== null && address !== '';
}

/**
 * Mapping from address to token type
 */
export function getTokenTypeByAddress(address: string): TokenType | null {
  if (!address) return null;
  
  const lowerAddress = address.toLowerCase();
  
  // Check cache first
  for (const [key, value] of tokenAddressCache.entries()) {
    if (value.address.toLowerCase() === lowerAddress) {
      return key as TokenType;
    }
  }
  
  // Check fallbacks
  for (const [tokenType, tokenAddress] of Object.entries(TOKEN_ADDRESS_FALLBACKS)) {
    if (tokenAddress.toLowerCase() === lowerAddress) {
      return tokenType as TokenType;
    }
  }
  
  return null;
}

/**
 * Create a complete token object with address, symbol, and name
 * @param tokenType Token type to create
 * @returns Token object or null if not found
 */
export function createToken(tokenType: TokenType | string): any | null {
  const address = getTokenAddressSafe(tokenType);
  
  if (!address) {
    return null;
  }
  
  const tokenTypeNormalized = tokenType.toUpperCase() as TokenType;
  
  return {
    address,
    symbol: getSafeTokenSymbol(null, tokenTypeNormalized),
    name: tokenTypeNormalized,
    decimals: tokenTypeNormalized === TokenType.USDC ? 6 : 18
  };
}

/**
 * Hook for using token addresses in React components
 */
export function useTokenAddress(tokenType: TokenType | string): string {
  return getTokenAddressString(tokenType);
}

/**
 * Get a map of all available token addresses
 * @returns Map of token type to address
 */
export function getAllTokenAddresses(): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const tokenType of Object.values(TokenType)) {
    const address = getTokenAddressSafe(tokenType);
    if (address) {
      result[tokenType] = address;
    }
  }
  
  return result;
}

/**
 * Fill any missing token addresses from environment variables using fallbacks
 * This can be used to pre-populate the cache on app startup
 */
export function initializeTokenAddresses(): void {
  // Pre-populate cache for all token types
  for (const tokenType of Object.values(TokenType)) {
    getTokenAddressSafe(tokenType);
  }
  
  const environment = getEnvironment();
  Logger.info(`TokenAddressService initialized with ${tokenAddressCache.size} tokens in ${environment} environment`);
}
