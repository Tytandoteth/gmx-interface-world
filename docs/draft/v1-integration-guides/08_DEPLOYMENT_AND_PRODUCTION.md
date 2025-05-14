# Deployment and Production

This guide covers the deployment and production setup for the GMX interface on World Chain.

## Contract Addresses

Key contract addresses on World Chain:

```typescript
const PRODUCTION_ADDRESSES = {
  Vault: '0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5',
  Router: '0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b',
  VaultPriceFeed: '0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf',
  PositionRouter: '0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF',
  PositionManager: '0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D'
};
```

## Oracle Keeper Deployment

If you're using the optional Oracle Keeper for UI price display:

### 1. Configure Production Settings

Update the Oracle Keeper configuration:

```typescript
// config/production.ts
export const config = {
  priceUpdateInterval: 30000, // 30 seconds
  cacheExpiry: 60000, // 1 minute
  tokens: {
    WLD: {
      address: '0x163f8C2467924be0ae7B5347228CABF260318753',
      decimals: 18
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18
    },
    MAG: {
      address: '0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1',
      decimals: 18
    }
  }
};
```

### 2. Deploy to Cloudflare Workers

```bash
# Build and deploy Oracle Keeper
cd oracle-keeper
npm run build
wrangler publish
```

### 3. Configure Monitoring

Set up Cloudflare Workers monitoring:

```javascript
// monitor.js
addEventListener('scheduled', event => {
  event.waitUntil(
    fetch('your-keeper-url/health')
      .then(response => {
        if (!response.ok) {
          // Alert via configured channels
        }
      })
  );
});
```

## Frontend Deployment

### 1. Configure Production Build

Update vite.config.ts:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      external: ['@ethersproject/providers'],
    },
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.VITE_APP_WORLD_CHAIN_URL': JSON.stringify(process.env.VITE_APP_WORLD_CHAIN_URL),
    'process.env.VITE_APP_ORACLE_KEEPER_URL': JSON.stringify(process.env.VITE_APP_ORACLE_KEEPER_URL),
  }
});
```

### 2. Build and Deploy

```bash
# Build production bundle
npm run build

# Deploy to hosting service (e.g., Netlify)
netlify deploy --prod
```

## Post-Deployment Verification

### 1. Contract Verification

```typescript
// scripts/verify-deployment.ts
import { ethers } from 'ethers';
import { PRODUCTION_ADDRESSES } from './addresses';

async function verifyDeployment() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.VITE_APP_WORLD_CHAIN_URL);
  
  // Verify Vault
  const vault = new ethers.Contract(PRODUCTION_ADDRESSES.Vault, VAULT_ABI, provider);
  const isInitialized = await vault.isInitialized();
  console.log('Vault initialized:', isInitialized);
  
  // Verify VaultPriceFeed
  const priceFeed = new ethers.Contract(PRODUCTION_ADDRESSES.VaultPriceFeed, VAULT_PRICE_FEED_ABI, provider);
  const wldPrice = await priceFeed.getPrice(WLD_ADDRESS);
  console.log('WLD price feed working:', wldPrice.gt(0));
  
  // Additional verifications...
}

verifyDeployment();
```

### 2. Oracle Keeper Verification (if used)

```bash
# Test price feed endpoints
curl -X GET https://oracle-keeper.kevin8396.workers.dev/prices
curl -X GET https://oracle-keeper.kevin8396.workers.dev/health
```

### 3. Frontend Verification

Checklist:
- [ ] All contract interactions working
- [ ] Price feeds updating in real-time
- [ ] Trading functions operational
- [ ] Position management working
- [ ] Error handling properly configured

## Monitoring and Maintenance

### 1. Set up Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

### 2. Configure Alerts

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://127.0.0.1:5001/'
    send_resolved: true
```

### 3. Maintenance Schedule

Daily:
- Check health endpoints
- Review error logs

Weekly:
- Analyze trading volumes
- Review position statistics
- Check contract state

Monthly:
- Security audit review
- Performance optimization
- Dependency updates

## Production Timeline

Current timeline for full production deployment:

1. Oracle Keeper real-time data: ✅ Completed May 11, 2025
2. Interface RPC & price integration: 🔄 Due May 12, 2025
3. Contracts price feeds & token whitelisting: 📅 Due May 13, 2025
4. Full end-to-end testing: 📅 Due May 14, 2025
5. Production MVP launch: 🎯 Target May 15, 2025

## Emergency Procedures

### 1. Circuit Breaker Activation

If critical issues are detected:

```typescript
// Emergency pause function
async function activateCircuitBreaker() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  
  // Pause trading
  await vault.setPaused(true);
  console.log('Circuit breaker activated, trading paused');
}
```

### 2. Incident Response

1. Identify the issue
2. Activate circuit breaker if necessary
3. Communicate with users
4. Fix the issue
5. Test the fix
6. Deploy the fix
7. Resume operations

### 3. Recovery Procedures

After resolving an incident:

```typescript
// Resume operations
async function deactivateCircuitBreaker() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  
  // Resume trading
  await vault.setPaused(false);
  console.log('Circuit breaker deactivated, trading resumed');
}
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Contracts deployed and verified
- [ ] Oracle Keeper deployed (if used)
- [ ] Frontend built and deployed
- [ ] Monitoring set up
- [ ] Emergency procedures tested
- [ ] Documentation updated
- [ ] Team trained on incident response
