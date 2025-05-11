/**
 * Constants for Oracle Keeper integration
 */

// Base URL for Oracle Keeper service
export const DEFAULT_ORACLE_KEEPER_URL = 'https://oracle-keeper.kevin8396.workers.dev';

// Request timeouts
export const REQUEST_TIMEOUT_MS = 5000; // 5 seconds timeout for network requests

// Retry configuration
export const MAX_RETRY_COUNT = 3;
export const RETRY_BASE_DELAY_MS = 1000;
export const RETRY_MAX_DELAY_MS = 10000;

// Cache configuration
export const CACHE_TTL_MS = 60000; // 1 minute cache validity
export const STALE_CACHE_TTL_MS = 300000; // 5 minutes stale cache validity

// Heartbeat configuration
export const HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds health check interval
