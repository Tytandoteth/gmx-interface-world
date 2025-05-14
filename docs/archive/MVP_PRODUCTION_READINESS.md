# Production MVP Readiness Guide

**File Path:** `/Users/tyblackard/Documents/Windsurf/gmx-interface-world/docs/MVP_PRODUCTION_READINESS.md`
**Last Updated:** May 12, 2025 (Updated for CoinGecko Integration)

---

## Objective

Provide a single, comprehensive living document to guide all three World Chain GMX repositories (Smart Contracts, Oracle Keeper, Frontend Interface) through production-ready MVP deployment with live data.

---

## Document Contents

1. Project Scope
2. Repository Responsibilities
3. Repository Status & Immediate Next Steps
4. Integration Points
5. Production Readiness Checklist
6. Testing Protocol
7. Deployment Quick Reference
8. Environment Variables Reference
9. Troubleshooting Guide
10. Monitoring & Alerting
11. Action Items & Ownership
12. Additional Handoff Details
13. Communication & Reporting
14. Definition of Done
15. Contact Information

---

## 1. Project Scope

* Deploy and maintain a GMX-derived perpetual trading platform on World Chain.
* Support trading pairs: WLD, WETH, MAG.
* Provide robust, source-agnostic oracle infrastructure using CoinGecko as the primary price source with flexibility to swap to other sources in the future.
* Simplify the UI into a lightweight, performant mini-app.
* Ensure high reliability, security, and observable operations in production.

---

## 2. Repository Responsibilities

**A. Smart Contracts (`gmx-contracts-world`)**

* Core GMX components: Vault, Router, OrderBook, PositionRouter/Manager, Trackers.
* Integration with Witnet Price Router contract.
* Deployment & configuration scripts (Hardhat).

**B. Oracle Keeper (`oracle-keeper`)**

* Cloudflare Workers-based middleware providing `/prices`, `/direct-prices`, and `/health` endpoints.
* Live feeds for WLD/USD, WETH/USD, MAG/USD using CoinGecko with flexible architecture for future source changes.
* Source-agnostic implementation with clear price provider implementation.
* Diagnostic UI, health checks, retry logic.

**C. Frontend Interface (`gmx-interface-world`)**

* React/TypeScript trading UI consuming contracts and oracle service.
* EnhancedOracleKeeperFetcher with direct prices support for real-time data.
* OraclePricesProvider context for application-wide price data access.
* Reusable UI components (TokenPriceDisplay, ExchangePriceBar, etc.) for price visualization.
* Debug pages, status indicators, and mode toggle (dev/prod).

---

## 3. Repository Status & Immediate Next Steps

### Oracle Keeper

**Status: 🟢 Core Functionality Complete (70%)**

- ✅ Cloudflare Worker deployed at: `https://oracle-keeper.kevin8396.workers.dev`
- ✅ Health endpoint and debug UI implemented
- ✅ New `/direct-prices` endpoint for real-time data
- ✅ Support for required tokens (WLD, WETH, MAG)
- ✅ Source-agnostic price feed architecture 
- ✅ CoinGecko integration as primary price source
- ✅ Fallback mechanisms for reliability
- 🔄 Fine-tuning response caching mechanisms

**Next Steps:**

1. **Configure production `.env`**

   ```toml
   USE_MOCK_PRICES=false
   COINGECKO_API_KEY=<api_key>
   RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
   CHAIN_ID=480
   SUPPORTED_TOKENS=WLD,WETH,MAG
   ```
2. **Automate data-source switching** based on oracle health metrics
3. **Resolve KV cache issues** in `/prices` endpoint
4. **Enable monitoring & alerts** (e.g. Datadog/Grafana integrations)

### Smart Contracts

**Status:** ⚠️ Oracle Migration (30%)

* Contracts deployed with mock feeds.
* Core infrastructure verified.
* Configured for source-agnostic price feed integration.
* Tokens (WLD, WETH, MAG) not whitelisted in Vault.

**Next Steps:**

