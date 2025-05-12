# Oracle Keeper Implementation Comparison: Original GMX vs World Chain

## Executive Summary

After analyzing the original GMX interface code and comparing it with our World Chain implementation, we've identified several critical differences and issues that need to be addressed. The original GMX interface has a cleaner, more standardized approach to the Oracle Keeper integration that we should emulate to fix our current problems.

## 1. Core Structural Differences

### Original GMX Implementation

The original GMX implementation has a clear, modular structure:

1. **Clean Interface Definition**: The `OracleFetcher` interface in `types.ts` has precise return types and parameter definitions
2. **Simplified Implementation**: `OracleKeeperFetcher` class implements `OracleFetcher` with consistent method signatures
3. **Clear Configuration**: Oracle URLs are defined in `sdk/src/configs/oracleKeeper.ts`
4. **Utilities Separation**: Helper functions like `buildUrl` and `parseOracleCandle` are well-defined

```typescript
// Original GMX - Clean interface definition
export interface OracleFetcher {
  readonly url: string;
  fetchTickers(): Promise<TickersResponse>;
  fetch24hPrices(): Promise<DayPriceCandle[]>;
  // ... other methods with consistent signatures
}

// Original GMX - Simple URL configuration
const ORACLE_KEEPER_URLS: Record<number, string[]> = {
  [ARBITRUM]: ["https://arbitrum-api.gmxinfra.io", "https://arbitrum-api.gmxinfra2.io"],
  [AVALANCHE]: ["https://avalanche-api.gmxinfra.io", "https://avalanche-api.gmxinfra2.io"],
};
```

### World Chain Implementation Issues

Our implementation has several structural problems:

1. **Duplicate Type Definitions**: Types defined both in `types.ts` and directly in `robust-oracle-keeper.ts`
2. **Inconsistent Method Signatures**: Method signatures in `RobustOracleKeeper` don't match the `OracleFetcher` interface
3. **Mixed Configuration Styles**: Configuration scattered across files with inconsistent patterns
4. **Missing Utility Functions**: Missing crucial functions like `getOracleKeeperUrl` and `buildUrl`

```typescript
// World Chain - Problematic duplicate type definitions
// In types.ts
export type Prices24h = { ... }

// In robust-oracle-keeper.ts (duplicate definition)
interface Prices24h { ... }

// World Chain - Inconsistent method signatures
// In types.ts
export interface OracleFetcher {
  fetch24hPrices(): Promise<DayPriceCandle[]>;
}

// In robust-oracle-keeper.ts
async fetch24hPrices(): Promise<Prices24h> { ... }
```

## 2. Key Method Implementation Differences

### `fetchTickers()` Method

**Original GMX:**
```typescript
fetchTickers(): Promise<TickersResponse> {
  return fetch(buildUrl(this.url!, "/prices/tickers"))
    .then((res) => res.json())
    .then((res) => {
      if (!res.length) {
        throw new Error("Invalid tickers response");
      }
      return res;
    });
}
```

**World Chain Implementation (Issues):**
```typescript
async fetchTickers(): Promise<TickersResponse> {
  try {
    // Special handling for World Chain
    if (isWorldChain(this.chainId)) {
      return this.getWorldChainMockData();
    }
    
    // Nonexistent utility function
    const response = await fetchWithRetry<TickersResponse>(tickersUrl);
    // ...
  }
}
```

### Return Type Issues

**Original GMX:**
- `fetch24hPrices()` returns `Promise<DayPriceCandle[]>`
- `fetchIncentivesRewards()` returns `Promise<RawIncentivesStats | null>`
- `fetchPostBatchReport()` returns `Promise<Response>`

**World Chain Implementation (Issues):**
- `fetch24hPrices()` returns `Promise<Prices24h>` (incompatible with interface)
- `fetchIncentivesRewards()` returns correct type but implementation is different
- `fetchPostBatchReport()` doesn't transform `Response` to `boolean` as interface expects

## 3. Configuration Management Differences

### Original GMX

The original GMX uses a clean configuration pattern:
- URLs managed in `sdk/src/configs/oracleKeeper.ts`
- Simple functions to get URLs and manage failover
- No hardcoded values in the implementation

```typescript
// Original GMX - Configuration in dedicated file
const ORACLE_KEEPER_URLS: Record<number, string[]> = {
  [ARBITRUM]: ["https://arbitrum-api.gmxinfra.io", "https://arbitrum-api.gmxinfra2.io"],
  // Other chains...
};

export function getOracleKeeperUrl(chainId: number, index: number) {
  const urls = ORACLE_KEEPER_URLS[chainId];
  // ...
}
```

### World Chain Implementation

Our implementation mixes configuration concerns:
- Some configuration in `oracleKeeperConstants.ts`
- Some hardcoded in `robust-oracle-keeper.ts`
- Special handling for World Chain scattered throughout the code
- Inconsistent environment variable usage

```typescript
// World Chain - Mixed configuration
// In oracleKeeperConstants.ts
export const DEFAULT_ORACLE_KEEPER_URL = 'https://oracle-keeper.kevin8396.workers.dev';

// In robust-oracle-keeper.ts (also defining configuration)
const DEFAULT_ORACLE_KEEPER_URL = import.meta.env.VITE_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev';
```

