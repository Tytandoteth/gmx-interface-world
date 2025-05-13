# Environment Utilities: Usage Examples

This document provides concrete examples of how to use the new environment utilities in different scenarios.

## Basic Environment Detection

```typescript
import { 
  isProductionEnvironment, 
  isDevelopmentEnvironment, 
  isTestEnvironment 
} from '../lib/worldchain/environmentUtils';

// Conditional logic based on environment
if (isProductionEnvironment()) {
  // Use production-specific logic
  console.warn('Running in production mode!');
} else if (isDevelopmentEnvironment()) {
  // Use development-specific logic
  console.info('Running in development mode');
} else if (isTestEnvironment()) {
  // Use test-specific logic
  console.info('Running in test mode');
}
```

## Getting Contract Addresses

```typescript
import { getContractAddress } from '../lib/worldchain/environmentUtils';

// Get vault address with strong typing
const vaultAddress = getContractAddress('vault');

// Get router address with a fallback (useful for development)
const routerAddress = getContractAddress(
  'router', 
  '0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b'
);

// Get position router address, marking it as required
// This will log an error if the address is missing in production
const positionRouterAddress = getContractAddress(
  'positionRouter', 
  '', 
  true
);
```

## Getting Token Addresses

```typescript
import { getTokenAddress } from '../lib/worldchain/environmentUtils';

// Get WLD token address
const wldAddress = getTokenAddress('WLD');

// Get ETH token address with fallback
const ethAddress = getTokenAddress(
  'ETH',
  '0x4200000000000000000000000000000000000006'
);

// Get market token address
const wldUsdcMarketToken = getTokenAddress('WLD_USDC_MARKET');
```

## Getting Other Environment Variables

```typescript
import { getEnvVariable } from '../lib/worldchain/environmentUtils';

// Get a string variable with default
const apiKey = getEnvVariable('VITE_APP_COINGECKO_API_KEY', '', false);

// Get a numeric variable with type conversion
const logLevel = getEnvVariable('VITE_APP_LOG_LEVEL', 2, false);
// logLevel will be a number, not a string

// Get a boolean variable with type conversion
const useTestTokens = getEnvVariable('VITE_APP_USE_TEST_TOKENS', false, false);
// useTestTokens will be a boolean, not a string
```

## Getting API Endpoints

```typescript
import { 
  getWorldChainRpcUrl, 
  getOracleKeeperUrl 
} from '../lib/worldchain/environmentUtils';

// Get the World Chain RPC URL
const rpcUrl = getWorldChainRpcUrl();

// Get the Oracle Keeper URL
const oracleKeeperUrl = getOracleKeeperUrl();
```

## Using with React Components

```tsx
import React, { useEffect, useState } from 'react';
import { 
  isProductionEnvironment,
  getOracleKeeperUrl,
  getWorldChainRpcUrl
} from '../lib/worldchain/environmentUtils';

const EnvInfoComponent: React.FC = () => {
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    // Example of environment-specific logic in a React component
    const initConnection = async () => {
      const rpcUrl = getWorldChainRpcUrl();
      
      try {
        // Connect to provider using rpcUrl
        setConnected(true);
      } catch (error) {
        console.error('Failed to connect', error);
      }
    };
    
    initConnection();
  }, []);
  
  return (
    <div className="env-info">
      <h3>Environment Information</h3>
      <div className="info-row">
        <span>Mode:</span>
        <span>{isProductionEnvironment() ? 'Production' : 'Development'}</span>
      </div>
      <div className="info-row">
        <span>Oracle Keeper:</span>
        <span>{getOracleKeeperUrl()}</span>
      </div>
      <div className="info-row">
        <span>Connection Status:</span>
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {/* Only show in development */}
      {!isProductionEnvironment() && (
        <div className="dev-tools">
          <h4>Development Tools</h4>
          {/* Dev-only controls */}
        </div>
      )}
    </div>
  );
};

export default EnvInfoComponent;
```

## Migrating from Old Environment Access Pattern

### Before:

```typescript
const ORACLE_KEEPER_URL = import.meta.env.VITE_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev';
const isProduction = import.meta.env.VITE_USE_PRODUCTION_MODE === 'true';
const vaultAddress = import.meta.env.VITE_APP_WORLD_VAULT_ADDRESS as string || '';

function initApp() {
  if (import.meta.env.MODE === 'production' || isProduction) {
    // Production initialization
  } else {
    // Development initialization
  }
}
```

### After:

```typescript
import { 
  getOracleKeeperUrl, 
  isProductionEnvironment, 
  getContractAddress 
} from '../lib/worldchain/environmentUtils';

const ORACLE_KEEPER_URL = getOracleKeeperUrl();
const isProduction = isProductionEnvironment();
const vaultAddress = getContractAddress('vault');

function initApp() {
  if (isProduction) {
    // Production initialization
  } else {
    // Development initialization
  }
}
```

These examples demonstrate how the new utilities provide a more type-safe, consistent, and maintainable way to access environment variables throughout your codebase.
