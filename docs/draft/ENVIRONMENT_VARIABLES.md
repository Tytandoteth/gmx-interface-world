# Environment Variables Documentation

## Overview

This document provides a comprehensive guide to all environment variables used in the GMX World Chain Interface. It standardizes variable naming and usage across development and production environments.

## Standard Environment Files

We use the following standard environment files:

- `.env.development` - For local development
- `.env.production` - For production deployment
- `.env.example` - Template with all possible variables (safe to commit to git)

## Environment Variable Categories

### 1. RPC & API Endpoints

| Variable Name | Description | Default Value | Required In |
|---------------|-------------|--------------|-------------|
| `VITE_APP_WORLD_CHAIN_URL` | RPC URL for World Chain | - | Dev & Prod |
| `VITE_APP_ORACLE_KEEPER_URL` | URL for Oracle Keeper API | https://oracle-keeper.kevin8396.workers.dev | Dev & Prod |
| `VITE_APP_ORACLE_KEEPER_DIRECT_PRICES_URL` | Path for direct prices from Oracle Keeper | /direct-prices | Dev & Prod |

### 2. Contract Addresses

| Variable Name | Description | Default Value | Required In |
|---------------|-------------|--------------|-------------|
| `VITE_APP_WORLD_VAULT_ADDRESS` | Address of the GMX Vault contract | - | Prod |
| `VITE_APP_WORLD_ROUTER_ADDRESS` | Address of the GMX Router contract | - | Prod |
| `VITE_APP_WORLD_POSITION_ROUTER_ADDRESS` | Address of the GMX Position Router contract | - | Prod |
| `VITE_APP_WORLD_POSITION_MANAGER_ADDRESS` | Address of the GMX Position Manager contract | - | Prod |
| `VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS` | Address of the VaultPriceFeed contract | - | Prod |

### 3. Token Addresses

| Variable Name | Description | Default Value | Required In |
|---------------|-------------|--------------|-------------|
| `VITE_APP_WORLD_WLD_TOKEN` | Address of the WLD token | - | Prod |
| `VITE_APP_WORLD_ETH_TOKEN` | Address of the ETH token | - | Prod |
| `VITE_APP_WORLD_USDC_TOKEN` | Address of the USDC token | - | Prod |
| `VITE_APP_WORLD_MAG_TOKEN` | Address of the MAG token | - | Prod |
| `VITE_APP_WORLD_BTC_TOKEN` | Address of the BTC token | - | Prod |
| `VITE_APP_WORLD_USDT_TOKEN` | Address of the USDT token | - | Prod |
| `VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN` | Address of the WLD-USDC market token | - | Prod |
| `VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN` | Address of the ETH-USDC market token | - | Prod |

### 4. Feature Flags & Modes

| Variable Name | Description | Default Value | Required In |
|---------------|-------------|--------------|-------------|
| `VITE_APP_USE_PRODUCTION_MODE` | Enable production mode | false | Prod |
| `VITE_APP_USE_TEST_TOKENS` | Use test tokens instead of real tokens | false | Dev |
| `VITE_APP_LOG_LEVEL` | Logging level (0-4) | 2 (Dev), 0 (Prod) | Dev & Prod |

### 5. API Keys & Secrets

| Variable Name | Description | Default Value | Required In |
|---------------|-------------|--------------|-------------|
| `VITE_APP_COINGECKO_API_KEY` | API key for CoinGecko | - | Prod |

## Production vs Development Values

### Development Environment (.env.development)

```shell
# World Chain Configuration
VITE_APP_WORLD_CHAIN_URL=https://rpc-testnet.world-chain.example.com
VITE_APP_USE_PRODUCTION_MODE=false
VITE_APP_USE_TEST_TOKENS=true

# Oracle Keeper Configuration
VITE_APP_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
VITE_APP_ORACLE_KEEPER_DIRECT_PRICES_URL=/direct-prices

# Token Addresses (Using placeholder/test addresses)
VITE_APP_WORLD_WLD_TOKEN=0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1
VITE_APP_WORLD_ETH_TOKEN=0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2
VITE_APP_WORLD_USDC_TOKEN=0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1

# Logging
VITE_APP_LOG_LEVEL=2
```

### Production Environment (.env.production)

```shell
# World Chain Configuration
VITE_APP_WORLD_CHAIN_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
VITE_APP_USE_PRODUCTION_MODE=true
VITE_APP_USE_TEST_TOKENS=false

# Oracle Keeper Configuration
VITE_APP_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
VITE_APP_ORACLE_KEEPER_DIRECT_PRICES_URL=/direct-prices

# Contract Addresses
VITE_APP_WORLD_VAULT_ADDRESS=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
VITE_APP_WORLD_ROUTER_ADDRESS=0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
VITE_APP_WORLD_POSITION_ROUTER_ADDRESS=0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
VITE_APP_WORLD_POSITION_MANAGER_ADDRESS=0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D
VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS=0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf

# Token Addresses
VITE_APP_WORLD_WLD_TOKEN=0x163f8C2467924be0ae7B5347228CABF260318753
VITE_APP_WORLD_ETH_TOKEN=0x4200000000000000000000000000000000000006
VITE_APP_WORLD_USDC_TOKEN=0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
VITE_APP_WORLD_MAG_TOKEN=0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1
VITE_APP_WORLD_BTC_TOKEN=0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3
VITE_APP_WORLD_USDT_TOKEN=0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2
VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN=0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1
VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN=0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2

# API Keys
VITE_APP_COINGECKO_API_KEY=your-api-key-here

# Logging
VITE_APP_LOG_LEVEL=0
```

## Usage Guidelines

1. **NEVER commit actual .env files with real credentials**
2. **Always use the VITE_APP_ prefix** for all environment variables
3. **Set reasonable defaults** in code when a variable might be missing
4. **Use the environment utility** functions from `src/lib/worldchain/environmentUtils.ts`

## Environment Utility Functions

```typescript
// Import the utility functions
import { 
  getEnvironment, 
  isProductionEnvironment,
  getWorldChainRpcUrl,
  getContractAddress,
  getTokenAddress
} from 'lib/worldchain/environmentUtils';

// Check current environment
if (isProductionEnvironment()) {
  // Use production settings
}

// Get contract address with fallback
const vaultAddress = getContractAddress('vault', '0xDefault...');

// Get token address with fallback
const wldAddress = getTokenAddress('WLD', '0xDefault...');
```

## Migration from Direct References

If you're still using direct references to `import.meta.env`, please update your code to use the utility functions:

```typescript
// ❌ Don't do this
const rpcUrl = import.meta.env.VITE_APP_WORLD_CHAIN_URL || 'fallback';

// ✅ Do this instead
import { getWorldChainRpcUrl } from 'lib/worldchain/environmentUtils';
const rpcUrl = getWorldChainRpcUrl();
```

This provides better type safety, consistent fallbacks, and centralized management of environment variables.
