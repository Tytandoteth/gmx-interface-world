/**
 * Token Address Utilities for World Chain
 * Manages token addresses for both development and production environments
 */

import { isProductionEnvironment, getTokenAddress, isDevelopmentEnvironment } from './environmentUtils';

// Production token addresses from mainnet
const PRODUCTION_TOKEN_ADDRESSES = {
  WLD: '0x163f8C2467924be0ae7B5347228CABF260318753',
  USDC: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
  WETH: '0x4200000000000000000000000000000000000006',
  MAG: '0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1', // Placeholder, update when real address is available
  BTC: '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3', // Placeholder, not yet on World Chain
  USDT: '0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2'  // Placeholder, not yet on World Chain
};

// Development mode mock token addresses (for local testing)
const DEVELOPMENT_TOKEN_ADDRESSES = {
  WLD: '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
  USDC: '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3',
  WETH: '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2',
  MAG: '0xmockmagaddressplaceholder00000000000000001',
  BTC: '0xmockbtcaddressplaceholder00000000000000002',
  USDT: '0xmockusdtaddressplaceholder0000000000000003'
};

/**
 * Get token addresses from environment variables first, falling back to constants
 */
const ENV_TOKEN_ADDRESSES = {
  WLD: getTokenAddress('WLD', PRODUCTION_TOKEN_ADDRESSES.WLD),
  USDC: getTokenAddress('USDC', PRODUCTION_TOKEN_ADDRESSES.USDC),
  ETH: getTokenAddress('ETH', PRODUCTION_TOKEN_ADDRESSES.WETH),
  MAG: getTokenAddress('MAG', PRODUCTION_TOKEN_ADDRESSES.MAG),
  BTC: getTokenAddress('BTC', PRODUCTION_TOKEN_ADDRESSES.BTC),
  USDT: getTokenAddress('USDT', PRODUCTION_TOKEN_ADDRESSES.USDT)
};

/**
 * Get the appropriate token address based on environment mode
 * @param symbol Token symbol (WLD, USDC, WETH, MAG, BTC, USDT)
 * @returns The token address for the current environment mode
 */
export function getTokenAddressBySymbol(symbol: string): string {
  // First check environment variables
  if (symbol in ENV_TOKEN_ADDRESSES) {
    return ENV_TOKEN_ADDRESSES[symbol];
  }
  
  // Always use production addresses when in production mode
  if (isProductionEnvironment()) {
    return PRODUCTION_TOKEN_ADDRESSES[symbol] || PRODUCTION_TOKEN_ADDRESSES.WLD;
  }
  
  // In development mode, check if we should use mock addresses
  // Check if the environment variable is explicitly set to true or false
  const useMockAddresses = import.meta.env.VITE_APP_USE_MOCK_ADDRESSES === 'true';
  
  if (useMockAddresses && isDevelopmentEnvironment()) {
    return DEVELOPMENT_TOKEN_ADDRESSES[symbol] || DEVELOPMENT_TOKEN_ADDRESSES.WLD;
  }
  
  // If not explicitly set to use mock addresses, default to production addresses for safety
  return PRODUCTION_TOKEN_ADDRESSES[symbol] || PRODUCTION_TOKEN_ADDRESSES.WLD;
}

/**
 * Gets the WLD token address for the current environment
 */
export function getWldTokenAddress(): string {
  return getTokenAddressBySymbol('WLD');
}

/**
 * Gets the USDC token address for the current environment
 */
export function getUsdcTokenAddress(): string {
  return getTokenAddressBySymbol('USDC');
}

/**
 * Gets the WETH token address for the current environment
 */
export function getWethTokenAddress(): string {
  return getTokenAddressBySymbol('WETH');
}

/**
 * Gets the MAG token address for the current environment
 */
export function getMagTokenAddress(): string {
  return getTokenAddressBySymbol('MAG');
}

/**
 * Gets the BTC token address for the current environment
 */
export function getBtcTokenAddress(): string {
  return getTokenAddressBySymbol('BTC');
}

/**
 * Gets the USDT token address for the current environment
 */
export function getUsdtTokenAddress(): string {
  return getTokenAddressBySymbol('USDT');
}

/**
 * Checks if an address is a valid token address for World Chain
 * @param address The address to check
 * @returns True if this is a known valid token address
 */
export function isValidWorldChainToken(address: string): boolean {
  // Convert all addresses to lowercase for comparison
  const lowerAddress = address.toLowerCase();
  
  // Check against all production addresses
  const validAddresses = Object.values(PRODUCTION_TOKEN_ADDRESSES)
    .map(addr => addr.toLowerCase());
    
  return validAddresses.includes(lowerAddress);
}

// Export the token addresses directly for convenience
// These will always use the environment variables if available, for safest production usage
export const WLD_TOKEN_ADDRESS = ENV_TOKEN_ADDRESSES.WLD;
export const USDC_TOKEN_ADDRESS = ENV_TOKEN_ADDRESSES.USDC;
export const WETH_TOKEN_ADDRESS = ENV_TOKEN_ADDRESSES.ETH;
export const MAG_TOKEN_ADDRESS = ENV_TOKEN_ADDRESSES.MAG;
export const BTC_TOKEN_ADDRESS = ENV_TOKEN_ADDRESSES.BTC;
export const USDT_TOKEN_ADDRESS = ENV_TOKEN_ADDRESSES.USDT;
