# Oracle Integration Plan: Direct Price Feeds

**Created:** May 13, 2025
**Status:** Implementation Phase

## Overview

This document outlines the comprehensive plan for implementing direct price feeds in the World Chain GMX integration using CoinGecko as the primary data source via our Oracle Keeper middleware. This approach affects all three repositories in the project:

1. Oracle Keeper Service (oracle-keeper)
2. GMX Contracts (gmx-contracts-world)
3. GMX Interface (gmx-interface-world)

## Table of Contents

- [1. Oracle Keeper Service Implementation](#1-oracle-keeper-service-implementation)
- [2. GMX Contracts Implementation](#2-gmx-contracts-implementation)
- [3. GMX Interface Implementation](#3-gmx-interface-implementation)
- [4. Implementation Timeline](#4-implementation-timeline)
- [5. Implementation Risks & Mitigation](#5-implementation-risks--mitigation)
- [6. Specific Code Changes Required](#6-specific-code-changes-required)
- [7. Testing Protocol](#7-testing-protocol)
- [8. Fallback Procedure](#8-fallback-procedure)

## 1. Oracle Keeper Service Implementation

### Phase 1: Core Components

#### Ethereum Client Integration
- Use ethers.js for contract interactions
- Implement direct RPC calls for on-chain data

#### Price Feed Integration
- Primary: CoinGecko API for real-time price data
- Secondary: Alternative API sources as fallbacks
- Tertiary: Hardcoded default prices as last resort

#### Service Enhancements
- Implement rate-limiting for API calls
- Create robust caching mechanisms
- Add timestamp checking to ensure data freshness

### Phase 2: Configuration Updates

#### Environment Configuration
```
USE_MOCK_PRICES=false
COINGECKO_API_KEY=<api_key>
RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
CHAIN_ID=480
SUPPORTED_TOKENS=WLD,WETH,MAG
```

#### Project Dependencies
- Axios for API requests
- Ethers.js for blockchain interaction
- Memory caching for performance

### Phase 3: API Enhancements

#### Endpoint Implementations
- `/prices` endpoint with cached data
- `/direct-prices` endpoint for real-time data
- `/health` endpoint for status monitoring
- Add diagnostic data for troubleshooting

## 2. GMX Contracts Implementation

### Phase 1: Contract Updates

#### Price Feed Integration
- Implement SimplePriceFeed contract
- Configure for supported tokens (WLD, WETH, MAG)
- Set appropriate decimal precision

```solidity
// SimplePriceFeed contract
contract SimplePriceFeed {
  mapping(address => uint256) public prices;
  mapping(address => uint256) public lastUpdateTimes;
  
  function getPrice(address token) public view returns (uint256) {
    require(lastUpdateTimes[token] > 0, "Price not available");
    return prices[token];
  }
  
  function setPrice(address token, uint256 price) external onlyOwner {
    prices[token] = price;
    lastUpdateTimes[token] = block.timestamp;
  }
}
```

#### Vault Configuration
- Update to work with SimplePriceFeed
- Configure for proper decimal handling
- Whitelist supported tokens

### Phase 2: Testing & Deployment

#### Contract Tests
- Unit tests for price feed integrations
- Integration tests for trading flows
- Stress tests for extreme price movements

#### Deployment Scripts
- Update to use World Chain RPC
- Configure for production addresses
- Implement verification steps

## 3. GMX Interface Implementation

### Phase 1: Price Feed Integration

#### Oracle Keeper Client
- Implement OracleKeeperFetcher with appropriate caching
- Use enhanced direct prices client for real-time data
- Add connection status indicators

```typescript
// Example implementation
class EnhancedOracleKeeperFetcher {
  async fetchDirectPrices(): Promise<Record<string, number>> {
    try {
      const response = await axios.get(`${this.baseUrl}/direct-prices`);
      return response.data.prices;
    } catch (error) {
      console.error("Error fetching direct prices:", error);
      return DEFAULT_PRICES;
    }
  }
}
```

#### React Hooks & Context
- Create OraclePricesProvider for app-wide price data
- Implement useOraclePrices hook for components
- Add price formatting utilities

### Phase 2: UI Components

#### Price Display Components
- Implement TokenPriceDisplay component
- Create ExchangePriceBar with live updates
- Add visual indicators for price freshness

#### Trading Components
- Update SwapBox to use direct price feeds
- Modify trading forms for accurate pricing
- Implement real-time price updates

### Phase 3: Contract Integration

#### Contract Hooks
- Create custom React hooks for contract interactions
- Implement proper error handling
- Add loading states and retry logic

#### Trading Logic
- Update trade execution with direct price validation
- Configure proper slippage calculations
- Implement transaction monitoring

## 4. Implementation Timeline

| Phase | Component | Task | Target Date | Status |
|-------|-----------|------|------------|--------|
| 1 | Oracle Keeper | CoinGecko integration | May 11, 2025 | ✅ DONE |
| 1 | Oracle Keeper | Direct prices endpoint | May 11, 2025 | ✅ DONE |
| 2 | Frontend | OracleKeeper client | May 12, 2025 | ✅ DONE |
| 2 | Frontend | Price components | May 12, 2025 | ✅ DONE |
| 3 | Contracts | SimplePriceFeed implementation | May 13, 2025 | 🟡 IN PROGRESS |
| 3 | Contracts | Contract deployment | May 13, 2025 | 🟡 IN PROGRESS |
| 4 | Frontend | Contract integration | May 14, 2025 | 🟡 IN PROGRESS |
| 5 | All | Testing & validation | May 14, 2025 | 🟡 IN PROGRESS |
| 6 | All | Production deployment | May 15, 2025 | ⚪ PLANNED |

## 5. Implementation Risks & Mitigation

### API Reliability
- **Risk**: CoinGecko API rate limits or downtime
- **Mitigation**: 
  - Implement aggressive caching
  - Add multiple fallback sources
  - Configure default prices as last resort

### Price Accuracy
- **Risk**: Price discrepancies between sources
- **Mitigation**:
  - Compare with multiple sources
  - Implement deviation alerts
  - Allow for manual price overrides in emergencies

### Contract Integration
- **Risk**: Incorrect price formatting for contracts
- **Mitigation**:
  - Extensive testing with mock data
  - Decimal validation checks
  - Implement circuit breakers for extreme price movements

### Performance
- **Risk**: UI lag during price updates
- **Mitigation**:
  - Debounce frequent updates
  - Optimize rendering performance
  - Background data loading

### Data Availability
- **Risk**: Missing price data for required tokens
- **Mitigation**:
  - Implement multiple data sources
  - Configure sensible defaults
  - Create alerts for missing data

## 6. Specific Code Changes Required

### Oracle Keeper

1. Update `fetchPrices` function in OracleKeeperFetcher:
```typescript
async fetchPrices() {
  try {
    // Primary source: CoinGecko
    const prices = await this.fetchCoinGeckoPrices();
    if (Object.keys(prices).length > 0) {
      return { prices, source: 'CoinGecko' };
    }
    
    // Fallback to other sources if needed
    return { prices: DEFAULT_PRICES, source: 'Default' };
  } catch (error) {
    console.error("Error fetching prices:", error);
    return { prices: DEFAULT_PRICES, source: 'Error Fallback' };
  }
}
```

2. Implement rate limiting and caching:
```typescript
// Rate limiting implementation
private async rateLimitedRequest(url: string) {
  if (this.isRateLimited) {
    throw new Error('Rate limit exceeded');
  }
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      this.isRateLimited = true;
      setTimeout(() => {
        this.isRateLimited = false;
      }, 60000); // Reset after 1 minute
    }
    throw error;
  }
}
```

### GMX Interface

1. Update OraclePricesProvider:
```tsx
function OraclePricesProvider({ children }) {
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        const oracleKeeper = new EnhancedOracleKeeperFetcher();
        const data = await oracleKeeper.fetchDirectPrices();
        setPrices(data);
        setError(null);
      } catch (err) {
        setError(err);
        console.error("Failed to fetch prices:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000); // Refresh every 15s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <OraclePricesContext.Provider value={{ prices, isLoading, error }}>
      {children}
    </OraclePricesContext.Provider>
  );
}
```

2. Update SwapBox component:
```tsx
function SwapBox() {
  const { prices } = useOraclePrices();
  const { contract: vaultContract } = useVaultContract();
  
  // Implementation using direct price feeds
  const executeSwap = async () => {
    if (!vaultContract) return;
    
    try {
      // Use prices from Oracle Keeper
      const fromTokenPrice = prices[fromToken.symbol];
      const toTokenPrice = prices[toToken.symbol];
      
      // Execute swap with contract
      const tx = await vaultContract.swap(
        fromTokenAddress,
        toTokenAddress,
        amount
      );
      
      await tx.wait();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
  
  // Component rendering
}
```

### GMX Contracts

1. SimplePriceFeed contract:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SimplePriceFeed is Ownable {
    // Struct to store price data
    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }
    
    // Mapping from token address to price data
    mapping(address => PriceData) public priceData;
    
    // Events
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    
    // Update price for a token
    function updatePrice(address token, uint256 price) external onlyOwner {
        priceData[token] = PriceData({
            price: price,
            timestamp: block.timestamp
        });
        
        emit PriceUpdated(token, price, block.timestamp);
    }
    
    // Update prices for multiple tokens
    function updatePrices(address[] calldata tokens, uint256[] calldata prices) external onlyOwner {
        require(tokens.length == prices.length, "Array length mismatch");
        
        for (uint i = 0; i < tokens.length; i++) {
            priceData[tokens[i]] = PriceData({
                price: prices[i],
                timestamp: block.timestamp
            });
            
            emit PriceUpdated(tokens[i], prices[i], block.timestamp);
        }
    }
    
    // Get price for a token
    function getPrice(address token) external view returns (uint256) {
        PriceData memory data = priceData[token];
        require(data.timestamp > 0, "Price not available");
        require(block.timestamp - data.timestamp <= 1 hours, "Price too old");
        
        return data.price;
    }
    
    // Get price with timestamp
    function getPriceWithTimestamp(address token) external view returns (uint256, uint256) {
        PriceData memory data = priceData[token];
        require(data.timestamp > 0, "Price not available");
        
        return (data.price, data.timestamp);
    }
}
```

## 7. Testing Protocol

### Unit Testing

- Test each component independently
- Verify price formatting and conversions
- Validate fallback mechanisms

```typescript
// Example test
describe('OracleKeeperFetcher', () => {
  it('should fetch prices from CoinGecko', async () => {
    const fetcher = new OracleKeeperFetcher();
    const result = await fetcher.fetchPrices();
    
    expect(result.prices).toBeDefined();
    expect(result.source).toBe('CoinGecko');
  });
  
  it('should fall back to defaults if API fails', async () => {
    // Mock API failure
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('API Error'));
    
    const fetcher = new OracleKeeperFetcher();
    const result = await fetcher.fetchPrices();
    
    expect(result.prices).toEqual(DEFAULT_PRICES);
    expect(result.source).toBe('Error Fallback');
  });
});
```

### Integration Testing

- Test interactions between components
- Verify price data flows from Oracle Keeper to UI
- Validate contract interactions with price data

### End-to-End Testing

- Complete trading flow tests
- Verify price updates in real-time
- Validate error handling and fallbacks

## 8. Fallback Procedure

### Oracle Keeper Fallbacks

1. CoinGecko API fails
   - Retry with exponential backoff
   - Switch to alternative API source
   - Use cached data if available

2. All external APIs unavailable
   - Serve cached data with staleness indicator
   - Fall back to default prices
   - Trigger alert for manual intervention

### Contract Fallbacks

1. SimplePriceFeed unavailable
   - Use last known good price
   - Implement circuit breaker for significant movements
   - Allow admin to manually update prices

### Frontend Fallbacks

1. Oracle Keeper unavailable
   - Use cached prices with staleness indicator
   - Display warning to users
   - Disable trading if price data too old

2. Contract interactions fail
   - Provide clear error messages
   - Allow retrying with adjusted parameters
   - Guide users through troubleshooting
