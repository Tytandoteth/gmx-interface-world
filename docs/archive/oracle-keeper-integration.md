# Oracle Keeper Integration Guide

This document describes how the GMX Interface integrates with the RedStone Oracle Keeper deployed on Cloudflare Workers.

## Overview

The GMX Interface relies on the Oracle Keeper service to provide price data for trading pairs on World Chain. The Oracle Keeper is a Cloudflare Worker application that communicates with RedStone's price feeds and makes this data available via REST API endpoints.

## Integration Points

### 1. Oracle Keeper URL Configuration

The Oracle Keeper URL is configured in these key locations:

- **SDK Configuration**: `sdk/src/configs/oracleKeeper.ts`
  ```typescript
  const WORLD_ORACLE_KEEPER_URL = "https://oracle-keeper.kevin8396.workers.dev";
  ```

- **World Chain Dev Mode**: `src/lib/worldchain/worldChainDevMode.ts`
  ```typescript
  const WORLD_ORACLE_KEEPER_URL = "https://oracle-keeper.kevin8396.workers.dev";
  ```

- **Oracle Keeper Service**: `src/lib/redstone/OracleKeeperService.ts`
  ```typescript
  this.baseUrl = import.meta.env.VITE_APP_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev';
  ```

### 2. Price Feed Configuration

The RedStone price feed contract address is configured in:

```typescript
priceFeedAddress: import.meta.env.VITE_APP_WORLD_REDSTONE_PRICE_FEED as string || "0x163f8c2467924be0ae7b5347228cabf260318753"
```

### 3. Supported Tokens

The default tokens tracked through the Oracle Keeper are:

```typescript
trackedTokens: ["WLD", "ETH", "BTC", "USDC", "USDT"]
```

## API Endpoints

The Oracle Keeper provides these endpoints that the GMX interface uses:

- **GET /prices**: Retrieves prices for all supported tokens
- **GET /price/{symbol}**: Retrieves the price for a specific token
- **GET /health**: Checks the health status of the Oracle Keeper
- **GET /metrics**: Provides operational metrics for monitoring

## Market Configuration

The markets in `sdk/src/configs/markets.ts` are configured to use the token addresses that match the Oracle Keeper's price data:

```typescript
// WLD/USD [WLD-USDC]
"0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652": {
  marketTokenAddress: "0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652",
  indexTokenAddress: "0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652",
  longTokenAddress: "0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652",
  shortTokenAddress: "0x4D8826Ae25866b72FF5b756a2F7E203D5b92Ceb0".toLowerCase(),
}
```

## Token Configuration

The tokens in `sdk/src/configs/tokens.ts` are configured to match the tokens supported by the Oracle Keeper:

- WLD (World): `0x58e670fF93aC5527bf9c3c31D03237D43439cD1F`
- WWLD (Wrapped World): `0x1Bd411135304469c4c15312f1939da115a1AE4c6`
- USDC (USD Coin): `0x4D8826Ae25866b72FF5b756a2F7E203D5b92Ceb0`
- USDT (Tether): `0x6d4664586b7035B3db86c5Db0F17Bed31868A797`

## Flow Diagram

```
┌─────────────────┐     ┌───────────────────┐     ┌────────────────┐
│                 │     │                   │     │                │
│  GMX Interface  │────▶│  Oracle Keeper    │────▶│ RedStone Data  │
│                 │◀────│  (Cloudflare)     │◀────│                │
└─────────────────┘     └───────────────────┘     └────────────────┘
```

## Troubleshooting

If prices aren't displaying in the GMX interface:

1. Check the browser console for errors related to the Oracle Keeper
2. Visit the health endpoint directly: `https://oracle-keeper.kevin8396.workers.dev/health`
3. Verify that the Oracle Keeper URL is correct in all configuration files
4. Check that the cron trigger is running in the Cloudflare Workers dashboard
5. Verify that the KV namespace is working correctly

## Monitoring

Monitor the Oracle Keeper's performance using:

1. The metrics endpoint: `https://oracle-keeper.kevin8396.workers.dev/metrics`
2. Cloudflare Workers dashboard analytics
3. Browser console logs in the GMX interface

## Development Milestones

### 1. Semi-Working State (May 11, 2025)

A semi-working version has been achieved with the following characteristics:

#### What's Working
- Basic interface rendering correctly
- Oracle Keeper connection established
- TypeScript configuration partially resolved
- Enhanced diagnostic logging for troubleshooting

#### Current Limitations
- Some TypeScript errors still present in the codebase
- Potential intermittent Oracle Keeper connectivity issues
- Enhanced error handling still being refined

#### Implemented Improvements
- Added comprehensive diagnostic logging system in `src/lib/oracleKeeperFetcher/debug/diagnostics.ts`
- Implemented request correlation IDs for tracking
- Added performance timing for network requests
- Created structured logging with different categories and log levels
- Enhanced caching mechanism for improved reliability

#### Next Steps
- Complete resolution of remaining TypeScript errors
- Finalize enhanced error handling implementation
- Add circuit breaker pattern for automatic failover
- Implement proactive health check monitoring
