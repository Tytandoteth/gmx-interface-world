# Production MVP Readiness Guide

**File Path:** `/Users/tyblackard/Documents/Windsurf/gmx-interface-world/docs/MVP_PRODUCTION_READINESS_UPDATED.md`
**Last Updated:** May 13, 2025 (Updated for Direct Price Feed Integration)

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
12. Communication & Reporting
13. Definition of Done
14. Contact Information

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
* Integration with direct price feeds.
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

**Status:** ⚠️ Deployment Phase (30%)

- ✅ Core contracts adapted for World Chain
- ✅ Local testing framework working
- ✅ SimplePriceFeed contract implementation
- ⚠️ Not yet deployed to World Chain mainnet
- ⚠️ Tokens (WLD, WETH, MAG) not whitelisted in Vault

**Next Steps:**

1. **Configure SimplePriceFeed contract** with appropriate token addresses and decimals
2. **Deploy contracts to mainnet** with proper configuration
3. **Whitelist tokens in Vault** (WLD, WETH, MAG)
4. **Verify contract deployments** on explorer

### Frontend Interface

**Status:** 🟡 Integration Progress (85%)

- ✅ Oracle Keeper client with direct prices support
- ✅ Enhanced direct price feed integration
- ✅ Contract ABI integration and utilities
- ✅ Most UI components and pages implemented
- ✅ Production/development toggle mechanism
- ⚠️ Missing connection to real contract addresses
- ⚠️ Final end-to-end flow testing needed

**Next Steps:**

1. **Complete contract integrations** for all trading components
2. **Update `.env.production`** with deployed contract addresses & Oracle Keeper URL
   ```
   VITE_WORLD_RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
   VITE_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
   VITE_VAULT_ADDRESS=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
   VITE_ROUTER_ADDRESS=0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
   VITE_POSITION_ROUTER_ADDRESS=0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
   VITE_POSITION_MANAGER_ADDRESS=0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D
   VITE_USE_PRODUCTION_MODE=true
   ```
3. **Build and deploy** the interface to production
4. **Implement log collection** for monitoring and troubleshooting

---

## 4. Integration Points

