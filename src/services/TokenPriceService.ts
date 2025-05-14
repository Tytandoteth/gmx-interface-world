/**
 * TokenPriceService
 * 
 * A centralized service to fetch and access token prices throughout the application
 * with standardized error handling, fallbacks, and logging.
 */

import { useEffect, useState } from 'react';
import { useOraclePrices } from 'context/OraclePricesContext/OraclePricesProvider';
import { isProductionEnvironment } from 'lib/worldchain/environmentUtils';
import { Logger } from 'lib/logger';
import { getSafeTokenSymbol } from 'lib/worldchain/tokenUtils';

// Default fallback values when needed
const DEFAULT_PRICES: Record<string, number> = {
  WLD: 1.25,
  WETH: 3550.00,
  ETH: 3550.00,
  USDC: 1.00,
  MAG: 2.50
};

/**
 * Formats a price for display with specified precision
 * @param price - The price to format
 * @param decimals - Number of decimal places
 * @param prefix - Prefix to add (e.g. '$')
 * @returns Formatted price string
 */
export function formatPrice(
  price: number | undefined, 
  decimals: number = 2,
  prefix: string = '$'
): string {
  if (price === undefined || isNaN(price)) {
    return `${prefix}--.--`;
  }
  return `${prefix}${price.toFixed(decimals)}`;
}

/**
 * Returns the default price for a token symbol
 * @param symbol - Token symbol
 * @returns Default price or undefined if not found
 */
export function getDefaultTokenPrice(symbol: string): number | undefined {
  if (!symbol) return undefined;
  
  const upperSymbol = symbol.toUpperCase();
  return DEFAULT_PRICES[upperSymbol];
}

/**
 * Hook to access token price with proper fallback handling
 * @param symbol - Token symbol
 * @param fallbackPrice - Price to use if token price is not available
 * @returns Token price or fallback/undefined
 */
export function useTokenPrice(symbol: string, fallbackPrice?: number): number | undefined {
  const { getTokenPrice } = useOraclePrices();
  
  if (!symbol) return fallbackPrice;
  
  return getTokenPrice(symbol, fallbackPrice);
}

/**
 * Hook to access token price with proper fallback handling and price display formatting
 * @param symbol - Token symbol
 * @param fallbackPrice - Price to use if token price is not available
 * @param prefix - Prefix to add (e.g. '$')
 * @param decimals - Number of decimal places
 * @returns Formatted price string
 */
export function useFormattedTokenPrice(
  symbol: string,
  fallbackPrice?: number,
  prefix: string = '$',
  decimals: number = 2
): string {
  const price = useTokenPrice(symbol, fallbackPrice);
  return formatPrice(price, decimals, prefix);
}

/**
 * Hook to track token price with percent change
 * @param symbol - Token symbol
 * @param interval - Update interval in ms
 * @returns Object with current price, percent change, and trend
 */
export function useTokenPriceWithTrend(symbol: string, interval: number = 60000): {
  price: number | undefined;
  percentChange: number | undefined;
  trend: 'up' | 'down' | 'neutral';
  formattedPrice: string;
  formattedChange: string;
  isLoading: boolean;
} {
  const currentPrice = useTokenPrice(symbol);
  const [previousPrice, setPreviousPrice] = useState<number | undefined>(undefined);
  const [percentChange, setPercentChange] = useState<number | undefined>(undefined);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [isLoading, setIsLoading] = useState(true);
  
  // Set initial previous price and update periodically
  useEffect(() => {
    if (currentPrice !== undefined && previousPrice === undefined) {
      setPreviousPrice(currentPrice);
      setIsLoading(false);
    }
    
    const timer = setInterval(() => {
      if (currentPrice !== undefined) {
        setPreviousPrice(currentPrice);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [currentPrice, previousPrice, interval]);
  
  // Calculate percent change and trend
  useEffect(() => {
    if (previousPrice && currentPrice) {
      const change = ((currentPrice - previousPrice) / previousPrice) * 100;
      setPercentChange(change);
      
      if (change > 0) {
        setTrend('up');
      } else if (change < 0) {
        setTrend('down');
      } else {
        setTrend('neutral');
      }
      
      setIsLoading(false);
    }
  }, [currentPrice, previousPrice]);
  
  // Format price and percent change
  const formattedPrice = formatPrice(currentPrice);
  let formattedChange = '0.00%';
  
  if (percentChange !== undefined) {
    const sign = percentChange > 0 ? '+' : '';
    formattedChange = `${sign}${percentChange.toFixed(2)}%`;
  }
  
  return {
    price: currentPrice,
    percentChange,
    trend,
    formattedPrice,
    formattedChange,
    isLoading
  };
}

/**
 * Class-based service for managing token prices
 * Can be used in non-React contexts
 */
export class TokenPriceManager {
  private static instance: TokenPriceManager;
  private prices: Record<string, number> = {};
  private lastUpdated: number | null = null;
  
  private constructor() {
    // Initialize with default prices
    this.prices = { ...DEFAULT_PRICES };
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TokenPriceManager {
    if (!TokenPriceManager.instance) {
      TokenPriceManager.instance = new TokenPriceManager();
    }
    return TokenPriceManager.instance;
  }
  
  /**
   * Update prices from external source
   * @param prices - New prices to set
   */
  public updatePrices(prices: Record<string, number>): void {
    this.prices = {
      ...this.prices,
      ...prices
    };
    this.lastUpdated = Date.now();
  }
  
  /**
   * Get price for a token
   * @param symbol - Token symbol
   * @param fallback - Fallback price if not found
   * @returns Token price or fallback
   */
  public getPrice(symbol: string, fallback?: number): number | undefined {
    if (!symbol) {
      return fallback;
    }
    
    const upperSymbol = symbol.toUpperCase();
    const price = this.prices[upperSymbol];
    
    if (price !== undefined) {
      return price;
    }
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    return DEFAULT_PRICES[upperSymbol];
  }
  
  /**
   * Get formatted price string
   * @param symbol - Token symbol
   * @param fallback - Fallback price if not found
   * @param prefix - Prefix to add (e.g. '$')
   * @param decimals - Number of decimal places
   * @returns Formatted price string
   */
  public getFormattedPrice(
    symbol: string,
    fallback?: number,
    prefix: string = '$',
    decimals: number = 2
  ): string {
    const price = this.getPrice(symbol, fallback);
    return formatPrice(price, decimals, prefix);
  }
  
  /**
   * Check if price is stale (older than 5 minutes)
   */
  public isPriceDataStale(): boolean {
    if (!this.lastUpdated) {
      return true;
    }
    
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.lastUpdated < fiveMinutesAgo;
  }
  
  /**
   * Clear all prices data
   */
  public resetPrices(): void {
    this.prices = { ...DEFAULT_PRICES };
    this.lastUpdated = null;
    
    if (!isProductionEnvironment()) {
      Logger.debug('TokenPriceManager: prices reset to defaults');
    }
  }
}

// Singleton export
export const tokenPriceManager = TokenPriceManager.getInstance();
