# Oracle Migration Plan: RedStone to Witnet

**Created:** May 11, 2025
**Status:** Planning Phase

## Overview

This document outlines the comprehensive plan for migrating the World Chain GMX integration from RedStone oracles to Witnet oracles. The migration affects all three repositories in the project:

1. Oracle Keeper Service (redstone-oracle-keeper)
2. GMX Contracts (gmx-contracts-world)
3. GMX Interface (gmx-interface-world)

## Table of Contents

- [1. Oracle Keeper Service Changes](#1-oracle-keeper-service-changes)
- [2. GMX Contracts Changes](#2-gmx-contracts-world-changes)
- [3. GMX Interface Changes](#3-gmx-interface-changes)
- [4. Implementation Timeline](#4-implementation-timeline)
- [5. Migration Risks & Mitigation](#5-migration-risks--mitigation)
- [6. Specific Code Changes Required](#6-specific-code-changes-required)
- [7. Testing Protocol](#7-testing-protocol)
- [8. Rollback Procedure](#8-rollback-procedure)

## 1. Oracle Keeper Service Changes

### Phase 1: Update Core Components

#### Core Ethereum Client Integration
- Replace RedStone connector with ethers.js direct calls to Witnet Price Router
- Add Witnet ABI interfaces for IWitnetPriceRouter and IWitnetPriceFeed

#### Blockchain.ts Updates
- Remove RedStone-specific code
- Implement fetchWitnetPrices function to query the Witnet Price Router
- Keep CoinGecko integration as fallback
- Modify priority order: Witnet → CoinGecko → Hardcoded Prices

#### Service.ts Enhancements
- Update getPrices method to prioritize Witnet data
- Modify caching logic for Witnet price data
- Add timestamp checking to ensure data freshness

### Phase 2: Configuration Updates

#### Environment Configuration (wrangler.toml)
- Add WITNET_PRICE_ROUTER_ADDRESS for World Chain
- Keep USE_PRODUCTION_PRICES flag
- Define token pair IDs for WLD, WETH, MAG in Witnet format

#### Project Dependencies
- Remove @redstone-finance/evm-connector
- Add witnet-solidity-bridge dependency
- Update ethers.js to compatible version

### Phase 3: API Enhancements

#### Endpoint Updates
- Enhance /health endpoint to include Witnet connectivity status
- Modify /prices response format to include source & timestamp
- Add diagnostic data to help troubleshoot Oracle issues

## 2. GMX Contracts (World Chain) Changes

### Phase 1: Prepare Contract Updates

#### Oracle Interface Changes
- Replace RedStone inheritance with Witnet interface
- Create adapter pattern for backward compatibility

```solidity
// Replace
contract PriceFeed is RedStoneConsumerBase {
  // RedStone implementation
}

// With
contract PriceFeed {
  IWitnetPriceRouter public immutable priceRouter;
  
  constructor(address _witnetPriceRouter) {
    priceRouter = IWitnetPriceRouter(_witnetPriceRouter);
  }
  
  function getPrice(bytes4 assetId) public view returns (uint256) {
    (int256 price,,) = priceRouter.valueFor(assetId);
    return uint256(price);
  }
}
```

#### Price Feed Logic
- Update price scaling to match Witnet's 6 decimal format
- Map token symbols to Witnet pair IDs
- Implement fallback mechanism for unsupported pairs

### Phase 2: Testing & Deployment

#### Contract Tests
- Create mock Witnet Price Router for testing
- Verify price conversion logic
- Test with real World Chain testnet

#### Contract Deployment
- Deploy updated oracle contracts to World Chain
- Set up price feed mappings for WLD, WETH, MAG
- Verify integration with GMX protocol

## 3. GMX Interface Changes

### Phase 1: Core Integration

#### Redux Data Flow
- Replace RedStone SDK with direct contract calls
- Update price feed actions to query Witnet-based oracle

#### Price Display Logic
- Update price formatting to account for Witnet's 6 decimal precision
- Modify price aggregation for consistency with backend

### Phase 2: User Experience Updates

#### Oracle Data Transparency
- Add indicator showing price source (Witnet)
- Display price feed health status
- Include timestamp of last price update

#### Error Handling
- Improve fallback logic when Witnet data is unavailable
- Add user-friendly error messages
- Implement graceful degradation

## 4. Implementation Timeline

### Week 1: Oracle Keeper Updates (Days 1-3)
- Remove RedStone dependencies
- Implement core Witnet integration
- Update API endpoints

### Week 1: Testing & Debugging (Days 4-7)
- Deploy updated Oracle Keeper to test environment
- Run integration tests with Witnet on World Chain
- Fix any issues identified

### Week 2: GMX Contracts (Days 8-10)
- Update contract interfaces
- Test with Oracle Keeper
- Deploy to World Chain

### Week 2: GMX Interface (Days 11-14)
- Update frontend integration
- End-to-end testing
- Deploy to production

## 5. Migration Risks & Mitigation

### Price Accuracy Risks
- **Risk**: Witnet price feed differs from RedStone
- **Mitigation**: Implement validation against CoinGecko, add alerting for large discrepancies

### Integration Failures
- **Risk**: Contract calls to Witnet fail
- **Mitigation**: Comprehensive fallback system with CoinGecko and emergency prices

### Data Availability
- **Risk**: Witnet doesn't support all required pairs
- **Mitigation**: Verify all required pairs are available in advance, prepare derived price calculations if needed

## 6. Specific Code Changes Required

### Oracle Keeper Service

```typescript
// New interface for Witnet (blockchain.ts)
interface WitnetPriceRouter {
  valueFor(pairId: string): Promise<[BigNumber, BigNumber, BigNumber]>;
}

// Price fetching function (blockchain.ts)
async function fetchWitnetPrices(provider: ethers.providers.Provider, supportedTokens: string[]): Promise<PriceCache> {
  try {
    const router = new ethers.Contract(
      WITNET_PRICE_ROUTER_ADDRESS,
      WitnetPriceRouterABI,
      provider
    );
    
    const prices: PriceCache = {};
    const tokenPairIds = {
      'WLD': '0x574c4455', // Example bytes4 ID for WLD/USD
      'WETH': '0x3d15f701', // ETH/USD standard ID
      'MAG': '0x4d414755', // Example bytes4 ID for MAG/USD
    };
    
    for (const token of supportedTokens) {
      if (tokenPairIds[token]) {
        const [price, timestamp, _] = await router.valueFor(tokenPairIds[token]);
        prices[token] = {
          value: price.toNumber() / 1000000, // Convert from 6 decimals
          timestamp: timestamp.toNumber()
        };
      }
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching Witnet prices:', error);
    return {};
  }
}

// Updated getPrices in service.ts
public async getPrices(): Promise<PricesResponse> {
  // Try Witnet first
  const witnetPrices = await fetchWitnetPrices(this.provider, this.supportedTokens);
  
  if (Object.keys(witnetPrices).length === this.supportedTokens.length) {
    return { prices: witnetPrices, source: 'witnet' };
  }
  
  // Fallback to CoinGecko
  const coingeckoPrices = await fetchCoinGeckoPrices(this.supportedTokens);
  
  if (Object.keys(coingeckoPrices).length === this.supportedTokens.length) {
    return { prices: coingeckoPrices, source: 'coingecko' };
  }
  
  // Final fallback to emergency prices
  return { 
    prices: getEmergencyPrices(this.supportedTokens), 
    source: 'emergency' 
  };
}
```

### GMX Contracts

```solidity
// contracts/oracle/PriceFeed.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWitnetPriceRouter.sol";

contract PriceFeed is Ownable {
    IWitnetPriceRouter public immutable priceRouter;
    
    // Mapping from token address to Witnet price feed ID
    mapping(address => bytes4) public priceFeedIds;
    
    event PriceFeedIdSet(address token, bytes4 priceFeedId);
    
    constructor(address _witnetPriceRouter) {
        priceRouter = IWitnetPriceRouter(_witnetPriceRouter);
    }
    
    function setPriceFeedId(address _token, bytes4 _priceFeedId) external onlyOwner {
        priceFeedIds[_token] = _priceFeedId;
        emit PriceFeedIdSet(_token, _priceFeedId);
    }
    
    function getPrice(address _token) external view returns (uint256) {
        bytes4 priceFeedId = priceFeedIds[_token];
        require(priceFeedId != bytes4(0), "Price feed not configured");
        
        (int256 price, uint256 timestamp, uint256 status) = priceRouter.valueFor(priceFeedId);
        
        // Check for valid price
        require(status == 0, "Price feed unavailable");
        require(timestamp > block.timestamp - 1 hours, "Price too old");
        require(price > 0, "Invalid price");
        
        // Witnet uses 6 decimals, GMX likely uses 18 or 8 decimals - adjust as needed
        return uint256(price) * 10**12; // Convert 6 to 18 decimals
    }
}
```

### GMX Interface

```typescript
// src/Api/prices.ts
import { ethers } from 'ethers';
import { getContract } from './contracts';

const PRICE_FEED_ABI = [...]; // ABI for updated PriceFeed contract

export async function fetchPrices(chainId, tokens, provider) {
  const prices = {};
  const priceFeedAddress = getPriceFeedAddress(chainId);
  
  if (!priceFeedAddress) {
    console.error("Price feed address not configured");
    return prices;
  }
  
  try {
    const priceFeed = getContract(priceFeedAddress, PRICE_FEED_ABI, provider);
    
    for (const token of tokens) {
      try {
        const price = await priceFeed.getPrice(token.address);
        prices[token.symbol] = {
          value: ethers.utils.formatUnits(price, 18),
          updated: Date.now()
        };
      } catch (error) {
        console.error(`Error fetching price for ${token.symbol}:`, error);
      }
    }
    
    return prices;
  } catch (error) {
    console.error("Error initializing price feed:", error);
    return prices;
  }
}
```

## 7. Testing Protocol

### Unit Testing
- Test each component in isolation
- Mock dependencies to test specific functionality
- Verify error handling and fallback mechanisms

### Integration Testing
- Test interactions between components
- Verify Oracle Keeper can communicate with Witnet contracts
- Ensure GMX Interface can display prices from new Oracle

### End-to-End Testing
- Test full user workflows with real contracts
- Verify position creation and management works correctly
- Confirm accurate price feeds are used in transactions

## 8. Rollback Procedure

In case of critical issues:

1. **Oracle Keeper**: Revert to previous version with RedStone integration
2. **GMX Contracts**: Have a backup version of RedStone-compatible contracts ready
3. **GMX Interface**: Implement feature flags to switch between Witnet and RedStone integrations
4. **Monitoring**: Set up alerts for price deviations to quickly identify issues