## 4. Error Handling and Fallback Differences

### Original GMX

- Clean error handling in each method
- Simple `switchOracleKeeper()` method for failover
- Standardized pattern across all methods

```typescript
// Original GMX - Consistent error handling
.catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  this.switchOracleKeeper();
  throw e;
});
```

### World Chain Implementation

- Inconsistent error handling across methods
- Custom error handling in each method
- Some methods using try/catch, others using promise chain
- Complex fallback to mock data for World Chain

## 5. Utility Function Differences

### Original GMX

- Uses a simple `buildUrl()` utility for URL construction
- Consistent usage across all methods
- Clean parameter passing

```typescript
// Original GMX - Clean URL building
fetch(buildUrl(this.url!, "/prices/candles", { tokenSymbol, period, limit }))
```

### World Chain Implementation

- Manual URL construction in each method
- Inconsistent parameter handling
- Duplicated code

```typescript
// World Chain - Manual URL construction
const pricesUrl = this.url.endsWith('/') 
  ? `${this.url}prices/24h` 
  : `${this.url}/prices/24h`;
```

## Root Cause Analysis and Solution

### Root Cause

The main issues appear to stem from:

1. **Incomplete Adaptation**: Our code is based on the original GMX implementation but was incompletely adapted to World Chain
2. **Interface Misalignment**: The interface defined in `types.ts` doesn't match our implementation
3. **Missing Utilities**: We didn't port over key utilities from the original codebase
4. **Configuration Scattered**: Configuration is spread across multiple files with inconsistencies

### Solution Approach

To fix the issues, we should:

1. **Align with Original Implementation**: Follow the pattern from the original GMX codebase where possible
2. **Fix Interface Consistency**: Make sure our `RobustOracleKeeper` properly implements the `OracleFetcher` interface
3. **Centralize Configuration**: Move all Oracle Keeper configuration to a dedicated file
4. **Port Missing Utilities**: Implement missing utilities like `buildUrl` or use alternatives

## Implementation Plan

### 1. Fix Interface Definition (~/src/lib/oracleKeeperFetcher/types.ts)

```typescript
// Update interface to match implementation or vice versa
export interface OracleFetcher {
  readonly url: string;
  fetchTickers(): Promise<TickersResponse>;
  fetch24hPrices(): Promise<Prices24h>;  // Changed to match our implementation
  fetchOracleCandles(tokenSymbol: string, period: string, limit: number): Promise<FromNewToOldArray<Bar>>;
  fetchIncentivesRewards(): Promise<RawIncentivesStats | null>;
  fetchPostBatchReport(body: BatchReportBody): Promise<boolean>;  // Return type changed to match implementation
  fetchPostFeedback(body: UserFeedbackBody): Promise<boolean>;    // Return type changed to match implementation
  fetchUiVersion(): Promise<string | null>;  // Adjusted to match our implementation
  fetchDirectPrices(): Promise<DirectPricesResponse>;  // Added for World Chain
  fetchApys(): Promise<ApyResponse>;  // Adjusted to match our implementation
}
```

### 2. Implement Missing Utilities

```typescript
// Create ~/src/lib/oracleKeeperFetcher/utils.ts
export function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

// Simple logger implementation
export const logger = {
  info: (message: string, ...args: any[]): void => {
    if (import.meta.env.MODE !== 'production') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};
```

### 3. Update Implementation to Match Interface

```typescript
// In ~/src/lib/oracleKeeperFetcher/robust-oracle-keeper.ts
async fetchTickers(): Promise<TickersResponse> {
  try {
    if (isWorldChain(this.chainId)) {
      return this.getWorldChainMockData();
    }

    const tickersUrl = buildUrl(this.url, "/prices/tickers");
    
    const response = await fetch(tickersUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as TickersResponse;
    return data;
  } catch (error: unknown) {
    logger.error('Failed to fetch tickers:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
```

### 4. Centralize Configuration

```typescript
// In ~/src/lib/oracleKeeperFetcher/oracleKeeperConfig.ts
import { WORLD } from 'sdk/configs/chains';

export const ORACLE_KEEPER_URLS: Record<number, string[]> = {
  [WORLD]: [
    "https://oracle-keeper.kevin8396.workers.dev"
  ],
};

export const DEFAULT_ORACLE_KEEPER_URL = ORACLE_KEEPER_URLS[WORLD][0];

export function getOracleKeeperUrl(chainId: number, index: number = 0): string {
  const urls = ORACLE_KEEPER_URLS[chainId];
  
  if (!urls || urls.length === 0) {
    return DEFAULT_ORACLE_KEEPER_URL;
  }
  
  return urls[index] || urls[0];
}
```

## Conclusion

By aligning our implementation more closely with the original GMX code structure, we can resolve the current Oracle Keeper integration issues. The original code has a cleaner architecture that we should follow for consistency and maintainability.

The interface definition mismatches are the primary cause of type errors, and the scattered configuration makes the code harder to maintain. By centralizing configuration and ensuring our implementation properly follows the interface, we can create a more robust Oracle Keeper integration for World Chain.
