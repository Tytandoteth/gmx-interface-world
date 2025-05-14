# Oracle Keeper Integration Guide

This document describes how the GMX Interface for World Chain integrates with the RedStone Oracle Keeper.

## Architecture Overview

The Oracle Keeper integration provides price feeds for the GMX trading platform on World Chain. Here's how the components work together:

```
┌───────────────────┐     ┌─────────────────────┐     ┌────────────────┐
│                   │     │                     │     │                │
│  GMX Interface    │────▶│  RedStone Oracle    │────▶│  RedStone      │
│  (This Repo)      │◀────│  Keeper             │◀────│  Price Feeds   │
│                   │     │                     │     │                │
└───────────────────┘     └─────────────────────┘     └────────────────┘
         │                          │                          │
         │                          │                          │
         ▼                          ▼                          ▼
┌───────────────────┐     ┌─────────────────────┐     ┌────────────────┐
│                   │     │                     │     │                │
│  GMX Contracts    │     │  Cloudflare KV      │     │  World Chain   │
│  on World Chain   │     │  (Price Cache)      │     │  RPC Endpoint  │
│                   │     │                     │     │                │
└───────────────────┘     └─────────────────────┘     └────────────────┘
```

## Integration Points

### 1. Oracle Keeper Fetcher

The `oracleKeeperFetcher.ts` component handles communication with the Oracle Keeper API. It fetches:
- Current prices for all supported tokens
- 24-hour price data for charts and statistics

### 2. World Chain Provider

The `WorldChainProvider.tsx` component manages the connection to World Chain and the Oracle Keeper, providing context to the rest of the application.

### 3. Token Configuration

Token addresses and configurations in `tokens.ts` are set to match the addresses used in the Oracle Keeper and on World Chain.

### 4. Market Configuration

Market settings in `markets.ts` define which trading pairs are available and use the correct contract addresses for World Chain.

## API Endpoints

### Oracle Keeper API

- **Base URL**: `https://oracle-keeper.kevin8396.workers.dev`
  
- **Health Check**: 
  ```
  GET /health
  ```
  Returns the current health status of the Oracle Keeper.

- **Get Prices**:
  ```
  GET /prices
  ```
  Returns current prices for all supported tokens (WLD, ETH, BTC).

### Response Format

The `/prices` endpoint returns data in the following format:

```json
{
  "prices": {
    "WLD": 4.25,
    "ETH": 3500.00,
    "BTC": 60000.00
  },
  "lastUpdated": 1683822000000,
  "status": "success"
}
```

## Error Handling

The Oracle Keeper integration includes several fallback mechanisms:

1. **Cache Fallback**: If the Oracle Keeper can't fetch fresh prices, it returns cached prices
2. **Mock Data Fallback**: If no cache is available, the system uses mock price data
3. **Status Reporting**: The status field in the response indicates data quality

## Configuration

The Oracle Keeper URL is configured in the following files:

1. `/src/lib/oracleKeeperFetcher/oracleKeeperFetcher.ts`
2. `/src/context/WorldChainContext/WorldChainProvider.tsx`

## Testing

To test the Oracle Keeper integration:

1. Run the GMX Interface locally
2. Open the browser console to check for API calls to the Oracle Keeper
3. Verify that price data is displayed correctly for World Chain markets
4. Check error handling by temporarily changing the Oracle Keeper URL to an invalid value

## Troubleshooting

Common issues and solutions:

1. **Price Data Not Loading**
   - Check the console for errors in API calls
   - Verify that the Oracle Keeper URL is correct
   - Check if the Oracle Keeper is operational using the `/health` endpoint

2. **Wrong Prices Displayed**
   - Check if the interface is using mock data (indicated in console logs)
   - Verify token symbols match between the interface and Oracle Keeper
   - Check market configurations in `markets.ts`

3. **CORS Errors**
   - Ensure the Oracle Keeper has the correct CORS headers enabled
   - Check for any browser extensions blocking API calls

## Future Improvements

1. **WebSocket Support**: Add WebSocket connection for real-time price updates
2. **Additional Tokens**: Expand support to more tokens beyond WLD, ETH, and BTC
3. **Redundancy**: Add multiple Oracle Keeper instances for enhanced reliability
4. **Performance Optimization**: Reduce API call frequency and improve caching
