import { 
  DEFAULT_ORACLE_KEEPER_URL,
  REQUEST_TIMEOUT_MS,
  MAX_RETRY_COUNT,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  CACHE_TTL_MS,
  STALE_CACHE_TTL_MS,
  HEALTH_CHECK_INTERVAL_MS
} from "../oracleKeeperConstants";

import { OracleKeeperCache, fetchWithRetryAndCache, checkOracleKeeperHealth } from "../oracleKeeperUtils";
import { RobustOracleKeeper } from "../robust-oracle-keeper";
import { TickersResponse } from "../types";
import { WORLD } from "sdk/configs/chains";

// Define PriceData interface since it's not exported from types.ts
interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

// Interface for a ticker item with source property
interface TickerItem {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
  source?: string;
}

// Debug severity levels
export enum DebugLevel {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR"
}

// Debug module identifiers
export enum DebugModule {
  CACHE = "CACHE",
  FETCH = "FETCH",
  HEALTH = "HEALTH",
  KEEPER = "KEEPER",
  REDSTONE = "REDSTONE",
  FALLBACK = "FALLBACK"
}

// Interface for debug log entries
interface DebugLogEntry {
  timestamp: number;
  level: DebugLevel;
  module: DebugModule;
  message: string;
  data?: any;
}

/**
 * Oracle Keeper Debugger
 * Comprehensive utility for diagnosing Oracle Keeper integration issues
 */
export class OracleKeeperDebugger {
  private logs: DebugLogEntry[] = [];
  private cache: OracleKeeperCache = new OracleKeeperCache();
  private keeper?: RobustOracleKeeper;
  private oracleKeeperUrl: string;
  private isVerbose: boolean;

  constructor(url: string = DEFAULT_ORACLE_KEEPER_URL, verbose: boolean = true) {
    this.oracleKeeperUrl = url;
    this.isVerbose = verbose;
    this.log(DebugLevel.INFO, DebugModule.KEEPER, `Debugger initialized for URL: ${url}`);
  }

  /**
   * Initialize the RobustOracleKeeper instance
   */
  initKeeper(): RobustOracleKeeper {
    if (!this.keeper) {
      this.keeper = new RobustOracleKeeper({
        chainId: WORLD,
        oracleKeeperIndex: 0,
        forceIncentivesActive: false,
      });
      
      this.log(DebugLevel.INFO, DebugModule.KEEPER, "Initialized OracleKeeper instance", {
        url: this.keeper.url,
        chainId: WORLD
      });
    }
    
    return this.keeper;
  }

  /**
   * Log a debug entry
   * @param level - Severity level
   * @param module - Module identifier
   * @param message - Log message
   * @param data - Optional data payload
   */
  log(level: DebugLevel, module: DebugModule, message: string, data?: any): void {
    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      module,
      message,
      data
    };
    
    this.logs.push(entry);
    