1. **Configure source-agnostic price feed integration**

   ```bash
   npx hardhat run scripts/world/configurePriceFeeds.js --network worldchain
   ```
2. **Switch to live price feeds**

   ```bash
   npx hardhat run scripts/world/switchToLivePriceFeeds.js --network worldchain
   ```
3. **Whitelist tokens in Vault**

   ```bash
   npx hardhat run scripts/world/whitelistTokens.js --network worldchain
   ```
4. **Verify deployment**

   ```bash
   npx hardhat run scripts/world/verifyCompleteDeployment.js --network worldchain
   ```

### Frontend Interface (gmx-interface-world)

**Status:** 🟡 Integration Advanced (85%)

* ✅ OraclePricesProvider context for application-wide price data access
* ✅ EnhancedOracleKeeperFetcher with direct prices support
* ✅ UI components for price visualization in Dashboard and Exchange pages
* ✅ Mode switching (development/production)
* 🔄 Addressing lint warnings and TypeScript type issues
* 🔄 Additional integration points in trading components

**Next Steps:**

1. **Fix remaining lint issues** in Oracle Keeper client implementation
   ```bash
   npm run lint:fix
   ```

2. **Update `.env.production`** with deployed contract addresses & Oracle Keeper URL
   ```
   VITE_WORLD_RPC_URL=https://rpc.world-chain.com/v1/mainnet
   VITE_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
   VITE_VAULT_ADDRESS=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
   ```

3. **Complete integration tests** for price data components

4. **End‑to‑end testing** (swaps, leveraged positions, orders)

**Production Configuration:**
- ✅ Production configuration framework
- ✅ Environment-aware context provider
- ✅ Production setup documentation
- ✅ Development/production toggle

### GMX Contracts

**Status: Contract Deployment Required**

- ✅ Contract modifications for World Chain completed
- ✅ Local testing successful
- ❌ Contracts not yet deployed to World Chain mainnet

## Integration Points

The following diagram illustrates how the three repositories interact:

```
┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │
│   GMX Interface   │◄────►│   Oracle Keeper   │
│                   │      │                   │
└────────┬──────────┘      └─────────┬─────────┘
         │                           │
         │                           │
         ▼                           ▼
┌───────────────────────────────────────────────┐
│                                               │
│               GMX Contracts                   │
│                                               │
└───────────────────────────────────────────────┘
```

### Key Integration Requirements

1. **Oracle Keeper ↔ GMX Interface**
   - Oracle Keeper provides price data via REST API endpoints (`/direct-prices`, `/prices`)
   - Oracle Keeper currently fetches data from CoinGecko as the primary price source
   - Interface fetches data using EnhancedOracleKeeperFetcher and OraclePricesProvider
   - Real-time price updates flow from Oracle Keeper → Interface → UI components
   - Price source information is displayed via PriceSourceBadge component
   - PriceValidator component provides visual verification of price feed integration
   - Source-agnostic design allows swapping price sources without UI changes

2. **Oracle Keeper ↔ GMX Contracts**
   - Oracle Keeper connects to Witnet Price Router for primary price data
   - CoinGecko API integration serves as fallback mechanism
   - Oracle Keeper must know contract addresses for health checks and status reporting

3. **GMX Interface ↔ GMX Contracts**
   - Interface needs contract addresses for all GMX contracts
   - ABI definitions must match deployed contracts
   - Price data accessed via OraclePricesProvider drives UI components

## Production Readiness Checklist

### Step 1: Contract Deployment

- [ ] Deploy GMX contracts to World Chain mainnet
- [ ] Record all deployed contract addresses
- [ ] Verify contract deployments on World Chain explorer
- [ ] Update the following addresses in an `.env.production` file:
  ```
  VITE_APP_WORLD_VAULT_ADDRESS=
  VITE_APP_WORLD_ROUTER_ADDRESS=
  VITE_APP_WORLD_POSITION_ROUTER_ADDRESS=
  VITE_APP_WORLD_GLP_MANAGER_ADDRESS=
  ```

### Step 2: Token Configuration

