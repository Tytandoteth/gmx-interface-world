# World Chain GMX V1 Setup Guide

This guide provides a concise, step-by-step process for adding World Chain (chainId 480) support to the GMX interface repo, using the custom v1 contracts and optional price feed.

## 🛠️ Objective

Add full World Chain (chainId 480) support to the GMX interface repo, using the custom v1 contracts. Pricing can either be read directly from VaultPriceFeed or (optionally) fetched via a REST endpoint for UI-only display.

## 📦 Assets

1. Interface repo: https://github.com/gmx-io/gmx-interface.git
2. ABIs archive: world_abis.zip (contains Vault.json, Router.json, etc.)
3. Contract deployment JSON: .world-deployment.json (all addresses)
4. (Optional) Price REST endpoint: https://oracle-keeper.kevin8396.workers.dev/latest?chainId=480

## 🗒️ Steps

### 0. Prerequisites

- Node ≥ 20 LTS, Yarn/pnpm latest, solc 0.8.19
- MetaMask or other wallet that can add custom network

### 1. Prepare ABIs

```bash
unzip world_abis.zip
mkdir -p gmx-interface/src/abis/world
cp ./world_abis/*.json gmx-interface/src/abis/world/
```

### 2. Clone & Install Interface

```bash
git clone https://github.com/gmx-io/gmx-interface.git
cd gmx-interface
yarn
```

### 3. Environment Configuration

Create a `.env.local` file with:

```env
# World Chain settings
NEXT_PUBLIC_WORLD_CHAIN_ID=480
NEXT_PUBLIC_WORLD_RPC_URL=https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/
NEXT_PUBLIC_WORLD_EXPLORER=https://worldchain.explorer

# v1 contract addresses (from .world-deployment.json)
NEXT_PUBLIC_WORLD_VAULT=0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5
NEXT_PUBLIC_WORLD_ROUTER=0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b
NEXT_PUBLIC_WORLD_POSITION_ROUTER=0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF
NEXT_PUBLIC_WORLD_VAULT_PRICE_FEED=0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf
# Add every other contract your UI touches

# (Optional UI feed)
# NEXT_PUBLIC_WORLD_PRICE_ENDPOINT=https://oracle-keeper.kevin8396.workers.dev/latest?chainId=480
```

### 4. Chain Configuration

Update `src/config/chains.ts`:

```typescript
export const WORLD: Chain = {
  id: 480,
  name: "World Chain",
  shortName: "WORLD",
  nativeToken: "ETH",
  rpcUrls: [process.env.NEXT_PUBLIC_WORLD_RPC_URL!],
  explorer: process.env.NEXT_PUBLIC_WORLD_EXPLORER!,
  color: "#1b73e8",
  averageBlockTime: 2
};
export const SUPPORTED_CHAINS = [ARBITRUM, AVALANCHE, WORLD];
```

### 5. Contract Configuration

Update `src/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES: Record<number, Addresses> = {
  ...otherChains,
  [480]: {
    Vault: process.env.NEXT_PUBLIC_WORLD_VAULT!,
    Router: process.env.NEXT_PUBLIC_WORLD_ROUTER!,
    PositionRouter: process.env.NEXT_PUBLIC_WORLD_POSITION_ROUTER!,
    VaultPriceFeed: process.env.NEXT_PUBLIC_WORLD_VAULT_PRICE_FEED!,
    // add every extra contract here
  }
};
```

### 6. Wallet Integration

Update your wallet configuration:

```typescript
// wherever configureChains / RainbowKit is initialized
import { WORLD } from "config/chains";
const chains = [ARBITRUM, AVALANCHE, WORLD];
```

### 7. (Optional) UI-only Price Hook

Create a hook for UI-only price display:

```typescript
// src/lib/world/usePrices.ts
import useSWR from "swr";
const fetcher = (u:string)=>fetch(u).then(r=>r.json());
export const useWorldPrices = () => useSWR(
  process.env.NEXT_PUBLIC_WORLD_PRICE_ENDPOINT, fetcher,
  { refreshInterval: 10_000 }
);

// use in components as: const { data: prices } = useWorldPrices();
```

### 8. Hide V2 Pages on World Chain

Add navigation guard:

```typescript
if (chainId === 480 && location.pathname.startsWith("/v2")) {
  return <Navigate to="/trade" replace />;
}
```

### 9. Test

```bash
yarn dev
# switch MetaMask to World Chain (480)
# verify prices, balances, trades work
```

### 10. Deploy

```bash
# add all NEXT_PUBLIC_WORLD_* vars to Vercel / Netlify
yarn build && yarn start
```

## 📝 Notes

- This integration uses only v1 contracts - v2 pages should be hidden on World Chain
- Prices can be read directly from VaultPriceFeed contract or (optionally) from a REST endpoint for UI-only display
- No external SDKs or wrappers are required - direct contract calls work fine
