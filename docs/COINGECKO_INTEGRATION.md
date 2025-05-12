# CoinGecko Integration Guide

## Overview

This document outlines the integration of CoinGecko as the primary price data source for the GMX Interface World project. This integration replaces the previous RedStone and Witnet integrations for a more streamlined approach.

## Architecture

The integration follows a source-agnostic approach through the Oracle Keeper middleware:

1. **Oracle Keeper Middleware**: 
   - Acts as a proxy between our application and CoinGecko
   - Provides cached data and rate limiting
   - Handles API key management and fallbacks
   - Endpoints: `/direct-prices`, `/prices`, `/health`

2. **Integration Points**:
   - `OracleKeeperFetcher`: Core class for fetching price data
   - `RobustOracleKeeper`: Enhanced fetcher with retries and fallbacks
   - `WitnetOracleIntegration`: Legacy adapter that now uses CoinGecko

## Configuration

### Environment Variables

Add these to your `.env.local` file for development:

```
# Oracle Keeper URL (required)
VITE_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev

# CoinGecko API Key (optional, for higher rate limits)
VITE_COINGECKO_API_KEY=your_api_key_here

# Development/Production mode toggle
VITE_USE_PRODUCTION_MODE=false
```

### Feature Flags

The application uses feature flags to control which price sources are used:

```typescript
// In worldChainDevMode.ts or worldChainProduction.ts
feature_flags: {
  use_coingecko: true,   // Enable CoinGecko integration
  use_redstone: false,   // Disable RedStone integration
  use_oracle_keeper: true // Use Oracle Keeper middleware
}
```

## Implementation Details

### OracleKeeperFetcher

This class manages connections to the Oracle Keeper service and provides methods to fetch price data. Key methods:

- `fetchTickers()`: Gets pricing information for all tokens
- `fetchDirectPrices()`: Gets real-time prices directly from CoinGecko
- `fetch24hPrices()`: Gets 24-hour historical price data

### WitnetOracleIntegration

This class is kept for backward compatibility but now forwards all requests to CoinGecko via the Oracle Keeper:

- `getPrice(symbol)`: Get price for a single token
- `getPrices()`: Get prices for all tokens
- `getMockPrices()`: Fallback for development/testing

## Usage Examples

### Fetching Prices

```typescript
import { OracleKeeperFetcher } from 'lib/oracleKeeperFetcher/oracleKeeperFetcher';

// Create an instance
const fetcher = new OracleKeeperFetcher({
  chainId: 480, // World Chain ID
  oracleKeeperIndex: 0,
  forceIncentivesActive: false
});

// Get direct prices from CoinGecko
const prices = await fetcher.fetchDirectPrices();
console.log(prices);
```

### Using the WorldChain Context

```typescript
import { useWorldChain } from 'context/WorldChainContext/WorldChainProvider';

function PriceDisplay() {
  const { oracleData } = useWorldChain();
  
  if (oracleData.isLoading) {
    return <div>Loading prices...</div>;
  }
  
  return (
    <div>
      <h2>Current Prices</h2>
      {oracleData.prices && Object.entries(oracleData.prices).map(([symbol, price]) => (
        <div key={symbol}>
          {symbol}: ${price.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

## Troubleshooting

If you encounter issues with the CoinGecko integration:

1. Check that the Oracle Keeper service is running and accessible
2. Verify your environment variables are set correctly
3. Look for rate limiting issues in the console logs
4. Check that feature flags are properly configured

For development, mock data is available as a fallback when the Oracle Keeper is unavailable.