![Architecture Diagram](https://mermaid-js.github.io/mermaid-live-editor/#/edit/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0dNWCBJbnRlcmZhY2VdIC0tPnxEaXJlY3QgUHJpY2UgRmVlZHN8IEJbT3JhY2xlIEtlZXBlcl1cbiAgICBCIC0tPnxQcmljZSBEYXRhfCBDW0dNWCBDb250cmFjdHNdXG4gICAgQSAtLT58RXRoZXJzLmpzIENhbGxzfCBDXG4gICAgQiAtLT58Q29pbkdlY2tvIEFQSXwgRFtQcmljZSBTb3VyY2VzXVxuICAgIEMgLS0-fE9uLWNoYWluIEludGVyYWN0aW9uc3wgRVtXb3JsZCBDaGFpbl0iLCJtZXJtYWlkIjp7InRoZW1lIjoiZGVmYXVsdCJ9fQ)

### Core Integration Flows

1. **Price Data Flow**
   - CoinGecko API → Oracle Keeper → GMX Interface & Contracts
   - MockData fallback if API unavailable

2. **Trading Flow**
   - User → GMX Interface → Smart Contracts → World Chain
   - Price validation using Oracle Keeper data

3. **Monitoring Flow**
   - Health checks across all systems
   - Critical alerts & notifications
   - Centralized logging

---

## 5. Production Readiness Checklist

### Oracle Keeper

- [ ] Production environment variables configured
- [ ] Error handling and fallbacks implemented
- [ ] Rate limiting for CoinGecko API 
- [ ] Monitoring and alerting
- [ ] KV cache optimization
- [ ] Load testing complete

### Smart Contracts

- [ ] All contracts deployed to mainnet
- [ ] Token whitelisting complete
- [ ] Appropriate admin controls configured
- [ ] Verified on block explorer
- [ ] Emergency shutdown tested
- [ ] Audit recommendations addressed

### Frontend Interface

- [ ] Environment variables set for production
- [ ] Connected to production contracts
- [ ] Performance optimized
- [ ] Logging configured
- [ ] Error boundaries implemented
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility tested

---

## 6. Testing Protocol

### Unit Tests

- Each contract function tested independently
- Core UI component tests
- Oracle Keeper API endpoint tests

### Integration Tests

- End-to-end trade execution
- Oracle price feed validation
- Contract interaction verification

### User Testing

- Complete trade lifecycle
- UI/UX validation
- Error scenario testing

---

## 7. Deployment Quick Reference

### Oracle Keeper

```sh
# Deploy Oracle Keeper to Cloudflare
cd oracle-keeper
npm ci
wrangler publish
```

### Smart Contracts

```sh
# Deploy contracts to World Chain
cd gmx-contracts-world
npx hardhat run --network worldchain scripts/deploy.js
```

### Frontend Interface

```sh
# Build and deploy frontend
cd gmx-interface-world
pnpm install
pnpm build
# Upload to hosting provider
```

---

## 8. Environment Variables Reference

### Oracle Keeper (.env)

```
USE_MOCK_PRICES=false
COINGECKO_API_KEY=<api_key>
RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
CHAIN_ID=480
SUPPORTED_TOKENS=WLD,WETH,MAG
PORT=3000
```

### Frontend Interface (.env.production)

```
VITE_WORLD_RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
VITE_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
VITE_VAULT_ADDRESS=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
VITE_ROUTER_ADDRESS=0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
VITE_POSITION_ROUTER_ADDRESS=0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
VITE_POSITION_MANAGER_ADDRESS=0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D
VITE_USE_PRODUCTION_MODE=true
```

---

## 9. Troubleshooting Guide

### Oracle Keeper Issues

- **Problem**: Stale prices
  - **Solution**: Check CoinGecko API status, verify cache settings

- **Problem**: 429 Too Many Requests 
  - **Solution**: Implement rate limiting, check API key validity

### Smart Contract Issues

- **Problem**: Failed transactions
  - **Solution**: Verify gas settings, token approvals, slippage settings

- **Problem**: Price feed discrepancies
  - **Solution**: Compare Oracle Keeper values with on-chain data

### Frontend Issues

- **Problem**: UI not displaying prices
  - **Solution**: Check Oracle Keeper connectivity, verify API responses

- **Problem**: Transactions not sending
  - **Solution**: Verify wallet connection, RPC status, account balance

---

## 10. Monitoring & Alerting

### Critical Alerts

- Oracle Keeper unavailability
- Price feed staleness (>5 minutes)
- Contract interaction failures
- Significant price deviation

### Key Metrics

- API response times
- Error rates
- Transaction success rate
- Price update frequency

---

## 11. Action Items & Ownership

| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| Deploy smart contracts | Alice | May 13, 2025 | 🟡 In Progress |
| Update Oracle Keeper caching | Bob | May 13, 2025 | 🟡 In Progress |
| Complete UI contract integration | Charlie | May 14, 2025 | 🟡 In Progress |
| Implement monitoring | Dave | May 14, 2025 | ⚪ Not Started |
| Production deployment | Team | May 15, 2025 | ⚪ Not Started |

---

## 12. Additional Handoff Details

### Admin Responsibilities

- Monitoring Oracle Keeper health
- Managing token whitelists
- Emergency shutdown procedures

### Regular Maintenance

- API key rotation
- Performance optimization
- Security patches

---

## 13. Communication & Reporting

- Daily standup updates on Slack (#world-chain-project)
- Issue tracking in JIRA
- Incident reports for any production issues

---

## 14. Definition of Done

The Production MVP is considered "Done" when:

1. All three repositories are deployed to production
2. End-to-end trading flow works with real contracts
3. All tokens (WLD, WETH, MAG) can be traded
4. Price feeds are reliable and accurate
5. Monitoring is in place
6. Documentation is complete

---

## 15. Debug & Developer Tools

### Production Mode Toggle

The toggle at the bottom right of the UI lets you switch between modes:

- **Development Mode**: Uses mock data and simulated contracts
- **Production Mode**: Connects to real contracts and Oracle Keeper

### Debug Pages

Access the debug UI at:
- Oracle Debug: `/oracle-debug`
- Trading Debug: `/trading-debug`
- Price Feed Debug: `/price-debug`

### Testing Utilities

Each repository includes testing utilities:
1. **Oracle Keeper**: `/test-endpoint` checks all data providers
2. **Smart Contracts**: Hardhat scripts for contract interaction
3. **Frontend**: Developer tools panel in UI

---

## Current Implementation Status

1. **Oracle Keeper:**
   - ✅ CoinGecko API integration complete  
   - ✅ Direct price feeds available via `/direct-prices` endpoint
   - ✅ Health check endpoints implemented
   - ✅ Fallback mechanisms for reliability

2. **Frontend Interface:**
   - ✅ Oracle Keeper client integration
   - ✅ UI components for price display
   - ✅ Contract ABIs configured
   - ✅ Mode toggling (dev/production)
   - ⏳ Connection to production contract addresses

3. **Smart Contracts:**
   - ✅ Core contracts configured for World Chain
   - ✅ SimplePriceFeed contract implementation 
   - ⏳ Deployment to World Chain mainnet
   - ⏳ Token whitelisting in Vault

---

## Verification Checklist

- [x] Oracle Keeper `/direct-prices` returns live values
- [ ] Interface connects to World Chain RPC and displays live prices
- [ ] Contracts consume live oracle data for swaps and positions
- [ ] All supported tokens (WLD, WETH, MAG) trade successfully
- [ ] Limit orders and liquidations execute correctly at real-time prices
