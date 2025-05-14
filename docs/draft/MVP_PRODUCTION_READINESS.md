# Production MVP Readiness Guide

**Last Updated:** May 14, 2025

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
11. Definition of Done
12. Contact Information

---

## 1. Project Scope

* Deploy and maintain a GMX-derived perpetual trading platform on World Chain.
* Support trading pairs: WLD, WETH, MAG.
* Provide robust, source-agnostic oracle infrastructure using CoinGecko as the primary price source.
* Simplify the UI into a lightweight, performant mini-app.
* Ensure high reliability, security, and observable operations in production.

---

## 2. Repository Responsibilities

**A. Smart Contracts (`gmx-contracts-world`)**

* Core GMX components: Vault, Router, OrderBook, PositionRouter/Manager, Trackers.
* VaultPriceFeed contract for on-chain price data.
* Deployment & configuration scripts (Hardhat).

**B. Oracle Keeper (`oracle-keeper`)**

* Cloudflare Workers-based middleware providing `/prices`, `/direct-prices`, and `/health` endpoints.
* Live feeds for WLD/USD, WETH/USD, MAG/USD using CoinGecko with flexible architecture for future source changes.
* Source-agnostic implementation with clear price provider implementation.
* Diagnostic UI, health checks, retry logic.

**C. Frontend Interface (`gmx-interface-world`)**

* React/TypeScript trading UI consuming contracts and optional oracle service.
* OracleKeeperFetcher for optional UI price data retrieval.
* Direct contract calls for all transactions.
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

**Status: 🟡 Transition Phase (30%)**

- ✅ Contract modifications for World Chain completed
- ✅ Local testing successful
- ⚠️ Contracts not yet deployed to World Chain mainnet
- ⚠️ Tokens (WLD, WETH, MAG) not whitelisted in Vault

**Next Steps:**

1. **Configure VaultPriceFeed contract** with appropriate token addresses and decimals
2. **Deploy contracts to mainnet** with proper configuration
3. **Whitelist tokens in Vault** (WLD, WETH, MAG)
4. **Verify deployment**

   ```bash
   npx hardhat run scripts/world/verifyCompleteDeployment.js --network worldchain
   ```

### Frontend Interface

**Status: 🟡 Integration Progress (85%)**

- ✅ Oracle Keeper client with direct prices support
- ✅ Enhanced direct price feed integration
- ✅ Contract ABI integration and utilities
- ✅ Most UI components and pages implemented
- ✅ Development/production mode toggle
- ⚠️ Missing integration with real contract addresses

**Next Steps:**

1. **Install dependencies**

   ```bash
   npm install
   ```
2. **Update `.env.production`** with deployed addresses & Oracle Keeper URL
3. **Point to live endpoints** and disable mock mode
4. **End-to-end testing** (swaps, leveraged positions, orders)

---

## 4. Integration Points

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│  CoinGecko API      │────▶│  Oracle Keeper      │────▶│  GMX Interface      │
│  (Price Source)     │     │  Service (API)      │     │  (Frontend)         │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                                                │
                                                                ▼
                                                        ┌─────────────────────┐
                                                        │                     │
                                                        │  World Chain        │
                                                        │  GMX Contracts      │
                                                        │                     │
                                                        └─────────────────────┘
