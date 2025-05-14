# Price Feed Integration

This guide explains how to integrate price feeds with your GMX V1 contracts on World Chain.

## Overview

World Chain GMX provides two options for price data:

1. **VaultPriceFeed Contract** (on-chain, for transactions)
2. **Optional REST API** (off-chain, for UI display only)

## VaultPriceFeed Contract

The VaultPriceFeed contract is the authoritative source of price data for all transactions on World Chain GMX.

### Contract Details

- **Address**: `0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf`
- **Interface**: Standard GMX V1 VaultPriceFeed interface
- **Usage**: Required for all transactions (swaps, positions, etc.)

### Reading Prices from VaultPriceFeed

```typescript
import { ethers } from 'ethers';
import VaultPriceFeedABI from '../abis/world/VaultPriceFeed.json';

// Function to get price from VaultPriceFeed
async function getTokenPrice(
  tokenAddress: string, 
  provider: ethers.providers.Provider
): Promise<number | null> {
  try {
    const vaultPriceFeed = new ethers.Contract(
      '0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf', // VaultPriceFeed address
      VaultPriceFeedABI,
      provider
    );
    
    const price = await vaultPriceFeed.getPrice(tokenAddress, false);
    
    // Price is returned with 30 decimals in GMX V1
    return parseFloat(ethers.utils.formatUnits(price, 30));
  } catch (error) {
    console.error('Error fetching price from VaultPriceFeed:', error);
    return null;
  }
}
```

### Creating a Price Feed Hook

```typescript
// src/hooks/useVaultPrices.ts
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useProvider } from 'wagmi';
import VaultPriceFeedABI from '../abis/world/VaultPriceFeed.json';

export function useVaultPrices(tokenAddresses: string[]) {
  const provider = useProvider();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!provider || !tokenAddresses.length) return;
    
    const vaultPriceFeed = new ethers.Contract(
      '0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf',
      VaultPriceFeedABI,
      provider
    );
    
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const priceMap: Record<string, number> = {};
        
        await Promise.all(
          tokenAddresses.map(async (address) => {
            const price = await vaultPriceFeed.getPrice(address, false);
            priceMap[address] = parseFloat(ethers.utils.formatUnits(price, 30));
          })
        );
        
        setPrices(priceMap);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching prices:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
    
    // Optional: Set up polling for regular updates
    const interval = setInterval(fetchPrices, 15000); // 15 seconds
    
    return () => clearInterval(interval);
  }, [provider, tokenAddresses]);
  
  return { prices, loading, error };
}
```

## Optional REST API (UI Display Only)

For UI-only price display, you can optionally use the Oracle Keeper REST API.

### API Details

- **Base URL**: `https://oracle-keeper.kevin8396.workers.dev`
- **Endpoints**:
  - `/prices`: Cached prices (refreshed every minute)
  - `/direct-prices`: Real-time prices (bypasses cache)
  - `/health`: Service health status

### Creating a REST API Price Hook

```typescript
// src/hooks/useWorldPrices.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useWorldPrices() {
  const { data, error, isLoading } = useSWR(
    'https://oracle-keeper.kevin8396.workers.dev/direct-prices',
    fetcher,
    { refreshInterval: 10000 } // 10 seconds
  );
  
  return {
    prices: data?.prices || {},
    source: data?.source || 'loading',
    timestamp: data?.timestamp,
    isLoading,
    isError: !!error
  };
}
```

### Usage Example

```tsx
import { useWorldPrices } from '../hooks/useWorldPrices';

function PriceDisplay() {
  const { prices, source, isLoading, isError } = useWorldPrices();
  
  if (isLoading) return <div>Loading prices...</div>;
  if (isError) return <div>Error loading prices</div>;
  
  return (
    <div>
      <p>Price source: {source}</p>
      <ul>
        <li>WLD: ${prices.WLD?.toFixed(2) || 'N/A'}</li>
        <li>WETH: ${prices.WETH?.toFixed(2) || 'N/A'}</li>
        <li>MAG: ${prices.MAG?.toFixed(4) || 'N/A'}</li>
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Always use VaultPriceFeed for transactions**
   - The REST API is for UI display only
   - All contract interactions must use on-chain price data

2. **Implement fallbacks**
   - Handle API errors gracefully
   - Provide reasonable defaults when prices are unavailable

3. **Add loading states**
   - Show loading indicators while fetching prices
   - Prevent interactions that require prices while loading

4. **Implement caching**
   - Cache prices locally to reduce API calls
   - Update cached prices at reasonable intervals

## Utility Functions

We've provided utility functions in `src/lib/worldchain/simplePriceFeed.ts` to make it easier to work with the VaultPriceFeed contract:

```typescript
// Import the utility functions
import { getTokenPriceFromFeed, getTokenPriceBySymbol } from 'lib/worldchain/simplePriceFeed';

// Example: Get price for a token by address
async function fetchTokenPrice(tokenAddress: string, provider: ethers.Provider): Promise<number | null> {
  return getTokenPriceFromFeed(tokenAddress, provider);
}

// Example: Get price for a token by symbol
async function fetchTokenPriceBySymbol(
  symbol: string, 
  tokenAddresses: Record<string, string>,
  provider: ethers.Provider
): Promise<number | null> {
  return getTokenPriceBySymbol(symbol, tokenAddresses, provider);
}
```
