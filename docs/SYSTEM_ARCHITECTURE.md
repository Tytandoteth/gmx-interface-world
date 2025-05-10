# GMX on World Chain - System Architecture

This document provides a comprehensive overview of the GMX trading platform integration with World Chain, including all components and their interactions.

## System Components

The GMX on World Chain ecosystem consists of three main repositories:

### 1. [RedStone Oracle Keeper](https://github.com/Tytandoteth/redstone-oracle-keeper)

**Purpose**: Provides reliable price feeds for the GMX trading platform on World Chain.

**Key Components**:
- **Cloudflare Worker**: Edge-deployed service to handle API requests
- **Blockchain Integration**: Connection to World Chain and RedStone oracles
- **Caching Layer**: KV storage for price data with TTL
- **Fallback Mechanism**: Mock data generation when live data is unavailable

**Deployment**: Deployed at https://oracle-keeper.kevin8396.workers.dev

### 2. [GMX Interface World](https://github.com/Tytandoteth/gmx-interface-world)

**Purpose**: User interface for trading on GMX markets deployed on World Chain.

**Key Components**:
- **React Frontend**: User interface for trading
- **Oracle Keeper Fetcher**: Client for Oracle Keeper API
- **World Chain Provider**: Context provider for World Chain-specific data
- **Token & Market Configurations**: Custom settings for World Chain tokens and markets

### 3. [GMX Contracts World](https://github.com/Tytandoteth/gmx-contracts-world)

**Purpose**: Smart contracts for the GMX protocol deployed on World Chain.

**Key Components**:
- **Core GMX Contracts**: Trading, positions, and order contracts
- **RedStone Integration**: Price feed oracle integration
- **World Chain Adapters**: Specific adaptations for the World Chain environment

## Data Flow

### Price Data Flow

1. RedStone oracles provide price data for assets (WLD, ETH, BTC)
2. Oracle Keeper fetches this data at regular intervals (every 30 seconds)
3. Price data is stored in Cloudflare KV for quick access
4. GMX Interface requests price data from Oracle Keeper API
5. Price data is displayed to users and used for trading calculations
6. GMX Contracts use the same price feeds for on-chain operations

### Trading Flow

1. User connects wallet to GMX Interface on World Chain
2. Interface fetches current market data and positions
3. User creates a trade or position using the interface
4. Transaction is sent to GMX Contracts on World Chain
5. Contract executes the trade using price data from RedStone oracles
6. Transaction result is returned to the interface
7. Interface updates to reflect the new position or trade result

## Technical Connections

### Oracle Keeper to GMX Interface

- **API Endpoints**: 
  - `/prices`: Provides current price data for all supported tokens
  - `/health`: Provides health status of the Oracle Keeper service
- **Fetcher Component**: 
  - Located at `/src/lib/oracleKeeperFetcher/oracleKeeperFetcher.ts`
  - Handles API calls, response parsing, and error fallbacks

### GMX Interface to GMX Contracts

- **Web3 Connection**: Ethereum provider connects to World Chain RPC
- **Contract ABIs**: Interface uses ABIs matching the deployed contracts
- **Contract Addresses**: Configured in token and market settings

### Oracle Keeper to RedStone

- **RedStone SDK**: Uses RedStone SDK to fetch price data
- **WrapperBuilder**: Wraps contract calls with RedStone price data
- **Caching**: Caches RedStone data to minimize API calls

## Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Browser   │     │ Cloudflare CDN  │     │  World Chain    │
│  GMX Interface  │────▶│ Oracle Keeper   │────▶│  GMX Contracts  │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Security Considerations

1. **Price Feed Security**:
   - Multiple RedStone signers for price verification
   - Fallback mechanisms prevent single points of failure
   - Monitoring for unusual price movements

2. **Smart Contract Security**:
   - Contracts based on audited GMX implementation
   - Additional checks for World Chain-specific issues
   - Limited admin privileges with timelock mechanisms

3. **Frontend Security**:
   - HTTPS for all connections
   - Input validation both client and server-side
   - No sensitive data stored in browser storage

## Monitoring and Maintenance

1. **Oracle Keeper Monitoring**:
   - Health check endpoint for monitoring
   - Cloudflare Worker analytics
   - Alerts for pricing anomalies

2. **GMX Interface Monitoring**:
   - Error logging and tracking
   - Performance monitoring
   - User feedback collection

3. **GMX Contracts Monitoring**:
   - On-chain event monitoring
   - Protocol statistics collection
   - Governance monitoring

## Future Enhancements

1. **Performance Optimizations**:
   - WebSocket connections for real-time updates
   - Enhanced caching strategies
   - Optimized contract interactions

2. **Feature Expansions**:
   - Additional trading pairs
   - Advanced trading features
   - Mobile-optimized interface

3. **Integration Expansions**:
   - Multi-chain support
   - Additional oracle integrations
   - Cross-platform SDK for developers
