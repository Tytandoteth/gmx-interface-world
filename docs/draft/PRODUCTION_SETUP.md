# GMX on World Chain: Production Setup Guide

This document outlines the steps required to deploy the GMX interface to production for World Chain.

## Environment Variables

Create a `.env.production` file with the following variables:

```
# Production mode flag - always set to true for production
VITE_APP_USE_PRODUCTION_MODE=true

# World Chain RPC URL
VITE_APP_WORLD_CHAIN_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/

# Oracle Keeper URL (optional, for UI price display only)
VITE_APP_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev

# Contract Addresses
VITE_APP_WORLD_VAULT_ADDRESS=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
VITE_APP_WORLD_ROUTER_ADDRESS=0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
VITE_APP_WORLD_POSITION_ROUTER_ADDRESS=0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
VITE_APP_WORLD_POSITION_MANAGER_ADDRESS=0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D
VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS=0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf

# World Chain Token Addresses
VITE_APP_WORLD_WLD_TOKEN=0x163f8C2467924be0ae7B5347228CABF260318753
VITE_APP_WORLD_ETH_TOKEN=0x4200000000000000000000000000000000000006
VITE_APP_WORLD_USDC_TOKEN=0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
VITE_APP_WORLD_MAG_TOKEN=0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1
VITE_APP_WORLD_BTC_TOKEN=0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3
VITE_APP_WORLD_USDT_TOKEN=0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2

# Market Token Addresses (if used)
VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN=0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1
VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN=0x7eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2

# API Keys (if using CoinGecko for price display)
VITE_APP_COINGECKO_API_KEY=your-api-key-here
```

## Contract Deployment

Before deploying the GMX interface to production, ensure that:

1. All GMX contracts are deployed to World Chain
2. The VaultPriceFeed contract is properly configured
3. If using Oracle Keeper for UI display, ensure it's properly configured

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

1. Oracle Keeper health status shows `mode: 'live'` (if using Oracle Keeper)
2. Token prices are being pulled correctly (either from VaultPriceFeed or Oracle Keeper)
3. Market data is loading correctly
4. Transactions can be executed successfully

## Troubleshooting

If you encounter issues with contract connectivity:

1. Check that the RPC URL is correct and accessible
2. Verify that all contract addresses are correct
3. Ensure your wallet is connected to World Chain (chainId: 480)
4. Check the browser console for any errors

If using Oracle Keeper for UI price display:

1. Check the health endpoint: `https://oracle-keeper.kevin8396.workers.dev/health`
2. Verify that the Oracle Keeper URL is correct in your environment variables
3. Check the browser console for any errors related to the Oracle Keeper integration

## Monitoring

Monitor the following metrics:

1. Transaction success rate
2. UI performance and load times
3. RPC endpoint reliability
4. User feedback and error reports

## Security Considerations

1. Never commit `.env.production` to version control
2. Use environment variables for all sensitive configuration
3. Implement proper error handling for failed contract calls
4. Use HTTPS for all API endpoints
5. Validate user input before sending transactions

## Production Checklist

- [ ] All contract addresses are correctly configured
- [ ] Environment variables are set in production environment
- [ ] Build completes successfully
- [ ] Application loads correctly in production environment
- [ ] Wallet connection works
- [ ] Transactions can be executed
- [ ] Error handling is properly implemented
- [ ] Monitoring is set up
- [ ] Security measures are in place
