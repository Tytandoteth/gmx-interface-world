# Token Integration Architecture

This document outlines the standardized approach to token handling throughout the World Chain GMX interface.

## Overview

The token integration architecture provides a consistent, type-safe way to work with tokens across the application. It encompasses:

1. **Token Addresses**: Standardized access to token addresses with environment detection
2. **Token Prices**: Safe access to oracle price data with proper fallbacks
3. **Token Metadata**: Centralized token information and configuration
4. **Error Prevention**: Defensive coding practices to prevent runtime errors

## Architecture Components

### 1. Token Address Service

Located at `src/services/TokenAddressService.ts`, this service provides:

- Environment-aware token address resolution
- Address validation and error handling
- Automatic fallbacks for development environments
- Token type <-> address mapping

```typescript
import { TokenType, getTokenAddressSafe } from 'services/TokenAddressService';

// Safe access to token addresses with fallbacks
const wldAddress = getTokenAddressSafe(TokenType.WLD);

// String version that returns empty string instead of null
const ethAddress = getTokenAddressString(TokenType.ETH);

// Check if an address is valid
if (isTokenAddressValid(TokenType.USDC)) {
  // Use address safely
}
```

### 2. Token Price Service

Located at `src/services/TokenPriceService.ts`, this service provides:

- Safe access to token prices with fallbacks
- Price formatting utilities
- Trend detection for price movement
- Both React hooks and class-based APIs

```typescript
import { 
  useTokenPrice, 
  useFormattedTokenPrice,
  tokenPriceManager
} from 'services/TokenPriceService';

// React hook for accessing prices
const wldPrice = useTokenPrice('WLD', 1.25); // With fallback

// Formatted price display
const formattedPrice = useFormattedTokenPrice('ETH');

// Class-based API for non-React contexts
const usdcPrice = tokenPriceManager.getPrice('USDC');
```

### 3. Token Configuration Manager

Located at `src/services/TokenConfigurationManager.ts`, this service combines addresses, prices, and metadata:

- Centralized token information
- Token price updates
- Balance and allowance tracking
- Token filtering by type (tradable, LP, etc.)

```typescript
import { tokenManager, getToken, TokenType } from 'services/TokenConfigurationManager';

// Get a complete token by type
const wldToken = getToken(TokenType.WLD);

// Get token by address
const token = tokenManager.getTokenByAddress("0x163f8C2467924be0ae7B5347228CABF260318753");

// Get all tradable tokens
const tradableTokens = tokenManager.getTradableTokens();
```

### 4. Oracle Prices Provider

Located at `src/context/OraclePricesContext/OraclePricesProvider.tsx`, this React context provides:

- App-wide access to token prices
- Safety utilities to prevent undefined errors
- Status indicators (loading, error states)
- Automatic refreshing of price data

```tsx
// In a React component
import { useOraclePrices } from 'context/OraclePricesContext/OraclePricesProvider';

function PriceDisplay() {
  const { getTokenPrice, isPriceAvailable } = useOraclePrices();
  
  // Safe price access with fallback
  const price = getTokenPrice('WLD', 1.0);
  
  // Check if price is available
  const hasPrice = isPriceAvailable('ETH');
  
  return <div>${price}</div>;
}
```

### 5. Token Price Display Components

Located at `src/components/TokenPrice/TokenPriceDisplay.tsx`, these components provide:

- Standardized price display with error handling
- Loading and error states
- Customizable formatting
- Price trend indicators

```tsx
import TokenPriceDisplay, { TokenPriceCard } from 'components/TokenPrice/TokenPriceDisplay';

// Simple price display
<TokenPriceDisplay 
  token="WLD"
  fallbackPrice={1.25}
  precision={2}
  showSource={true}
/>

// Full price card with trend
<TokenPriceCard 
  symbol="ETH"
  showChange={true}
/>
```

## Integration Points

### Initialization

Token services should be initialized at application startup:

```typescript
import { initializeTokenServices } from 'lib/worldchain/initializeTokenServices';

// In your app's entry point
initializeTokenServices();
```

### Environment-Specific Configuration

Token services respect environmental settings:

- Production: Only uses verified addresses from environment variables
- Development: Falls back to hardcoded addresses if env variables aren't set
- Testing: Can use mock data for testing purposes

## Best Practices

### 1. Safe Token Access

Never directly access token properties without safety checks:

```typescript
// ❌ Unsafe - can cause "Cannot read property 'symbol' of undefined"
const symbol = token.symbol;

// ✅ Safe - uses standardized utilities
import { getSafeTokenSymbol } from 'lib/worldchain/tokenUtils';
const symbol = getSafeTokenSymbol(token, 'WLD');
```

### 2. Address Resolution

Always use the TokenAddressService for token addresses:

```typescript
// ❌ Avoid hardcoding addresses
const wldAddress = "0x163f8C2467924be0ae7B5347228CABF260318753";

// ✅ Use the token address service
import { getTokenAddressSafe, TokenType } from 'services/TokenAddressService';
const wldAddress = getTokenAddressSafe(TokenType.WLD);
```

### 3. Price Access

Use the provided services for accessing token prices:

```typescript
// ❌ Avoid direct access to price data
const price = prices?.[token]?.reference;

// ✅ Use the token price service
import { useTokenPrice } from 'services/TokenPriceService';
const price = useTokenPrice(token);
```

### 4. Default Fallbacks

Always provide reasonable fallbacks for production:

```typescript
// ✅ Always provide fallbacks for core functionality
const wldPrice = useTokenPrice('WLD', 1.25);
```

## Environment Variable Standards

For token addresses, follow this naming convention:

```
VITE_APP_WORLD_<TOKEN>_TOKEN=0x123...
```

Available token environment variables:

- `VITE_APP_WORLD_WLD_TOKEN`: World token address
- `VITE_APP_WORLD_ETH_TOKEN`: Wrapped ETH token address
- `VITE_APP_WORLD_USDC_TOKEN`: USDC token address
- `VITE_APP_WORLD_MAG_TOKEN`: MAG token address

For LP tokens:

- `VITE_APP_WORLD_WLD_USDC_MARKET`: WLD-USDC LP token address
- `VITE_APP_WORLD_ETH_USDC_MARKET`: ETH-USDC LP token address

## Migration Guide

To migrate existing code:

1. Replace direct token.symbol access with `getSafeTokenSymbol(token)`
2. Replace hardcoded addresses with `getTokenAddressSafe(TokenType.X)`
3. Replace direct price access with `useTokenPrice()` or `tokenManager`
4. Initialize token services in your app entry point

## Troubleshooting

Common issues and solutions:

1. **"Cannot read property 'symbol' of undefined"**
   - Use `getSafeTokenSymbol()` from tokenUtils

2. **Invalid token addresses in production**
   - Check environment variables are properly set
   - Verify .env.production has the correct addresses

3. **Price data unavailable**
   - Check Oracle Keeper service is running and accessible
   - Verify network connectivity to price APIs

## Future Improvements

Planned enhancements:

1. Token whitelist management for Vault integration
2. Position token handling and LP token representation
3. Enhanced token metadata including icons and descriptions
4. Multi-chain token support with chain-specific addresses
