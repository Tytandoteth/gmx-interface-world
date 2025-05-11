import { ethers } from 'ethers';
import { WrapperBuilder } from '@redstone-finance/evm-connector';
import type { Env, PriceCache, PriceData } from './types';

// RedStonePriceFeed ABI - only the functions we need
const REDSTONE_PRICE_FEED_ABI = [
  "function getLatestPrice(string memory symbol) public view returns (uint256)",
  "function getLatestPrices(string[] memory symbols) public view returns (uint256[] memory)",
  "function getSupportedTokens() public pure returns (string[] memory)"
];

/**
 * Fetch prices from the blockchain
 * @param env Environment variables
 * @returns Price cache object with fetched prices
 */
export async function fetchPricesFromBlockchain(env: Env): Promise<PriceCache> {
  try {
    // Parse tokens from environment
    const supportedTokens = env.SUPPORTED_TOKENS.split(',');
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    
    // Create contract instance
    const redStonePriceFeed = new ethers.Contract(
      env.REDSTONE_PRICE_FEED_ADDRESS,
      REDSTONE_PRICE_FEED_ABI,
      provider
    );
    
    // Create wrapped contract
    // Use 'as any' to bypass the contract type mismatch between ethers versions
    const wrappedContract = WrapperBuilder
      .wrap(redStonePriceFeed as any)
      .usingDataService({
        dataServiceId: "redstone-main-demo",
        uniqueSignersCount: 1,
        // Use as any to bypass type checking since different RedStone SDK versions have different param names
        dataFeeds: supportedTokens
      } as any);
      
    // Prepare prices object
    const prices: Record<string, { price: number; timestamp: number }> = {};
    let hasError = false;
    
    // Fetch prices for all supported tokens
    for (const symbol of supportedTokens) {
      try {
        const price = await wrappedContract.getLatestPrice(symbol);
        // Convert to decimal (assuming 8 decimals for price feeds)
        prices[symbol] = {
          price: parseFloat(ethers.formatUnits(price, 8)),
          timestamp: Date.now()
        };
      } catch (error) {
        hasError = true;
        console.error(`Failed to fetch ${symbol} price: ${(error as Error).message}`);
      }
    }
    
    return {
      prices,
      lastUpdated: Date.now(),
      status: Object.keys(prices).length > 0 
        ? (hasError ? 'fallback' : 'success')
        : 'error'
    };
  } catch (error) {
    console.error(`Failed to fetch prices: ${(error as Error).message}`);
    const err = error as Error;
    // Generate mock data and extract the prices
    const mockData = generateMockPrices(env);
    return {
      status: "fallback" as const,
      prices: mockData.prices,
      lastUpdated: Date.now(),
      error: err.toString()
    };
  }
}

/**
 * Generate mock prices for fallback
 * @param env Environment variables
 * @returns Price cache object with mock prices
 */
export function generateMockPrices(env: Env): PriceCache {
  const supportedTokens = env.SUPPORTED_TOKENS.split(',');
  const now = Date.now();
  
  const mockPriceData: Record<string, number> = {
    'WLD': 1.25 + (Math.random() * 0.1 - 0.05),  // WLD price with small variation
    'ETH': 3450.75 + (Math.random() * 100 - 50), // ETH price with variation
    'BTC': 65430.50 + (Math.random() * 500 - 250) // BTC price with variation
  };
  
  // Build the prices object with supported tokens only
  const pricesData: Record<string, PriceData> = {};
  
  supportedTokens.forEach(symbol => {
    if (mockPriceData[symbol]) {
      pricesData[symbol] = {
        price: +mockPriceData[symbol].toFixed(2),
        timestamp: now
      };
    }
  });
  
  return {
    prices: pricesData,
    lastUpdated: now,
    status: 'fallback'
  };
}
