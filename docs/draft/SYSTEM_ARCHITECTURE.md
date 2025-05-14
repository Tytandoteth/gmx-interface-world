# GMX on World Chain - System Architecture

This document provides a comprehensive overview of the GMX trading platform integration with World Chain, including all components and their interactions.

## System Components

The GMX on World Chain ecosystem consists of three main repositories:

### 1. [Oracle Keeper](https://github.com/Tytandoteth/oracle-keeper)

**Purpose**: Provides optional price feeds for UI display in the GMX trading platform on World Chain.

**Key Components**:
- **Cloudflare Worker**: Edge-deployed service to handle API requests
- **Price Fetcher**: Retrieves price data from CoinGecko API
- **Caching Layer**: KV storage for efficient price retrieval
- **Health Monitoring**: Endpoints for service status and diagnostics

**Deployment**: Deployed at https://oracle-keeper.kevin8396.workers.dev

### 2. [GMX Interface World](https://github.com/Tytandoteth/gmx-interface-world)

**Purpose**: User interface for trading on GMX markets deployed on World Chain.

**Key Components**:
- **React Frontend**: User interface for trading
- **Oracle Keeper Client**: Optional client for Oracle Keeper API (UI display only)
- **World Chain Provider**: Context provider for World Chain-specific data
- **Token & Market Configurations**: Custom settings for World Chain tokens and markets

### 3. [GMX Contracts World](https://github.com/Tytandoteth/gmx-contracts-world)

**Purpose**: Smart contracts for the GMX protocol deployed on World Chain.

**Key Components**:
- **Core GMX Contracts**: Trading, positions, and order contracts
- **VaultPriceFeed**: On-chain price feed contract
- **World Chain Adapters**: Specific adaptations for the World Chain environment

## Data Flow

### Price Data Flow

There are two paths for price data:

1. **On-chain Path (for transactions)**:
   - VaultPriceFeed contract stores and provides price data
   - GMX Interface reads prices directly from VaultPriceFeed contract
   - All transactions use on-chain price data from VaultPriceFeed

2. **Optional UI-only Path (for display)**:
   - Oracle Keeper fetches price data from CoinGecko API
   - Price data is cached in Cloudflare KV for quick access
   - GMX Interface requests price data from Oracle Keeper API
   - UI components display these prices (not used for transactions)

### Trading Flow

1. User connects wallet to World Chain
2. Interface fetches current market data and positions
3. User creates a trade or position using the interface
4. Transaction is sent to GMX Contracts on World Chain
5. Contract executes the trade using price data from VaultPriceFeed
6. Transaction result is returned to the interface
7. Interface updates to reflect the new position or trade result

## Technical Connections

### Oracle Keeper to GMX Interface (optional, UI-only)

- **API Endpoints**: 
  - `/prices`: Provides current price data for all supported tokens
  - `/direct-prices`: Provides real-time price data bypassing cache
  - `/health`: Provides health status of the Oracle Keeper service
- **Fetcher Component**: 
  - Located at `/src/lib/oracleKeeperFetcher/oracleKeeperFetcher.ts`
  - Handles API calls, response parsing, and error fallbacks

### GMX Interface to GMX Contracts

- **Web3 Connection**: Ethereum provider connects to World Chain RPC
- **Contract ABIs**: Interface uses ABIs matching the deployed contracts
- **Contract Addresses**: Configured in token and market settings

## System Diagram

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│  User Browser       │     │ Cloudflare CDN      │     │  World Chain        │
│  GMX Interface      │────▶│ Oracle Keeper       │     │  GMX Contracts      │
│                     │◀────│ (UI display only)   │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
        │                                                       ▲
        │                                                       │
        └───────────────────────────────────────────────────────┘
                         Direct contract calls
                       (including price reads)
```

## Security Considerations

1. **Price Feed Security**:
   - VaultPriceFeed contract provides authoritative prices for transactions
   - Oracle Keeper prices are used only for UI display
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
   - Health endpoint checks
   - Response time monitoring
   - Error rate tracking
   - Cache hit ratio analysis

2. **Frontend Monitoring**:
   - User session tracking
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
   - Additional price feed integrations
   - Cross-platform SDK for developers
