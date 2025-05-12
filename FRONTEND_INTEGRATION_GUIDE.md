# GMX V1 Frontend Integration Guide for World Chain

## Overview

This guide outlines how to integrate the World Chain GMX V1 implementation, which uses a SimplePriceFeed contract instead of the traditional VaultPriceFeed mechanism. This approach allows us to bypass problematic contract configurations while maintaining compatibility with the existing GMX V1 contracts.

The SimplePriceFeed contract provides a reliable and straightforward way to retrieve token prices without the complexity of the original VaultPriceFeed setup.

## Key Components

- **SimplePriceFeed Contract**: Deployed at `0x7e402dE1894f3dCed30f9bECBc51aD08F2016095`
- **Test Tokens with Fixed Prices**:
  - TUSD: $1.00
  - TBTC: $60,000.00
  - TETH: $3,000.00

## Resources

- World Chain RPC: https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
- Oracle Keeper URL: https://oracle-keeper.kevin8396.workers.dev
- SimplePriceFeed Contract Address: 0x7e402dE1894f3dCed30f9bECBc51aD08F2016095
- GMX V1 Contracts (forked for World Chain): [GitHub Repository](https://github.com/Tytandoteth/gmx-contracts-world)
- Frontend Repository: [GitHub Repository](https://github.com/Tytandoteth/gmx-interface-world)
- Oracle Keeper Repository: [GitHub Repository](https://github.com/Tytandoteth/redstone-oracle-keeper)

## Integration Steps

### 1. Environment Setup

Copy the provided environment variables from `env.world.frontend.sample` to your local environment file (`.env.local` or `.env.production`):

```bash
cp env.world.frontend.sample .env.local
```

Ensure the following environment variables are set:

- `VITE_APP_WORLD_SIMPLE_PRICE_FEED`: Address of the SimplePriceFeed contract
- `VITE_APP_WORLD_TUSD_TOKEN`, `VITE_APP_WORLD_TBTC_TOKEN`, `VITE_APP_WORLD_TETH_TOKEN`: Test token addresses
- `VITE_USE_PRODUCTION_MODE`: Set to true to use production mode

### 2. Using the SimplePriceFeed Contract

The SimplePriceFeed contract provides a simplified interface for retrieving token prices:

```solidity
// SimplePriceFeed Interface
interface ISimplePriceFeed {
    function getPrice(address token) external view returns (uint256);
}
```

### 3. Frontend Implementation

The integration is handled automatically in the WorldChainProvider.tsx file, which now prioritizes the SimplePriceFeed contract when the feature flag is enabled.

#### Using the Utility Functions

We've provided utility functions in `src/lib/worldchain/simplePriceFeed.ts` to make it easier to work with the SimplePriceFeed contract:

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

#### Manual Implementation

If you need to manually fetch prices for tokens without using our utility functions:

```typescript
// Example code to fetch a token price directly
async function getTokenPrice(tokenAddress: string, provider: ethers.Provider): Promise<number> {
  const SIMPLE_PRICE_FEED_ADDRESS = "0x7e402dE1894f3dCed30f9bECBc51aD08F2016095";
  const SIMPLE_PRICE_FEED_ABI = [
    'function getPrice(address token) view returns (uint256)'
  ];
  
  const simplePriceFeed = new ethers.Contract(
    process.env.VITE_APP_WORLD_SIMPLE_PRICE_FEED,
    ['function getPrice(address) view returns (uint256)'],
    provider
  );
  
  try {
    const price = await simplePriceFeed.getPrice(tokenAddress);
    // Convert from 18 decimals
    return ethers.utils.formatUnits(price, 18);
  } catch (error) {
    console.error('Error fetching price:', error);
    return 0;
  }
}
```

### 4. Priority Order for Price Fetching

The WorldChainProvider now uses a cascading approach to fetch token prices:

1. **SimplePriceFeed Contract** (if enabled via feature flag)
2. **Oracle Keeper** (as a fallback if SimplePriceFeed fails or isn't enabled)
3. **Mock Prices** (in development mode or if both above methods fail)

### 5. Enabling the SimplePriceFeed

To enable the SimplePriceFeed contract, ensure the following configuration is set in your WorldChain configuration:

```typescript
// In your worldChainProduction.ts
export const WorldChainProductionConfig = {
  feature_flags: {
    use_simple_price_feed: true,  // Enable SimplePriceFeed
    // other flags...
  },
  // other config...
};
```

## Testing the Integration

To test your implementation:

1. Set up the environment variables as described
2. Make sure the `use_simple_price_feed` feature flag is enabled
3. Ensure connectivity to World Chain
4. Try fetching prices for test tokens and verify they match the expected values:
   - TUSD: Should be close to $1.00
   - TBTC: Should be close to $60,000.00
   - TETH: Should be close to $3,000.00

### Test Component

We've provided a simple test component in `src/components/SimplePriceFeedTest.tsx` that you can use to verify the integration is working correctly. Add it to any page to see live price data from the SimplePriceFeed contract.

## Troubleshooting

### Common Issues

1. **Prices Not Updating**: Ensure the World Chain RPC endpoint is correctly configured and accessible.

2. **Contract Call Failures**: Check that the SimplePriceFeed contract address is correctly set in your environment variables.

3. **Wrong Token Addresses**: Verify that you're using the correct token addresses for World Chain.

4. **Development Mode Active**: Make sure `VITE_USE_PRODUCTION_MODE` is set to `true` if you want to use real contract data.

### Debugging Tools

Use the logger in the WorldChainProvider to see detailed information about price fetching:

```typescript
import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';

// Enable debug logging
logger.enableDebug();
```

## Additional Resources

- Simplified architecture diagram available in `docs/world-chain-architecture.md`
- Contract ABIs available in `abis/` directory
