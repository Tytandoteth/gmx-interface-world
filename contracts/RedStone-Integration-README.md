# RedStone Price Feed Integration with GMX on World Chain

This document explains how to deploy, configure, and use the RedStone Oracle price feeds with GMX on the World Chain.

## Overview

The integration consists of the following components:

1. **RedStonePriceFeed Contract**: Fetches price data from RedStone oracles and makes it available to GMX contracts.
2. **Oracle Keeper**: A backend service that provides price data and candles for the GMX interface.
3. **RedStone Adapter**: Adds support for on-chain price data from the RedStonePriceFeed contract to the GMX interface.

## Prerequisites

- Node.js and npm installed
- Hardhat for contract deployment
- Access to a World Chain node (local or remote)
- RedStone API key (if required)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gmx-interface-world.git
   cd gmx-interface-world
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the required environment variables:
   ```
   cp .env.example .env
   ```

4. Configure your `.env` file with appropriate values (see Environment Variables section below).

## Deployment Process

### 1. Deploy RedStonePriceFeed Contract

Use the setup script to deploy the contract:

```bash
npx hardhat run contracts/scripts/setup-redstone-integration.js --network world
```

This script will:
- Deploy the RedStonePriceFeed contract
- Configure token decimals for WLD, ETH, BTC, USDC, and USDT
- Attempt to configure the GMX Vault to use the deployed RedStone price feeds
- Output contract addresses to be used in your `.env` file

### 2. Update Environment Variables

After deployment, update your `.env` file with the contract addresses:

```
VITE_APP_WORLD_REDSTONE_PRICE_FEED=<deployed-address>
VITE_APP_WORLD_VAULT_ADDRESS=<vault-address>
VITE_APP_WORLD_ROUTER_ADDRESS=<router-address>
VITE_APP_WORLD_POSITION_ROUTER_ADDRESS=<position-router-address>
VITE_APP_WORLD_GLP_MANAGER_ADDRESS=<glp-manager-address>
```

### 3. Start the Oracle Keeper Service

The Oracle Keeper service must be running to provide price data to the GMX interface:

```bash
cd oracle-keeper
npm install
npm start
```

The Oracle Keeper will run on http://localhost:3001 by default.

## Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| VITE_APP_ORACLE_KEEPER_URL | URL of the Oracle Keeper service | http://localhost:3001 |
| VITE_APP_WORLD_REDSTONE_PRICE_FEED | Address of the deployed RedStonePriceFeed contract | - |
| VITE_APP_WORLD_VAULT_ADDRESS | Address of the GMX Vault on World Chain | - |
| VITE_APP_WORLD_ROUTER_ADDRESS | Address of the GMX Router on World Chain | - |
| VITE_APP_WORLD_POSITION_ROUTER_ADDRESS | Address of the GMX Position Router on World Chain | - |
| VITE_APP_WORLD_GLP_MANAGER_ADDRESS | Address of the GMX GLP Manager on World Chain | - |
| WORLD_CHAIN_URL | RPC URL for the World Chain | http://localhost:8545 |
| WORLD_CHAIN_DEPLOY_KEY | Private key for contract deployment | - |

## Testing the Integration

1. **Check Price Feed Contract**: 
   ```bash
   npx hardhat run scripts/test-redstone-feed.js --network world
   ```

2. **Verify Oracle Keeper Endpoints**:
   - Price data: http://localhost:3001/prices
   - Tickers: http://localhost:3001/prices/tickers
   - Health check: http://localhost:3001/health

3. **Test GMX Interface**:
   Start the GMX interface and verify that price data is being shown correctly:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Price Data Not Showing

1. Check if the Oracle Keeper is running
2. Verify that the RedStonePriceFeed contract is deployed and configured correctly
3. Check console logs for any errors
4. Ensure your World Chain node is accessible

### Contract Deployment Fails

1. Check your RPC connection
2. Ensure you have sufficient funds for gas
3. Verify your private key is correctly configured in `.env`

## Architecture

```
┌─────────────────┐      ┌─────────────────┐
│  GMX Interface  │◄────►│ Oracle Keeper   │
└────────┬────────┘      └────────┬────────┘
         │                        │ 
         │                        ▼
         │               ┌─────────────────┐
         │               │  RedStone SDK   │
         │               └─────────────────┘
         ▼
┌─────────────────┐      ┌─────────────────┐
│    GMX Vault    │◄────►│RedStonePriceFeed│
└─────────────────┘      └─────────────────┘
```

## References

- [RedStone Documentation](https://docs.redstone.finance/)
- [GMX Documentation](https://gmx-docs.io/)
- [World Chain Documentation](https://docs.worldchain.xyz/)