```

* **Oracle Keeper ↔ Frontend Interface:** Oracle Keeper provides optional UI-only price data via REST API endpoints.
* **Frontend Interface ↔ Contracts:** UI must import ABIs and address constants matching deployed on mainnet.
* **Frontend Interface ↔ Oracle:** fetch price data, reflect health/status, and surface fallback errors.

---

## 5. Production Readiness Checklist

* [ ] **Contract Deployment**: Mainnet deployment completed & verified.
* [ ] **Token Whitelisting**: WLD, WETH, MAG enabled in Vault.
* [ ] **Oracle Keeper**: Live feeds serving accurate prices; `/health` returns `isHealthy: true`.
* [ ] **Frontend**: Connected to World Chain, live price integration verified.
* [ ] **End-to-End Flow**: Swaps, long/short positions, limit orders, and liquidations work.
* [ ] **Security Reviews**: Contracts audited, key management in place.
* [ ] **Monitoring**: Metrics dashboards and alerts configured.
* [ ] **Documentation**: READMEs, ARCHITECTURE.md, TROUBLESHOOTING.md up to date.

---

## 6. Testing Protocol

### Oracle Keeper Tests

1. **Health Check**

   ```bash
   curl https://oracle-keeper.kevin8396.workers.dev/health
   ```
2. **Price Endpoint**

   ```bash
   curl https://oracle-keeper.kevin8396.workers.dev/direct-prices
   ```
3. **Source Verification**

   ```bash
   curl https://oracle-keeper.kevin8396.workers.dev/health | grep source
   ```

### Smart Contract Tests

* Unit tests for core contract functions.
* Integration tests for price feed calls.
* Hardhat for forked mainnet simulation.

### Frontend Tests

* Cypress/E2E: login, market load, trade flows.
* Jest/React Testing Library: critical components (Oracle status, TradeForm).
* Manual QA: responsive UI, error modals, fallback messaging.

---

## 7. Deployment Quick Reference

### Smart Contracts

```bash
npm install
npx hardhat run scripts/world/deployContracts.js --network worldchain
npx hardhat run scripts/world/whitelistTokens.js --network worldchain
```

### Oracle Keeper

```bash
npm install
# configure .env.production
npm run build
wrangler publish   # for Cloudflare
# or heroku deploy
```

### Frontend Interface

```bash
npm install
# set .env.production
npm run build
npm run deploy    # e.g., Netlify/Vercel CLI
```

---

## 8. Environment Variables Reference

### Oracle Keeper (`.env.production`)

```toml
USE_MOCK_PRICES=false
COINGECKO_API_KEY=<key>
RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/...
CHAIN_ID=480
SUPPORTED_TOKENS=WLD,WETH,MAG
PORT=3000
```

### Frontend Interface (`.env.production`)

```bash
VITE_APP_WORLD_CHAIN_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
VITE_APP_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
VITE_APP_WORLD_VAULT_ADDRESS=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
VITE_APP_WORLD_ROUTER_ADDRESS=0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
VITE_APP_WORLD_POSITION_ROUTER_ADDRESS=0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
VITE_APP_WORLD_POSITION_MANAGER_ADDRESS=0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D
VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS=0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf
VITE_APP_USE_PRODUCTION_MODE=true
```

---

## 9. Troubleshooting Guide

### Price Feed Failures

* **Symptoms**: Transactions revert with price error.
* **Checks**:

  1. Oracle Keeper health (should show `mode: live`).
  2. VaultPriceFeed contract has prices for all tokens.

### Whitelisting Errors

* **Symptoms**: Vault.setTokenConfig reverts.
* **Fix**: Ensure proper permissions; retry scripts.

### RPC Connection Issues

* **Symptoms**: UI cannot load markets.
* **Fix**: Validate `WORLD_RPC_URL`, chain ID = 480, CORS on RPC endpoint.

---

## 10. Monitoring & Alerting

* **Oracle Keeper**: Uptime, response latency, error rate (Datadog/Grafana).
* **Contracts**: Gas usage, failed txs (Tenderly).
* **UI**: Client error logs, performance traces (Sentry).
* **Alerts**: Slack notifications for critical thresholds.

---

## 11. Definition of Done

Each phase is complete when:

* All acceptance criteria met (unit/integration tests, docs updated).
* PRs reviewed & merged, deploy pipelines green.
* QA sign-off on functionality and performance.

---

## 12. Contact Information

* **Smart Contracts Repo**: [https://github.com/Tytandoteth/gmx-contracts-world](https://github.com/Tytandoteth/gmx-contracts-world)
* **Oracle Keeper Repo**: [https://github.com/Tytandoteth/oracle-keeper](https://github.com/Tytandoteth/oracle-keeper)
* **Frontend Repo**: [https://github.com/Tytandoteth/gmx-interface-world](https://github.com/Tytandoteth/gmx-interface-world)
* **Project Lead**: Ty B (`ty@siestamarkets.com`)

---

> *This guide is the single source of truth for achieving a production-ready MVP. Update it continuously as milestones are completed.*