    if (this.isVerbose) {
      // Format for console output
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${level}] [${module}]`;
      
      switch (level) {
        case DebugLevel.ERROR:
          console.error(prefix, message, data || '');
          break;
        case DebugLevel.WARNING:
          console.warn(prefix, message, data || '');
          break;
        default:
          console.log(prefix, message, data || '');
      }
    }
  }

  /**
   * Run a health check on the Oracle Keeper
   */
  async testHealthCheck(): Promise<boolean> {
    this.log(DebugLevel.INFO, DebugModule.HEALTH, "Checking Oracle Keeper health...");
    
    try {
      const startTime = performance.now();
      const isHealthy = await checkOracleKeeperHealth(this.oracleKeeperUrl);
      const duration = performance.now() - startTime;
      
      if (isHealthy) {
        this.log(DebugLevel.INFO, DebugModule.HEALTH, "Oracle Keeper is healthy", {
          responseTime: `${duration.toFixed(2)}ms`
        });
      } else {
        this.log(DebugLevel.WARNING, DebugModule.HEALTH, "Oracle Keeper is not healthy", {
          responseTime: `${duration.toFixed(2)}ms`
        });
      }
      
      return isHealthy;
    } catch (error) {
      this.log(DebugLevel.ERROR, DebugModule.HEALTH, "Health check failed with exception", { error });
      return false;
    }
  }

  /**
   * Test the cache functionality
   */
  testCache(): boolean {
    this.log(DebugLevel.INFO, DebugModule.CACHE, "Testing cache functionality...");
    
    try {
      const testKey = "test_key";
      // Define testData with a specific type to avoid typechecking issues
      interface TestData {
        value: string;
        timestamp: number;
      }
      const testData: TestData = { value: "test_value", timestamp: Date.now() };
      
      // Test cache set
      this.cache.set<TestData>(testKey, testData);
      this.log(DebugLevel.INFO, DebugModule.CACHE, "Cache set operation successful", {
        key: testKey,
        data: testData
      });
      
      // Test cache get (fresh)
      const cachedData = this.cache.get<TestData>(testKey);
      if (cachedData && cachedData.value === testData.value) {
        this.log(DebugLevel.INFO, DebugModule.CACHE, "Cache get operation successful", {
          key: testKey,
          data: cachedData
        });
      } else {
        this.log(DebugLevel.ERROR, DebugModule.CACHE, "Cache get operation failed", {
          key: testKey,
          expected: testData,
          actual: cachedData
        });
        return false;
      }
      
      // Test cache ttl by setting the ttl to 1ms and waiting 10ms
      this.log(DebugLevel.INFO, DebugModule.CACHE, "Testing cache expiration...");
      const expiredData = this.cache.get(testKey, 1);
      
      // Wait 10ms
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }
      
      const expiredResult = this.cache.get(testKey, 1);
      
      if (expiredResult === undefined) {
        this.log(DebugLevel.INFO, DebugModule.CACHE, "Cache TTL expiration working correctly");
      } else {
        this.log(DebugLevel.ERROR, DebugModule.CACHE, "Cache TTL expiration failed - still returned data");
        return false;
      }
      
      // Test stale cache
      const staleData = this.cache.getStale<TestData>(testKey);
      if (staleData && staleData.value === testData.value) {
        this.log(DebugLevel.INFO, DebugModule.CACHE, "Stale cache retrieval working correctly");
      } else {
        this.log(DebugLevel.ERROR, DebugModule.CACHE, "Stale cache retrieval failed");
        return false;
      }
      
      return true;
    } catch (error) {
      this.log(DebugLevel.ERROR, DebugModule.CACHE, "Cache test failed with exception", { error });
      return false;
    }
  }

  /**
   * Test fetch with retry functionality
   * @param url - URL to test with
   */
  async testFetchWithRetry(url: string = `${this.oracleKeeperUrl}/prices`): Promise<boolean> {
    this.log(DebugLevel.INFO, DebugModule.FETCH, `Testing fetch with retry to ${url}...`);
    
    try {
      const cacheKey = `debug_test_${Date.now()}`;
      const startTime = performance.now();
      
      // Try to fetch with retry and cache
      const data = await fetchWithRetryAndCache<any>(
        url,
        {},
        cacheKey,
        MAX_RETRY_COUNT
      );
      
      const duration = performance.now() - startTime;
      
      this.log(DebugLevel.INFO, DebugModule.FETCH, "Fetch with retry successful", {
        url,
        responseTime: `${duration.toFixed(2)}ms`,
        dataSize: JSON.stringify(data).length,
        cacheKey
      });
      
      // Verify the cache was populated
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        this.log(DebugLevel.INFO, DebugModule.FETCH, "Cache was populated correctly");
      } else {
        this.log(DebugLevel.WARNING, DebugModule.FETCH, "Cache was not populated");
      }
      
      return true;
    } catch (error) {
      this.log(DebugLevel.ERROR, DebugModule.FETCH, "Fetch with retry failed", { 
        url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Test the full RobustOracleKeeper functionality with various scenarios
   */
  async testRobustOracleKeeper(): Promise<boolean> {
    this.log(DebugLevel.INFO, DebugModule.KEEPER, "Testing RobustOracleKeeper...");
    
    try {
      const keeper = this.initKeeper();
      
      // Test fetchTickers
      this.log(DebugLevel.INFO, DebugModule.KEEPER, "Testing fetchTickers()...");
      const startTime = performance.now();
      const tickers = await keeper.fetchTickers();
      const duration = performance.now() - startTime;
      
      // Verify the response
      if (Array.isArray(tickers) && tickers.length > 0) {
        this.log(DebugLevel.INFO, DebugModule.KEEPER, "fetchTickers() successful", {
          responseTime: `${duration.toFixed(2)}ms`,
          tickerCount: tickers.length,
          firstTicker: tickers[0]
        });
      } else {
        this.log(DebugLevel.WARNING, DebugModule.KEEPER, "fetchTickers() returned empty or invalid data", {
          responseTime: `${duration.toFixed(2)}ms`,
          data: tickers
        });
      }
      
      // Test fetch24hPrices
      this.log(DebugLevel.INFO, DebugModule.KEEPER, "Testing fetch24hPrices()...");
      const start24h = performance.now();
      const prices24h = await keeper.fetch24hPrices();
      const duration24h = performance.now() - start24h;
      
      if (Array.isArray(prices24h) && prices24h.length > 0) {
        this.log(DebugLevel.INFO, DebugModule.KEEPER, "fetch24hPrices() successful", {
          responseTime: `${duration24h.toFixed(2)}ms`,
          priceCount: prices24h.length
        });
      } else {
        this.log(DebugLevel.WARNING, DebugModule.KEEPER, "fetch24hPrices() returned empty or invalid data", {
          responseTime: `${duration24h.toFixed(2)}ms`,
          data: prices24h
        });
      }
      
      // Test fetchOracleCandles
      this.log(DebugLevel.INFO, DebugModule.KEEPER, "Testing fetchOracleCandles()...");
      const startCandles = performance.now();
      const candles = await keeper.fetchOracleCandles("BTC", "1h", 24);
      const durationCandles = performance.now() - startCandles;
      
      if (Array.isArray(candles) && candles.length > 0) {
        this.log(DebugLevel.INFO, DebugModule.KEEPER, "fetchOracleCandles() successful", {
          responseTime: `${durationCandles.toFixed(2)}ms`,
          candleCount: candles.length
        });
      } else {
        this.log(DebugLevel.WARNING, DebugModule.KEEPER, "fetchOracleCandles() returned empty data", {
          responseTime: `${durationCandles.toFixed(2)}ms`,
          data: candles
        });
      }
      
      return true;
    } catch (error) {
      this.log(DebugLevel.ERROR, DebugModule.KEEPER, "RobustOracleKeeper test failed with exception", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Test forced network failure scenarios to verify fallback behavior
   */
  async testFallbackBehavior(): Promise<boolean> {
    this.log(DebugLevel.INFO, DebugModule.FALLBACK, "Testing fallback behavior...");
    
    // Set up an invalid URL to force failure
    const invalidUrl = "https://invalid-oracle-keeper-url.example.com";
    
    try {
      // Try to fetch from an invalid URL
      this.log(DebugLevel.INFO, DebugModule.FALLBACK, "Testing with invalid URL to force fallback...");
      
      try {
        await fetchWithRetryAndCache<any>(
          invalidUrl,
          {},
          "test_fallback",
          1 // Only try once to speed up test
        );
        
        this.log(DebugLevel.ERROR, DebugModule.FALLBACK, "Expected failure but request succeeded");
        return false;
      } catch (error) {
        this.log(DebugLevel.INFO, DebugModule.FALLBACK, "Fetch failed as expected", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Test RobustOracleKeeper fallback to mock data
      const keeper = new RobustOracleKeeper({
        chainId: WORLD,
        oracleKeeperIndex: 0,
        forceIncentivesActive: false,
      });
      
      // Monkey patch the URL to force failure
      (keeper as any).url = invalidUrl;
      
      this.log(DebugLevel.INFO, DebugModule.FALLBACK, "Testing RobustOracleKeeper fallback to mock data...");
      const startTime = performance.now();
      const tickers = await keeper.fetchTickers();
      const duration = performance.now() - startTime;
      
      // Verify we got mock data
      if (Array.isArray(tickers) && tickers.length > 0) {
        this.log(DebugLevel.INFO, DebugModule.FALLBACK, "Successfully fell back to mock data", {
          responseTime: `${duration.toFixed(2)}ms`,
          tickerCount: tickers.length,
          firstTicker: tickers[0]
        });
        
        // Check if the source is "fallback"
        // Cast to TickerItem to access source property
        const firstTicker = tickers[0] as TickerItem;
        if (firstTicker.source === "fallback") {
          this.log(DebugLevel.INFO, DebugModule.FALLBACK, "Mock data correctly marked as fallback");
        } else {
          this.log(DebugLevel.WARNING, DebugModule.FALLBACK, "Mock data not correctly marked");
        }
        
        return true;
      } else {
        this.log(DebugLevel.ERROR, DebugModule.FALLBACK, "Failed to get fallback data", {
          responseTime: `${duration.toFixed(2)}ms`,
          data: tickers
        });
        return false;
      }
    } catch (error) {
      this.log(DebugLevel.ERROR, DebugModule.FALLBACK, "Fallback test failed with exception", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Run all tests in sequence
   */
  async runAllTests(): Promise<{ success: boolean; results: Record<string, boolean> }> {
    this.log(DebugLevel.INFO, DebugModule.KEEPER, "Running all Oracle Keeper tests...");
    
    const results: Record<string, boolean> = {};
    
    // Test health check
    results.healthCheck = await this.testHealthCheck();
    
    // Test cache
    results.cache = this.testCache();
    
    // Test fetch with retry
    results.fetchWithRetry = await this.testFetchWithRetry();
    
    // Test RobustOracleKeeper
    results.robustOracleKeeper = await this.testRobustOracleKeeper();
    
    // Test fallback behavior
    results.fallbackBehavior = await this.testFallbackBehavior();
    
    // Check overall success
    const success = Object.values(results).every(result => result);
    
    this.log(
      success ? DebugLevel.INFO : DebugLevel.ERROR,
      DebugModule.KEEPER,
      `All tests ${success ? 'passed' : 'failed'}`,
      results
    );
    
    return { success, results };
  }

  /**
   * Get the logs
   */
  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.log(DebugLevel.INFO, DebugModule.KEEPER, "Logs cleared");
  }
}

// Export a debug instance for direct use
export const oracleDebugger = new OracleKeeperDebugger();

// Helper function to run a quick test from the browser console
export const debugOracleKeeper = async (): Promise<void> => {
  console.log("Starting Oracle Keeper debug...");
  const keeper = new OracleKeeperDebugger();
  const results = await keeper.runAllTests();
  console.log("Debug complete:", results);
  console.log("Full logs:", keeper.getLogs());
};
