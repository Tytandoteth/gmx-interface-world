/**
 * SimplePriceFeed Utility
 * Provides functions for interacting with the SimplePriceFeed contract deployed on World Chain
 */

import { ethers } from 'ethers';

import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';

import { createWorldChainProvider } from './providers';
import { SIMPLE_PRICE_FEED_ADDRESS, getWorldChainConfig } from './worldChainProduction';

// SimplePriceFeed ABI - only includes the functions we need
const SIMPLE_PRICE_FEED_ABI = [
  'function getPrice(address token) view returns (uint256)',
  'function getPrices(address[] tokens) view returns (uint256[])',
  'function decimals() view returns (uint8)'
];

// Cache of recently failed token addresses to avoid repeated errors in logs
const recentlyFailedTokens = new Set<string>();

/**
 * Creates a SimplePriceFeed contract instance with the given provider
 * @param provider Ethers provider to use for the contract
 * @returns Contract instance or null if creation failed
 */
export function createSimplePriceFeedContract(
  provider: ethers.Provider
): ethers.Contract | null {
  try {
    // Validate the contract address
    if (!SIMPLE_PRICE_FEED_ADDRESS || SIMPLE_PRICE_FEED_ADDRESS === '0x0') {
      logger.warn(`[SimplePriceFeed] Contract not yet deployed - contract address: ${SIMPLE_PRICE_FEED_ADDRESS}`);
      return null;
    }
    
    // Create Interface from ABI first (ethers.js v6 approach)
    // Using simple string signatures is valid for ethers.js v6, but we'll be explicit here
    const contractInterface = new ethers.Interface(SIMPLE_PRICE_FEED_ABI);
    
    // Create and return the contract instance with the interface
    return new ethers.Contract(
      SIMPLE_PRICE_FEED_ADDRESS,
      contractInterface,
      provider
    );
  } catch (error) {
    logger.error(
      `[SimplePriceFeed] Error creating contract instance:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Get a price from the SimplePriceFeed contract
 * @param tokenAddress Address of the token to get price for
 * @param provider Ethers provider to use for the call
 * @param retryCount Number of retries (used internally)
 * @returns Price with 18 decimals of precision or null if failed
 */
export async function getTokenPriceFromFeed(
  tokenAddress: string,
  provider: ethers.Provider | null = null,
  retryCount = 0
): Promise<number | null> {
  const MAX_RETRIES = 2;
  
  // If no provider was provided, create one using our standard approach
  const actualProvider = provider || await createWorldChainProvider();
  
  if (!tokenAddress || !actualProvider) {
    logger.warn(`[SimplePriceFeed] Missing parameters: tokenAddress=${!!tokenAddress}, provider=${!!actualProvider}`);
    return null;
  }
  
  // Skip known invalid tokens to reduce console spam
  if (recentlyFailedTokens.has(tokenAddress)) {
    return null;
  }

  try {
    // Only log connection on first attempt to reduce log noise
    if (retryCount === 0) {
      logger.info(`[SimplePriceFeed] Connecting to contract at ${SIMPLE_PRICE_FEED_ADDRESS} using provider ${actualProvider.constructor.name}`);
    }
    
    // Create or get contract instance
    const simplePriceFeed = createSimplePriceFeedContract(actualProvider);
    
    if (!simplePriceFeed) {
      throw new Error('Failed to create SimplePriceFeed contract instance');
    }
    
    // Get price from contract with timeout
    const pricePromise = simplePriceFeed.getPrice(tokenAddress);
    
    // Set a timeout to avoid hanging
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 5000ms')), 5000);
    });
    
    // Race the contract call against the timeout
    const priceRaw = await Promise.race([pricePromise, timeoutPromise]);
    
    // Get the decimals from the contract (default to 18 if the call fails)
    let decimals = 18;
    try {
      decimals = await simplePriceFeed.decimals();
    } catch (decimalsError) {
      logger.warn('[SimplePriceFeed] Could not get decimals from contract, defaulting to 18');
    }
    
    if (!priceRaw) {
      logger.warn(`[SimplePriceFeed] Received null or undefined price for ${tokenAddress}`);
      return null;
    }
    
    // Convert from contract decimals to number
    const price = parseFloat(ethers.formatUnits(priceRaw, decimals));
    
    // Validate the price is reasonable (not zero or extremely large)
    if (price <= 0 || price > 1000000) { // $1M sanity check
      logger.warn(`[SimplePriceFeed] Price value out of reasonable range: ${price} for ${tokenAddress}`);
      return null;
    }
    
    logger.info(`[SimplePriceFeed] Got price for token ${tokenAddress}: $${price}`);
    return price;
  } catch (error) {
    // Check if this is an "invalid price" error from the contract
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isInvalidPriceError = errorMessage.includes('SimplePriceFeed: invalid price');
    
    if (isInvalidPriceError) {
      // This is an expected error when token isn't registered in the contract
      // Add to cache to avoid repeated errors for the same token
      recentlyFailedTokens.add(tokenAddress);
      
      // Only log once at warn level instead of error to reduce noise
      if (retryCount === 0) {
        logger.warn(
          `[SimplePriceFeed] Token ${tokenAddress} not registered in contract: invalid price`
        );
      }
      return null;
    } else if (errorMessage.includes('timeout') && retryCount < MAX_RETRIES) {
      // Network timeout, try again with an incremented retry count
      logger.warn(`[SimplePriceFeed] Timeout for ${tokenAddress}, retrying (${retryCount + 1}/${MAX_RETRIES})`);
      return getTokenPriceFromFeed(tokenAddress, provider, retryCount + 1);
    } else {
      // For other errors, log at error level
      logger.error(
        `[SimplePriceFeed] Error getting price for ${tokenAddress}:`,
        errorMessage
      );
      
      // If we've exhausted retries or hit a non-retryable error, add to failed tokens
      if (retryCount >= MAX_RETRIES) {
        recentlyFailedTokens.add(tokenAddress);
      }
      
      return null;
    }
  }
}

/**
 * Get prices for multiple tokens from the SimplePriceFeed contract
 * @param tokenAddresses Array of token addresses to get prices for
 * @param provider Ethers provider to use for the calls
 * @returns Object with token addresses as keys and prices as values
 */
export async function getMultipleTokenPrices(
  tokenAddresses: string[],
  provider: ethers.Provider | null = null
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  // First try to get all prices in a single call for efficiency
  try {
    // If no provider was provided, create one using our standard approach
    const actualProvider = provider || await createWorldChainProvider();
    if (!actualProvider) {
      logger.warn('[SimplePriceFeed] Could not create provider for multi-price fetch');
      return prices;
    }
    
    const simplePriceFeed = createSimplePriceFeedContract(actualProvider);
    if (!simplePriceFeed) {
      throw new Error('Failed to create SimplePriceFeed contract instance');
    }
    
    // Attempt to call the batch function first (more efficient)
    const batchPrices = await simplePriceFeed.getPrices(tokenAddresses);
    
    // Get decimals (default to 18 if call fails)
    let decimals = 18;
    try {
      decimals = await simplePriceFeed.decimals();
    } catch (decimalsError) {
      logger.warn('[SimplePriceFeed] Could not get decimals from contract, defaulting to 18');
    }
    
    // Process all prices
    tokenAddresses.forEach((address, index) => {
      const priceRaw = batchPrices[index];
      if (priceRaw) {
        const price = parseFloat(ethers.formatUnits(priceRaw, decimals));
        if (price > 0 && price < 1000000) { // Sanity check
          prices[address] = price;
        }
      }
    });
    
    logger.info(`[SimplePriceFeed] Successfully fetched ${Object.keys(prices).length} prices in batch call`);
  } catch (batchError) {
    // If batch call fails, fall back to individual calls
    logger.warn(
      '[SimplePriceFeed] Batch price fetch failed, falling back to individual calls:',
      batchError instanceof Error ? batchError.message : String(batchError)
    );
    
    // Use Promise.all to fetch all prices in parallel
    const pricePromises = tokenAddresses.map(async (address) => {
      const price = await getTokenPriceFromFeed(address, provider);
      if (price !== null) {
        prices[address] = price;
      }
      return price;
    });
    
    await Promise.all(pricePromises);
  }
  
  return prices;
}

/**
 * Get price for a token by symbol using the SimplePriceFeed contract
 * @param tokenSymbol Symbol of the token (e.g., "TUSD", "TBTC")
 * @param tokenAddresses Map of token symbols to addresses
 * @param provider Ethers provider to use for the call
 * @returns Price or null if token not found or call failed
 */
export async function getTokenPriceBySymbol(
  tokenSymbol: string,
  tokenAddresses: Record<string, string>,
  provider: ethers.Provider | null = null
): Promise<number | null> {
  const tokenAddress = tokenAddresses[tokenSymbol];
  
  if (!tokenAddress) {
    logger.warn(`[SimplePriceFeed] Token symbol ${tokenSymbol} not found in provided addresses`);
    return null;
  }
  
  return getTokenPriceFromFeed(tokenAddress, provider);
}

/**
 * Get the current price of a token using the most efficient method available
 * Will try SimplePriceFeed contract first, then fall back to other data sources
 * 
 * @param tokenSymbol Token symbol to get price for
 * @param tokenAddresses Map of token symbols to addresses
 * @returns Price or null if not available
 */
export async function getTokenPriceBestEffort(
  tokenSymbol: string,
  tokenAddresses: Record<string, string>
): Promise<number | null> {
  try {
    // Try the SimplePriceFeed contract first
    const provider = await createWorldChainProvider();
    const price = await getTokenPriceBySymbol(tokenSymbol, tokenAddresses, provider);
    
    if (price !== null && price > 0) {
      return price;
    }
    
    // If we get here, the contract approach failed
    logger.info(`[SimplePriceFeed] Could not get price for ${tokenSymbol} from contract, checking config for defaults`);
    
    // Check if we have a default price in the config
    const worldConfig = getWorldChainConfig();
    if (worldConfig.defaultPrices && typeof worldConfig.defaultPrices === 'object') {
      const defaultPrice = worldConfig.defaultPrices[tokenSymbol];
      if (defaultPrice && typeof defaultPrice === 'number' && defaultPrice > 0) {
        logger.info(`[SimplePriceFeed] Using default price for ${tokenSymbol}: $${defaultPrice}`);
        return defaultPrice;
      }
    }
    
    // No price found
    return null;
  } catch (error) {
    logger.error(
      `[SimplePriceFeed] Error in getTokenPriceBestEffort for ${tokenSymbol}:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Check if SimplePriceFeed is available by attempting to get a price
 * @param provider Ethers provider to use for the call
 * @returns True if SimplePriceFeed is available and working
 */
export async function isSimplePriceFeedAvailable(
  provider: ethers.Provider | null = null
): Promise<boolean> {
  try {
    // If no provider was provided, create one using our standard approach
    const actualProvider = provider || await createWorldChainProvider();
    if (!actualProvider) {
      logger.warn('[SimplePriceFeed] Could not create provider for availability check');
      return false;
    }
    
    // Create contract instance
    const simplePriceFeed = createSimplePriceFeedContract(actualProvider);
    if (!simplePriceFeed) {
      return false;
    }
    
    // Try to call a function on the contract
    await simplePriceFeed.getPrice(ethers.ZeroAddress);
    
    logger.info('[SimplePriceFeed] Contract is available');
    return true;
  } catch (error) {
    logger.warn(
      '[SimplePriceFeed] Contract is not available:',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}
