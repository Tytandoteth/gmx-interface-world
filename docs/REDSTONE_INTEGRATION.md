# RedStone Price Feed Integration for GMX on World Chain

This guide outlines the complete integration of RedStone price feeds with the GMX protocol deployed on World Chain.

## Overview

This integration connects RedStone's decentralized oracle network with GMX on World Chain, enabling reliable and accurate price feeds for WLD and WETH (with MAG to be added later). The solution consists of several components:

1. **Enhanced RedStonePriceFeed Contract** - Updated smart contract with full RedStone SDK compatibility
2. **Oracle Keeper Service** - Middleware for providing reliable price data access
3. **Interface Integration** - UI components for viewing and interacting with price feeds

## Contract Integration

### Deployed Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| RedStonePriceFeed | `0x345bc48E1370fa399D0A6611669726aAC676DBB3` | Enhanced implementation with required interface methods |
| VaultPriceFeed | `0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf` | Configured to use RedStonePriceFeed |
| Vault | `0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5` | Main GMX vault |
| Router | `0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b` | GMX router for interacting with the protocol |

### Token Configuration

| Token | Address | Status |
|-------|---------|--------|
| WLD | `0x99A49AaA79b648ee24e85c4eb3A1C9c429A95652` | ✅ Configured |
| WETH | `0xE1a9E792851b22A808639cf8e75D0A4025333f4B` | ✅ Configured |
| MAG | TBD | 🔄 Planned |

## Oracle Keeper Service

The Oracle Keeper service provides a reliable REST API for accessing RedStone price data, abstracting away the complexities of direct blockchain interactions.

### Key Features

- **Reliable Price Access**: Simple REST API endpoints for price data
- **Caching**: Optimized for performance with configurable caching
- **Error Handling**: Robust error management with detailed logging
- **Health Monitoring**: Status endpoints for service reliability

### Deployment

#### Production Deployment

```bash
# Clone the repository
git clone <repository_url>
cd gmx-interface-world/oracle-keeper

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your production settings

# Start the service (using PM2 for production)
npm install -g pm2
pm2 start index.js --name "oracle-keeper"
```

#### Development and Testing

For development and testing, use the mock server:

```bash
cd oracle-keeper
node mock-server.js
```

## Interface Integration

The interface has been updated to communicate with the Oracle Keeper service rather than making direct blockchain calls, improving reliability and performance.

### Testing the Integration

1. Start the Oracle Keeper service
2. Configure environment variables:
   ```
   VITE_APP_ORACLE_KEEPER_URL=http://localhost:3002
   VITE_WORLD_RPC_PROVIDERS=<world_chain_rpc_endpoint>
   ```
3. Start the interface:
   ```bash
   npm run start
   ```
4. Navigate to the RedStone Test page at `/redstone-test`

## Adding MAG Token Support

To add support for the MAG token:

1. Update the RedStonePriceFeed contract:
   ```solidity
   function getSupportedTokens() public pure returns (string[] memory) {
       string[] memory tokens = new string[](4);
       tokens[0] = "WLD";
       tokens[1] = "ETH"; // For WETH
       tokens[2] = "BTC"; // Reference
       tokens[3] = "MAG"; // New token
       return tokens;
   }
   ```

2. Deploy the updated contract
3. Configure VaultPriceFeed with the MAG token address
4. Update Oracle Keeper configuration to include MAG
5. Add MAG to the supported tokens list in the interface

## Security Considerations

- **Governance**: The RedStonePriceFeed deployment is controlled by your address, ensuring full control over the protocol
- **Monitoring**: Set up alerts for price feed issues or significant deviations
- **Fallbacks**: Consider implementing fallback price sources for critical operations

## Maintenance

Regular maintenance tasks include:

1. Monitoring the Oracle Keeper service logs for errors
2. Verifying price data accuracy against other sources
3. Running regular security audits on the integration
4. Keeping the RedStone SDK and dependencies updated

## Additional Resources

- [RedStone Documentation](https://docs.redstone.finance/)
- [GMX Documentation](https://github.com/gmx-io)
- [Oracle Keeper API Documentation](./oracle-keeper/README.md)
