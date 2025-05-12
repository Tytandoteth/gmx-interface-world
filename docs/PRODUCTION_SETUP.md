# GMX on World Chain: Production Setup Guide

This document outlines the steps required to deploy the GMX interface to production for World Chain.

## Environment Variables

Create a `.env.production` file with the following variables:

```
# Production mode flag - always set to true for production
VITE_USE_PRODUCTION_MODE=true

# World Chain RPC URL
VITE_APP_WORLD_CHAIN_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/

# Oracle Keeper URL
VITE_APP_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev

# RedStone Price Feed Contract Address
VITE_APP_WORLD_REDSTONE_PRICE_FEED=0xA63636C9d557793234dD5E33a24EAd68c36Df148

# GMX Contract Addresses
VITE_APP_WORLD_VAULT_ADDRESS=
VITE_APP_WORLD_ROUTER_ADDRESS=
VITE_APP_WORLD_POSITION_ROUTER_ADDRESS=
VITE_APP_WORLD_GLP_MANAGER_ADDRESS=

# World Chain Token Addresses
VITE_APP_WORLD_WLD_TOKEN=
VITE_APP_WORLD_ETH_TOKEN=
VITE_APP_WORLD_BTC_TOKEN=
VITE_APP_WORLD_USDC_TOKEN=
VITE_APP_WORLD_USDT_TOKEN=
VITE_APP_WORLD_MAG_TOKEN=

# Market Token Addresses
VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN=
VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN=
```

## Contract Deployment

Before deploying the GMX interface to production, ensure that:

1. All GMX contracts are deployed to World Chain
2. The Oracle Keeper is properly configured with the right contract addresses
3. The RedStone price feed contract is properly initialized

## Deployment Steps

1. Fill in all the environment variables with actual contract addresses
2. Build the production version:
   ```bash
   npm run build
   ```
3. Test the production build locally:
   ```bash
   npm run preview
   ```
4. Deploy to your hosting provider of choice

## Verification

After deployment, verify:

1. Oracle Keeper health status shows `mode: 'live'`
2. Token prices are being pulled from the actual price feeds
3. Market data is loading correctly
4. Transactions can be executed successfully

## Troubleshooting

If you encounter issues with the Oracle Keeper connectivity:

1. Check the health endpoint: `https://oracle-keeper.kevin8396.workers.dev/health`
2. Verify that the RedStone price feed contract is accessible
3. Check the browser console for any errors related to the Oracle Keeper integration

## Monitoring

Monitor the following metrics:

1. Oracle Keeper latency
2. Price feed availability
3. Transaction success rate
