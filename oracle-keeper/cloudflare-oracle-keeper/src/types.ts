/**
 * Type definitions for the Oracle Keeper service
 */

export interface Env {
  // Environment variables
  RPC_URL: string;
  CHAIN_ID: string;
  REDSTONE_PRICE_FEED_ADDRESS: string;
  SUPPORTED_TOKENS: string;
  PRICE_CACHE_DURATION_MS: string;
  
  // KV Namespace
  PRICE_CACHE: KVNamespace;
}

export interface PriceData {
  price: number;
  timestamp: number;
}

export interface PriceCache {
  prices: Record<string, PriceData>;
  lastUpdated: number;
  status: 'success' | 'error' | 'fallback';
  error?: string;
}

export interface PricesResponse {
  prices: Record<string, number>;
  timestamp: string;
  lastUpdated: string;
  status: string;
}

export interface PriceResponse {
  symbol: string;
  price: number;
  timestamp: string;
  lastUpdated: string;
  status: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  uptime: number;
  priceCache: {
    lastUpdated: string;
    status: string;
    tokenCount: number;
  };
}

export interface MetricsData {
  requestCount: number;
  errorCount: number;
  priceUpdates: number;
  uptime: number;
  lastPriceUpdate: number;
  lastError: {
    timestamp: number;
    message: string;
    context: string;
  } | null;
}

export interface MetricsResponse extends MetricsData {
  uptime: number;
  lastPriceUpdateSeconds: number | null;
  cacheStatus: string;
  cacheAge: number;
  supportedTokens: string[];
  priceCount: number;
}
