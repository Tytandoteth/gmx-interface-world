# Comprehensive Integration Guide: GMX on World Chain

This guide provides detailed instructions for integrating the test environment we've created with your GMX interface and Oracle Keeper.

## Table of Contents
1. [Project Architecture Overview](#1-project-architecture-overview)
2. [Contract Integration](#2-contract-integration)
3. [Oracle Keeper Integration](#3-oracle-keeper-integration)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Token Price Mapping](#5-token-price-mapping)
6. [Regular Price Updates](#6-regular-price-updates)
7. [Testing Workflow](#7-testing-workflow)
8. [Troubleshooting](#8-troubleshooting)

## 1. Project Architecture Overview
The integration consists of three main components:

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│                 │     │                     │     │                  │
│  Oracle Keeper  │────▶│  SimplePriceFeed    │◀────│  GMX Interface   │
│  (API Service)  │     │  (On-chain Bridge)  │     │  (Frontend)      │
│                 │     │                     │     │                  │
└─────────────────┘     └─────────────────────┘     └──────────────────┘
        │                          │                          │
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │                 │
                           │  GMX Contracts  │
                           │  (Core Logic)   │
                           │                 │
                           └─────────────────┘
```

### Key Components:
- **Oracle Keeper**: External service providing real-time price data
  - Endpoint: https://oracle-keeper.kevin8396.workers.dev/direct-prices
  - Provides prices for: WLD, WETH, MAG
- **SimplePriceFeed**: On-chain bridge for price data
  - Address: 0xa19F571B0B00A36028Ce47721AFa1395Bb581E5d
  - Stores prices for test tokens
- **Test Tokens**: Simplified tokens for testing
  - TUSD: 0xc1f17FB5db2A71617840eCe29c241997448f6720
  - TBTC: 0x9cdee0fb64c18d3af7C8cB30Aada5f7fe90aF553
  - TETH: 0xE9298442418B800105b86953db930659e5b13058
- **GMX Core Contracts**: Trading functionality
  - Vault: 0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
  - Router: 0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
  - PositionRouter: 0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
  - OrderBook: 0x8179D468fF072B8A9203A293a37ef70EdCA850fc

## 2. Contract Integration

### Step 1: Contract Address Configuration
Create a configuration file in your interface repository:

```typescript
// src/config/contracts.ts
export const WORLD_CHAIN_ID = 480;

export const TEST_ENVIRONMENT = {
  // Test Tokens
  tokens: {
    TUSD: {
      address: "0xc1f17FB5db2A71617840eCe29c241997448f6720",
      symbol: "TUSD",
      name: "Test USD",
      decimals: 18,
      isStable: true,
      isShortable: false,
      imageUrl: "/icons/tusd.svg"
    },
    TBTC: {
      address: "0x9cdee0fb64c18d3af7C8cB30Aada5f7fe90aF553",
      symbol: "TBTC",
      name: "Test Bitcoin",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "/icons/tbtc.svg"
    },
    TETH: {
      address: "0xE9298442418B800105b86953db930659e5b13058",
      symbol: "TETH",
      name: "Test Ethereum",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "/icons/teth.svg"
    }
  },
  
  // Core Contracts
  contracts: {
    Vault: "0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5",
    Router: "0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b",
    PositionRouter: "0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF",
    PositionManager: "0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D",
    OrderBook: "0x8179D468fF072B8A9203A293a37ef70EdCA850fc",
    SimplePriceFeed: "0xa19F571B0B00A36028Ce47721AFa1395Bb581E5d"
  }
};
```

### Step 2: Environment Variables
Update your .env.local file:

```
# RPC Configuration
VITE_WORLD_RPC_URL=https://rpc.world-chain.com/v1/mainnet

# Oracle Keeper Configuration
VITE_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev/direct-prices

# Test Environment
VITE_USE_TEST_TOKENS=true
```

### Step 3: Contract ABIs
Ensure you have ABIs for all needed contracts. The key ones are:
- SimplePriceFeed.json
- Vault.json
- Router.json
- Token.json (for ERC20 operations)

## 3. Oracle Keeper Integration

### Step 1: Create API Service

```typescript
// src/services/oracleKeeperService.ts
import axios from 'axios';

const ORACLE_KEEPER_URL = process.env.VITE_ORACLE_KEEPER_URL || 'https://oracle-keeper.kevin8396.workers.dev/direct-prices';

export interface OracleKeeperResponse {
  prices: {
    [key: string]: number;
  };
  timestamp: string;
  source: string;
  status: string;
}

export const fetchOracleKeeperPrices = async (): Promise<OracleKeeperResponse> => {
  try {
    const response = await axios.get<OracleKeeperResponse>(ORACLE_KEEPER_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching prices from Oracle Keeper:', error);
    
    // Return fallback data if API call fails
    return {
      prices: {
        WLD: 1.24,
        WETH: 2483.15,
        MAG: 0.00041411
      },
      timestamp: new Date().toISOString(),
      source: 'Fallback Data',
      status: 'error'
    };
  }
};
```

### Step 2: Create Price Mapping Service

```typescript
// src/services/priceMappingService.ts
import { fetchOracleKeeperPrices } from './oracleKeeperService';

// Mapping between production tokens and test tokens
export const TOKEN_PRICE_MAPPING: Record<string, { source: string; scale: number }> = {
  'TUSD': { source: 'WLD', scale: 1 },     // TUSD price = WLD price
  'TBTC': { source: 'WETH', scale: 12 },   // TBTC price = WETH price * 12
  'TETH': { source: 'WETH', scale: 1 }     // TETH price = WETH price
};

export interface MappedPrices {
  production: Record<string, number>;  // Original prices (WLD, WETH, MAG)
  test: Record<string, number>;        // Mapped prices (TUSD, TBTC, TETH)
  timestamp: string;
  source: string;
}

export const mapOracleKeeperPrices = async (): Promise<MappedPrices> => {
  const oracleData = await fetchOracleKeeperPrices();
  const productionPrices = oracleData.prices;
  const testPrices: Record<string, number> = {};
  
  // Map production token prices to test tokens
  Object.entries(TOKEN_PRICE_MAPPING).forEach(([testToken, mapping]) => {
    const { source, scale } = mapping;
    
    if (productionPrices[source]) {
      testPrices[testToken] = productionPrices[source] * scale;
    } else {
      // Use fallback values if source prices aren't available
      if (testToken === 'TUSD') testPrices[testToken] = 1.0;
      if (testToken === 'TBTC') testPrices[testToken] = 30000.0;
      if (testToken === 'TETH') testPrices[testToken] = 2500.0;
    }
  });
  
  return {
    production: productionPrices,
    test: testPrices,
    timestamp: oracleData.timestamp,
    source: oracleData.source
  };
};
```

## 4. Frontend Implementation

### Step 1: Create React Hooks for Price Data

```typescript
// src/hooks/usePrices.ts
import { useState, useEffect } from 'react';
import { mapOracleKeeperPrices, MappedPrices } from '../services/priceMappingService';

export const usePrices = (refreshInterval = 30000) => {
  const [prices, setPrices] = useState<MappedPrices | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const mappedPrices = await mapOracleKeeperPrices();
        setPrices(mappedPrices);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error fetching prices:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch immediately
    fetchPrices();
    
    // Set up interval for refreshing prices
    const intervalId = setInterval(fetchPrices, refreshInterval);
    
    // Clear interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  return { prices, loading, error };
};
```

### Step 2: Create Token Provider

```typescript
// src/context/TokenContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TEST_ENVIRONMENT } from '../config/contracts';

// Check if test tokens mode is enabled
const useTestTokens = process.env.VITE_USE_TEST_TOKENS === 'true';

interface TokenContextType {
  tokens: typeof TEST_ENVIRONMENT.tokens;
  isTestMode: boolean;
}

const TokenContext = createContext<TokenContextType>({
  tokens: TEST_ENVIRONMENT.tokens,
  isTestMode: useTestTokens
});

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TokenContext.Provider value={{ 
      tokens: TEST_ENVIRONMENT.tokens, 
      isTestMode: useTestTokens 
    }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useTokens = () => useContext(TokenContext);
```

### Step 3: Create Contract Provider

```typescript
// src/context/ContractContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3Provider } from './Web3Context';
import { TEST_ENVIRONMENT, WORLD_CHAIN_ID } from '../config/contracts';

// Import ABIs
import VaultABI from '../abis/Vault.json';
import RouterABI from '../abis/Router.json';
import TokenABI from '../abis/Token.json';
import SimplePriceFeedABI from '../abis/SimplePriceFeed.json';

interface ContractsContextType {
  vault: ethers.Contract | null;
  router: ethers.Contract | null;
  positionRouter: ethers.Contract | null;
  simplePriceFeed: ethers.Contract | null;
  getTokenContract: (address: string) => ethers.Contract | null;
  isInitialized: boolean;
}

const ContractsContext = createContext<ContractsContextType>({
  vault: null,
  router: null,
  positionRouter: null,
  simplePriceFeed: null,
  getTokenContract: () => null,
  isInitialized: false
});

export const ContractsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { provider, chainId } = useWeb3Provider();
  
  const contracts = useMemo(() => {
    if (!provider || chainId !== WORLD_CHAIN_ID) {
      return {
        vault: null,
        router: null,
        positionRouter: null,
        simplePriceFeed: null,
        getTokenContract: () => null,
        isInitialized: false
      };
    }
    
    const signer = provider.getSigner();
    
    const vault = new ethers.Contract(
      TEST_ENVIRONMENT.contracts.Vault,
      VaultABI,
      signer
    );
    
    const router = new ethers.Contract(
      TEST_ENVIRONMENT.contracts.Router,
      RouterABI,
      signer
    );
    
    const positionRouter = new ethers.Contract(
      TEST_ENVIRONMENT.contracts.PositionRouter,
      RouterABI, // Use appropriate ABI
      signer
    );
    
    const simplePriceFeed = new ethers.Contract(
      TEST_ENVIRONMENT.contracts.SimplePriceFeed,
      SimplePriceFeedABI,
      signer
    );
    
    const getTokenContract = (address: string) => {
      if (!address) return null;
      return new ethers.Contract(address, TokenABI, signer);
    };
    
    return {
      vault,
      router,
      positionRouter,
      simplePriceFeed,
      getTokenContract,
      isInitialized: true
    };
  }, [provider, chainId]);
  
  return (
    <ContractsContext.Provider value={contracts}>
      {children}
    </ContractsContext.Provider>
  );
};

export const useContracts = () => useContext(ContractsContext);
```

### Step 4: Create Test Token Minter Component

```tsx
// src/components/TestTokenMinter.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useTokens } from '../context/TokenContext';
import { useContracts } from '../context/ContractContext';
import { useWeb3Provider } from '../context/Web3Context';

export const TestTokenMinter: React.FC = () => {
  const { tokens, isTestMode } = useTokens();
  const { getTokenContract } = useContracts();
  const { address } = useWeb3Provider();
  
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  // Only show in test mode
  if (!isTestMode) return null;
  
  const handleMint = async () => {
    if (!selectedToken || !amount || !address) return;
    
    try {
      setTxStatus('pending');
      
      const token = tokens[selectedToken];
      const tokenContract = getTokenContract(token.address);
      
      if (!tokenContract) {
        throw new Error('Contract not initialized');
      }
      
      const parsedAmount = ethers.utils.parseUnits(amount, token.decimals);
      
      const tx = await tokenContract.mint(address, parsedAmount);
      await tx.wait();
      
      setTxStatus('success');
      setAmount('');
      
      // Reset status after a delay
      setTimeout(() => setTxStatus('idle'), 3000);
    } catch (error) {
      console.error('Error minting tokens:', error);
      setTxStatus('error');
      
      setTimeout(() => setTxStatus('idle'), 3000);
    }
  };
  
  return (
    <div className="test-token-minter">
      <h3>Mint Test Tokens</h3>
      
      <div className="form-group">
        <label>Token</label>
        <select 
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          disabled={txStatus === 'pending'}
        >
          <option value="">Select Token</option>
          {Object.entries(tokens).map(([symbol, token]) => (
            <option key={symbol} value={symbol}>{token.name} ({symbol})</option>
          ))}
        </select>
      </div>
      
      <div className="form-group">
        <label>Amount</label>
        <input 
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to mint"
          disabled={txStatus === 'pending'}
        />
      </div>
      
      <button 
        onClick={handleMint}
        disabled={!selectedToken || !amount || txStatus === 'pending'}
        className={`mint-button ${txStatus}`}
      >
        {txStatus === 'pending' ? 'Minting...' : 'Mint Tokens'}
      </button>
      
      {txStatus === 'success' && (
        <div className="success-message">Tokens minted successfully!</div>
      )}
      
      {txStatus === 'error' && (
        <div className="error-message">Error minting tokens. Please try again.</div>
      )}
    </div>
  );
};
```

## 5. Token Price Mapping

### How the Price Mapping Works
The price mapping system connects Oracle Keeper prices with your test tokens:

1. **WLD price → TUSD**
   - Oracle Keeper returns: WLD: $1.24
   - Maps directly to: TUSD: $1.24
   - Use case: Stablecoin simulation

2. **WETH price → TETH**
   - Oracle Keeper returns: WETH: $2483.15
   - Maps directly to: TETH: $2483.15
   - Use case: Ethereum simulation

3. **WETH price (scaled) → TBTC**
   - Oracle Keeper returns: WETH: $2483.15
   - Multiplies by 12: TBTC: $29,797.80
   - Use case: Bitcoin simulation (higher price point)

This creates a realistic trading environment with prices that move according to real market conditions.

### On-Chain to Off-Chain Synchronization
There are two paths for price data:

1. **Off-chain (UI display)**:
   - Oracle Keeper API → Frontend → UI display
   - Updated every 30 seconds via API calls
   - Used for charts, trade previews, position displays

2. **On-chain (transactions)**:
   - Oracle Keeper API → SimplePriceFeed contract → GMX contracts
   - Updated via the mapOracleKeeperToTestTokens.js script
   - Used for actual trading/transaction execution

Both paths use the same source data, ensuring consistency.

## 6. Regular Price Updates

For production use, you need to regularly update the on-chain prices from the Oracle Keeper.

### Option 1: Manual Updates
Run the script manually when needed:

```bash
npx hardhat run scripts/world/mapOracleKeeperToTestTokens.js --network worldchain
```

### Option 2: Cron Job (Recommended)
Set up a cron job to run the script automatically:

1. Create a shell script wrapper:
```bash
# update_prices.sh
#!/bin/bash
cd /path/to/gmx-contracts-world
npx hardhat run scripts/world/mapOracleKeeperToTestTokens.js --network worldchain >> price_updates.log 2>&1
```

2. Make it executable:
```bash
chmod +x update_prices.sh
```

3. Add a cron job (runs every 5 minutes):
```bash
*/5 * * * * /path/to/update_prices.sh
```

### Option 3: Backend Service
Implement the price update logic in a dedicated Node.js service:

```javascript
const { ethers } = require('ethers');
const axios = require('axios');
const cron = require('node-cron');

// Configure provider
const provider = new ethers.providers.JsonRpcProvider('https://rpc.world-chain.com/v1/mainnet');
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

// SimplePriceFeed contract
const simplePriceFeedAddress = '0xa19F571B0B00A36028Ce47721AFa1395Bb581E5d';
const simplePriceFeedABI = [
  'function updatePrice(address _token, uint256 _price) external',
  'function prices(address) view returns (uint256)'
];
const simplePriceFeed = new ethers.Contract(
  simplePriceFeedAddress,
  simplePriceFeedABI,
  wallet
);

// Test token addresses
const testTokens = {
  'TUSD': {
    address: '0xc1f17FB5db2A71617840eCe29c241997448f6720',
    source: 'WLD',
    scale: 1
  },
  'TBTC': {
    address: '0x9cdee0fb64c18d3af7C8cB30Aada5f7fe90aF553',
    source: 'WETH',
    scale: 12
  },
  'TETH': {
    address: '0xE9298442418B800105b86953db930659e5b13058',
    source: 'WETH',
    scale: 1
  }
};

// Update prices function
async function updatePrices() {
  try {
    console.log(`Updating prices at ${new Date().toISOString()}`);
    
    // Fetch prices from Oracle Keeper
    const response = await axios.get('https://oracle-keeper.kevin8396.workers.dev/direct-prices');
    const oraclePrices = response.data.prices;
    
    console.log('Oracle prices:', oraclePrices);
    
    // Update each token price
    for (const [testToken, config] of Object.entries(testTokens)) {
      const sourcePrice = oraclePrices[config.source];
      
      if (sourcePrice) {
        const price = sourcePrice * config.scale;
        const priceWithPrecision = ethers.utils.parseUnits(price.toString(), 30);
        
        console.log(`Updating ${testToken} price to $${price}`);
        
        const tx = await simplePriceFeed.updatePrice(
          config.address,
          priceWithPrecision
        );
        
        await tx.wait();
        console.log(`${testToken} price updated successfully`);
      } else {
        console.log(`No price found for source token ${config.source}`);
      }
    }
    
    console.log('Price update complete');
  } catch (error) {
    console.error('Error updating prices:', error);
  }
}

// Schedule updates every 5 minutes
cron.schedule('*/5 * * * *', updatePrices);

// Initial update
updatePrices();

console.log('Price update service started');
```

## 7. Testing Workflow

### End-to-End Testing Flow

1. **Initialize Test Environment**
   - Connect wallet to World Chain (chainId: 480)
   - Mint test tokens to your account
   - Ensure price feed is updating correctly

2. **Test Basic Trading**
   - Swap TUSD for TETH (test token swaps)
   - Verify price execution matches Oracle Keeper data
   - Test slippage settings and fee calculations

3. **Test Leveraged Trading**
   - Create long/short positions using test tokens
   - Verify leverage calculations and liquidation prices
   - Test position management (increase, decrease, close)

4. **Test Advanced Features**
   - Place limit orders using OrderBook
   - Test order execution at specific price points
   - Verify position router handling

5. **Monitor Price Updates**
   - Track how UI prices update vs. on-chain prices
   - Verify consistency between displayed and executed prices
   - Test trading during price movements

## 8. Troubleshooting

### Common Issues and Solutions

**Issue**: Token prices not updating on-chain  
**Solution**:
- Verify the mapOracleKeeperToTestTokens.js script is running
- Check wallet has enough ETH for gas fees
- Confirm correct contract addresses

**Issue**: Frontend not displaying correct prices  
**Solution**:
- Check Oracle Keeper URL is accessible
- Verify mapping logic in priceMappingService.ts
- Confirm refresh interval is working

**Issue**: Cannot mint test tokens  
**Solution**:
- Verify correct Token contract ABI
- Check wallet has permission to mint
- Ensure correct decimal precision for amount

**Issue**: Trading transactions failing  
**Solution**:
- Verify token approvals for Router/Vault
- Check gas limit settings
- Confirm price impact is within allowed range

This guide provides a comprehensive framework for integrating GMX on World Chain with your Oracle Keeper. The approach allows you to use your existing Oracle Keeper service while providing a robust test environment with realistic price movements.

By following these instructions, you'll have a fully functional GMX trading platform on World Chain that uses real market data from your Oracle Keeper API.
