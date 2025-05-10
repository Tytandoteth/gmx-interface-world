/**
 * Oracle Keeper service for RedStone price data
 * This service retrieves price data from the Oracle Keeper API instead of
 * directly using the RedStone SDK wrapper, which improves reliability
 */
import { getErrorMessage } from "../../lib/utils/errorHandling";

export interface PriceData {
  price: number;
  timestamp: string;
  lastUpdated: string;
}

export interface PricesResponse {
  prices: Record<string, number>;
  timestamp: string;
  lastUpdated: string;
}

export interface PriceResponse {
  symbol: string;
  price: number;
  timestamp: string;
  lastUpdated: string;
}

export interface ErrorResponse {
  error: string;
  timestamp: string;
}

/**
 * Service for interacting with the Oracle Keeper API
 */
export class OracleKeeperService {
  private baseUrl: string;
  private apiCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheDurationMs: number = 10000; // 10 seconds
  
  /**
   * Constructor
   */
  constructor() {
    // Get the Oracle Keeper URL from environment variables or use the deployed Cloudflare Worker
    this.baseUrl = import.meta.env.VITE_APP_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev';
    console.log(`OracleKeeperService initialized with baseUrl: ${this.baseUrl}`);
  }
  
  /**
   * Check if the cache for a given key is valid
   * @param key Cache key
   * @returns Whether the cache is valid
   */
  private isCacheValid(key: string): boolean {
    const cache = this.apiCache.get(key);
    if (!cache) return false;
    
    return Date.now() - cache.timestamp < this.cacheDurationMs;
  }
  
  /**
   * Get data from cache or fetch from API
   * @param key Cache key
   * @param fetchFn Function to fetch data
   * @returns Fetched or cached data
   */
  private async getWithCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (this.isCacheValid(key)) {
      return this.apiCache.get(key)!.data as T;
    }
    
    const data = await fetchFn();
    this.apiCache.set(key, { data, timestamp: Date.now() });
    return data;
  }
  
  /**
   * Check if the Oracle Keeper service is healthy
   * @returns Whether the service is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Oracle Keeper health check failed:', getErrorMessage(error));
      return false;
    }
  }
  
  /**
   * Get prices for all supported tokens
   * @returns Prices for all supported tokens
   */
  public async getPrices(): Promise<PricesResponse> {
    return this.getWithCache<PricesResponse>('prices', async () => {
      try {
        const response = await fetch(`${this.baseUrl}/prices`);
        
        if (!response.ok) {
          const errorData = await response.json() as ErrorResponse;
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        return await response.json() as PricesResponse;
      } catch (error) {
        console.error('Failed to fetch prices from Oracle Keeper:', getErrorMessage(error));
        throw error;
      }
    });
  }
  
  /**
   * Get price for a specific token
   * @param symbol Token symbol
   * @returns Price data for the token
   */
  public async getPrice(symbol: string): Promise<PriceResponse> {
    return this.getWithCache<PriceResponse>(`price:${symbol}`, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/price/${symbol}`);
        
        if (!response.ok) {
          const errorData = await response.json() as ErrorResponse;
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        return await response.json() as PriceResponse;
      } catch (error) {
        console.error(`Failed to fetch price for ${symbol} from Oracle Keeper:`, getErrorMessage(error));
        throw error;
      }
    });
  }
}

// Singleton instance
let instance: OracleKeeperService | null = null;

/**
 * Get the OracleKeeperService instance
 * @returns OracleKeeperService instance
 */
export function getOracleKeeperService(): OracleKeeperService {
  if (!instance) {
    instance = new OracleKeeperService();
  }
  
  return instance;
}
