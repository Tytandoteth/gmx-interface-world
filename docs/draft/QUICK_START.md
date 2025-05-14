# GMX on World Chain: Quick Start Guide

This guide provides the fastest way to get the GMX interface up and running with World Chain support.

## 30-Second Setup

### 1. Clone & Install

```bash
git clone https://github.com/Tytandoteth/gmx-interface-world.git
cd gmx-interface-world
npm install
# or
yarn
```

### 2. Configure Environment

Create a `.env.local` file:

```env
# World Chain RPC URL
VITE_APP_WORLD_CHAIN_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/

# Development mode
VITE_APP_USE_PRODUCTION_MODE=false
VITE_APP_USE_TEST_TOKENS=true

# Oracle Keeper for price display
VITE_APP_ORACLE_KEEPER_URL=https://oracle-keeper.kevin8396.workers.dev
```

### 3. Start Development Server

```bash
npm run dev
# or
yarn dev
```

### 4. Connect to World Chain

- Open http://localhost:5173 in your browser
- Connect your wallet
- Switch to World Chain (ID: 480)
- Use the development tools at `/worldchain/dev-tools` for testing

## Next Steps

- For production deployment, see [Production Setup Guide](../PRODUCTION_SETUP.md)
- For detailed integration steps, see [World Chain V1 Setup](./WORLDCHAIN_V1_SETUP.md)
- For environment variable reference, see [Environment Variables](./ENVIRONMENT_VARIABLES.md)