- [ ] Configure correct token addresses in production environment
  ```
  VITE_APP_WORLD_WLD_TOKEN=
  VITE_APP_WORLD_ETH_TOKEN=
  VITE_APP_WORLD_BTC_TOKEN=
  VITE_APP_WORLD_USDC_TOKEN=
  VITE_APP_WORLD_USDT_TOKEN=
  VITE_APP_WORLD_MAG_TOKEN=
  ```

### Step 3: Oracle Keeper Configuration

- [ ] Update Oracle Keeper with Witnet Price Router contract address
  ```
  WITNET_PRICE_ROUTER_ADDRESS=<address_on_world_chain>
  ```
- [ ] Configure RPC URL for World Chain
  ```
  RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/...
  ```
- [ ] Set USE_MOCK_PRICES=false for production
- [ ] Verify Oracle Keeper `/direct-prices` endpoint returns live values
- [ ] Test Oracle Keeper health endpoint with production contracts

### Step 4: Market Configuration

- [ ] Configure market token addresses
  ```
  VITE_APP_WORLD_WLD_USDC_MARKET_TOKEN=
  VITE_APP_WORLD_ETH_USDC_MARKET_TOKEN=

## Production Testing Tools

We've created specialized tools to validate the production readiness of all components:

### Developer Tools Dashboard

A comprehensive testing dashboard is available at `/worldchain/dev-tools` which provides:

- System status monitoring (development/production mode)
- Live price display from Oracle Keeper
- Oracle Keeper health and integration validation
- Production configuration validation

### Production Mode Toggle

The toggle at the bottom right of the UI lets you switch between modes:

- **Development Mode**: Uses mock data and simulated contracts
- **Production Mode**: Uses real contract addresses and live price feeds

This allows for easy comparison and validation of both environments.

### Status Indicator

A status bar at the bottom of the screen shows:

- Current mode (development/production)
- Contract connection status
- Oracle Keeper status
- Price feed information

## Testing Protocol

After deployment, perform these validation tests:

### Using Built-in Testing Tools

1. **Access Developer Tools**
   - Visit `/worldchain/dev-tools` in the application
   - Run integration tests in both development and production mode
   - Verify all validation checks pass in production mode

2. **Run Production Readiness Validation**
   - Use the "Production Readiness" tab in the developer tools
   - Verify no configuration issues are reported
   - Check that all required addresses are properly set

### Oracle Keeper Tests

1. **Health Check**
   ```
   curl https://oracle-keeper.kevin8396.workers.dev/health
   ```
   - Verify `isHealthy: true`
   - Verify `mode: 'live'`
   - Verify `source: 'CoinGecko'` in the response

2. **Price Validator Component**
   - Navigate to the Price Validator component in the developer tools
   - Verify connection status shows "✅ Connected"
   - Confirm prices are displaying for WLD, WETH, and MAG tokens
   - Verify the source displays "CoinGecko" for each price
   - Test the manual refresh button to ensure new price data loads

3. **Direct Prices Endpoint**
   ```
   curl https://oracle-keeper.kevin8396.workers.dev/direct-prices
   ```
   - Verify `status: 'success'`
   - Verify price data for WLD, WETH, MAG tokens exists
   - Verify `source: 'CoinGecko'` in the response
   - Verify `lastUpdated` timestamp is recent (within the last 5 minutes)

4. **Standard Prices Endpoint**
   ```
   curl https://oracle-keeper.kevin8396.workers.dev/prices
   ```
   - Verify each required token (WLD, WETH, MAG) has price data
   - Check data format is compatible with GMX interface
   - Verify the cache timestamp is within the expected refresh interval

### GMX Interface Tests

1. **Oracle Integration**
   - Open network tab in browser developer tools
   - Verify successful requests to Oracle Keeper
   - Confirm price data appears in UI

2. **Contract Integration**
   - Connect wallet to World Chain
   - Verify market data loads correctly
   - Check token balances display properly

3. **Oracle Integration**
   - Look for the production status indicator showing "PRODUCTION" mode
   - Verify price feeds show the current oracle source (CoinGecko)
   - Verify the `OraclePricesProvider` is providing data to UI components (check React DevTools)
   - Confirm price update frequency matches expected poll interval

4. **Transaction Flow**
   - Create a small test position
   - Verify transaction completes successfully
   - Check position appears in positions list

## Troubleshooting

### Oracle Keeper Issues

- Check Cloudflare Worker logs
- Verify CoinGecko API is accessible and returning valid data
- Check that `/direct-prices` endpoint is responding with valid data
- Verify RPC connection to World Chain is working
- Ensure Oracle Keeper has correct contract addresses

### GMX Interface Issues

- Check browser console for errors
- Verify environment variables are correctly set
- Test development mode to isolate contract vs interface issues

### Contract Issues

- Verify contract deployment was successful
- Check contract interactions on World Chain explorer
- Confirm contract ABIs match the deployed contracts

## Oracle Integration Plan
The World Chain GMX project now uses a source-agnostic price oracle approach with the following implementation:

1. **Oracle Keeper:**
   - Implemented direct integration with CoinGecko as the primary price source
   - Created a flexible architecture allowing easy switching between different price sources
   - Enhanced API endpoints with source tracking and improved error handling
   - Added `/direct-prices` endpoint for real-time data with minimal latency
   - Built intelligent caching system while maintaining data freshness

2. **GMX Interface:**
   - Implemented source-agnostic price providers and hooks through OraclePricesProvider
   - Added price display components (TokenPriceDisplay, PriceValidator) showing source information
   - Created utilities for testing and validating price integration
   - Designed TestTokenMinter for simulating token interactions during development
   - Developed comprehensive testing panel for price feed validation

3. **GMX Contracts:**
   - Contracts configured to work with source-agnostic price feeds from Oracle Keeper
   - Price scaling and decimal handling compatible with CoinGecko data format
   - Ready for deployment to World Chain mainnet

### Integration Timeline

- **May 12, 2025**: Complete interface integration with CoinGecko price source
- **May 13, 2025**: Deploy contracts to World Chain mainnet
- **May 14, 2025**: End-to-end testing with deployed contracts
- **May 15, 2025**: Production MVP launch

## Current Action Items

1. **GMX Contracts Team**:
   - Deploy contracts to World Chain mainnet with existing configuration
   - Provide deployed contract addresses to Interface and Oracle Keeper teams
   - Whitelist tokens (WLD, WETH, MAG) in the Vault contract
   - Verify contract functionality on mainnet

2. **Oracle Keeper Team**:
   - Confirm CoinGecko API rate limits are sufficient for production
   - Update Oracle Keeper with production contract addresses
   - Configure production monitoring for API endpoints
   - Implement automatic switching to fallback sources if needed
   - Verify price feed accuracy across all supported tokens

3. **GMX Interface Team**:
   - ✅ Implement source-agnostic price data architecture for flexible provider switching
   - ✅ Add the PriceValidator component to validate Oracle Keeper price data
   - ✅ Create TestTokenMinter component for testing token interactions
   - ✅ Implement comprehensive TestingPanel integrating price validation and token minting
   - ✅ Add `/worldchain/testing` route for accessing testing tools
   - Update environment variables with real contract addresses
   - Test production mode with live Oracle Keeper price data
   - Conduct end-to-end testing including token swaps and positions
   - Deploy production build to hosting provider
   - Create automated monitoring for price feed integration

## Testing Tools Access

A comprehensive testing panel has been implemented to aid development and testing:

1. **Access Testing Panel**: Navigate to `/worldchain/testing` in the interface
2. **Features Available**:
   - Price validation tool - Displays price data and source information
   - Test token minter - Allows minting test tokens for development

## Conclusion

This guide serves as a living document for tracking the World Chain GMX MVP readiness with our source-agnostic price feed strategy using CoinGecko. Update it as milestones are completed to maintain a central source of truth across all repositories.

Last Updated: May 12, 2025
