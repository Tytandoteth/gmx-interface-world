import type { Env, PriceCache, PricesResponse, PriceResponse } from './types';
import { fetchPricesFromBlockchain, generateMockPrices } from './blockchain';

// KV keys
const PRICES_CACHE_KEY = 'prices_cache';
const METRICS_KEY = 'metrics';
const SERVICE_START_KEY = 'service_start';

/**
 * Oracle Keeper service for Cloudflare Workers
 * Handles caching, price retrieval, and metrics
 */
export class OracleKeeperService {
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Update metrics data
   * @param key Metric to update
   * @param value Value to set or increment
   */
  private async updateMetric(key: string, value: number | null = null): Promise<void> {
    try {
      // Get current metrics
      const metricsString = await this.env.PRICE_CACHE.get(METRICS_KEY);
      const metrics = metricsString ? JSON.parse(metricsString) : {
        requestCount: 0,
        errorCount: 0,
        priceUpdates: 0,
        uptime: Date.now(),
        lastPriceUpdate: 0,
        lastError: null
      };
      
      // Update metric
      if (value === null) {
        // Increment
        metrics[key] = (metrics[key] || 0) + 1;
      } else {
        // Set value
        metrics[key] = value;
      }
      
      // Save metrics
      await this.env.PRICE_CACHE.put(METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
      // Log but don't throw - metrics are non-critical
      console.error(`Failed to update metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Log error and update error metrics
   * @param message Error message
   * @param context Error context
   */
  private async logError(message: string, context: string): Promise<void> {
    console.error(`[${context}] ${message}`);
    
    try {
      // Get current metrics
      const metricsString = await this.env.PRICE_CACHE.get(METRICS_KEY);
      const metrics = metricsString ? JSON.parse(metricsString) : {
        requestCount: 0,
        errorCount: 0,
        priceUpdates: 0,
        uptime: Date.now(),
        lastPriceUpdate: 0,
        lastError: null
      };
      
      // Update metrics
      metrics.errorCount++;
      metrics.lastError = {
        timestamp: Date.now(),
        message,
        context
      };
      
      // Save metrics
      await this.env.PRICE_CACHE.put(METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
      // Just log - metrics are non-critical
      console.error(`Failed to update error metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Get the service start time
   * Creates a timestamp on first call
   */
  private async getServiceStartTime(): Promise<number> {
    const startTime = await this.env.PRICE_CACHE.get(SERVICE_START_KEY);
    
    if (startTime) {
      return parseInt(startTime, 10);
    }
    
    const now = Date.now();
    await this.env.PRICE_CACHE.put(SERVICE_START_KEY, now.toString());
    return now;
  }

  /**
   * Update price cache with fresh data
   * Called by cron trigger
   */
  public async updatePriceCache(): Promise<void> {
    try {
      console.log('Updating price cache...');
      
      // Fetch prices from blockchain
      const priceCache = await fetchPricesFromBlockchain(this.env);
      
      // Store in KV
      await this.env.PRICE_CACHE.put(PRICES_CACHE_KEY, JSON.stringify(priceCache));
      
      // Update metrics
      await this.updateMetric('priceUpdates');
      await this.updateMetric('lastPriceUpdate', Date.now());
      
      console.log(`Price cache updated: ${Object.keys(priceCache.prices).length} tokens`);
    } catch (error) {
      // Log error
      await this.logError((error as Error).message, 'update_price_cache');
      
      // Try to create fallback prices
      try {
        const fallbackCache = generateMockPrices(this.env);
        await this.env.PRICE_CACHE.put(PRICES_CACHE_KEY, JSON.stringify(fallbackCache));
        console.log('Fallback prices generated');
      } catch (fallbackError) {
        console.error(`Failed to generate fallback prices: ${(fallbackError as Error).message}`);
      }
    }
  }

  /**
   * Get prices with caching
   * Returns prices from cache if fresh, triggers update if stale
   */
  public async getPrices(): Promise<PricesResponse> {
    await this.updateMetric('requestCount');
    
    try {
      // Get cache
      const cacheString = await this.env.PRICE_CACHE.get(PRICES_CACHE_KEY);
      
      // Parse cache or create default
      const priceCache: PriceCache = cacheString 
        ? JSON.parse(cacheString) 
        : { prices: {}, lastUpdated: 0, status: 'uninitialized' };
      
      // Check if cache is fresh
      const cacheDuration = parseInt(this.env.PRICE_CACHE_DURATION_MS, 10) || 30000;
      const isCacheFresh = Date.now() - priceCache.lastUpdated < cacheDuration;
      
      // Return formatted prices
      const formattedPrices: Record<string, number> = {};
      
      for (const [symbol, data] of Object.entries(priceCache.prices)) {
        formattedPrices[symbol] = data.price;
      }
      
      return {
        prices: formattedPrices,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
        status: priceCache.status
      };
    } catch (error) {
      // Log error
      await this.logError((error as Error).message, 'get_prices');
      
      // Return fallback
      const fallbackCache = generateMockPrices(this.env);
      
      const formattedPrices: Record<string, number> = {};
      for (const [symbol, data] of Object.entries(fallbackCache.prices)) {
        formattedPrices[symbol] = data.price;
      }
      
      return {
        prices: formattedPrices,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date(fallbackCache.lastUpdated).toISOString(),
        status: 'fallback'
      };
    }
  }

  /**
   * Get price for a specific token
   * @param symbol Token symbol
   */
  public async getPrice(symbol: string): Promise<PriceResponse | null> {
    await this.updateMetric('requestCount');
    
    try {
      // Normalize symbol
      const normalizedSymbol = symbol.toUpperCase();
      
      // Check if token is supported
      const supportedTokens = this.env.SUPPORTED_TOKENS.split(',');
      if (!supportedTokens.includes(normalizedSymbol)) {
        return null;
      }
      
      // Get prices
      const { prices, timestamp, lastUpdated, status } = await this.getPrices();
      
      // Check if price exists
      if (!prices[normalizedSymbol]) {
        return null;
      }
      
      // Return formatted price
      return {
        symbol: normalizedSymbol,
        price: prices[normalizedSymbol],
        timestamp,
        lastUpdated,
        status
      };
    } catch (error) {
      // Log error
      await this.logError((error as Error).message, 'get_price');
      
      // Return null to indicate error
      return null;
    }
  }

  /**
   * Get service health status
   */
  public async getHealth(): Promise<any> {
    try {
      // Get cache
      const cacheString = await this.env.PRICE_CACHE.get(PRICES_CACHE_KEY);
      
      // Parse cache or create default
      const priceCache: PriceCache = cacheString 
        ? JSON.parse(cacheString) 
        : { prices: {}, lastUpdated: 0, status: 'uninitialized' };
      
      // Get service start time
      const startTime = await this.getServiceStartTime();
      
      return {
        status: priceCache.status === 'error' ? 'degraded' : 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        priceCache: {
          lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
          status: priceCache.status,
          tokenCount: Object.keys(priceCache.prices).length
        }
      };
    } catch (error) {
      // Log error
      await this.logError((error as Error).message, 'get_health');
      
      // Return degraded status
      return {
        status: 'degraded',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: 0,
        priceCache: {
          lastUpdated: new Date().toISOString(),
          status: 'error',
          tokenCount: 0
        },
        error: (error as Error).message
      };
    }
  }

  /**
   * Get service metrics
   */
  public async getMetrics(): Promise<any> {
    try {
      // Get metrics
      const metricsString = await this.env.PRICE_CACHE.get(METRICS_KEY);
      const metrics = metricsString ? JSON.parse(metricsString) : {
        requestCount: 0,
        errorCount: 0,
        priceUpdates: 0,
        uptime: Date.now(),
        lastPriceUpdate: 0,
        lastError: null
      };
      
      // Get cache
      const cacheString = await this.env.PRICE_CACHE.get(PRICES_CACHE_KEY);
      const priceCache: PriceCache = cacheString 
        ? JSON.parse(cacheString) 
        : { prices: {}, lastUpdated: 0, status: 'uninitialized' };
      
      // Get service start time
      const startTime = await this.getServiceStartTime();
      
      return {
        ...metrics,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        lastPriceUpdateSeconds: metrics.lastPriceUpdate 
          ? Math.floor((Date.now() - metrics.lastPriceUpdate) / 1000) 
          : null,
        cacheStatus: priceCache.status,
        cacheAge: Math.floor((Date.now() - priceCache.lastUpdated) / 1000),
        supportedTokens: this.env.SUPPORTED_TOKENS.split(','),
        priceCount: Object.keys(priceCache.prices).length
      };
    } catch (error) {
      // Log error
      await this.logError((error as Error).message, 'get_metrics');
      
      // Return basic metrics
      return {
        requestCount: 0,
        errorCount: 1,
        priceUpdates: 0,
        uptime: 0,
        lastPriceUpdateSeconds: null,
        cacheStatus: 'error',
        cacheAge: 0,
        supportedTokens: this.env.SUPPORTED_TOKENS.split(','),
        priceCount: 0,
        error: (error as Error).message
      };
    }
  }
}
