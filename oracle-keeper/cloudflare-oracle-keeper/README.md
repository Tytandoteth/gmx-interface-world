# RedStone Oracle Keeper - Cloudflare Workers Edition

A high-performance, globally distributed Oracle Keeper service that delivers RedStone price data through Cloudflare's edge network.

## Features

- **Edge Computing**: Deploy to 200+ locations worldwide for minimal latency
- **High Availability**: 99.99% uptime with Cloudflare's global infrastructure
- **Automatic Failover**: Uses mock data as fallback if blockchain access fails
- **Built-in Caching**: Prices cached at the edge for optimal performance
- **Comprehensive Monitoring**: Health checks and metrics endpoints
- **DDoS Protection**: Built-in protection from Cloudflare

## Architecture

The service consists of two main components:

1. **Scheduled Worker**: Runs every 30 seconds to fetch fresh price data from the blockchain
2. **API Endpoints**: Serve price data from the edge, with automatic failover

Price data is stored in Cloudflare KV, allowing all edge locations to access the latest prices.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account
- Cloudflare Workers subscription (starts with generous free tier)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Cloudflare account

Login to your Cloudflare account:

```bash
npx wrangler login
```

### 3. Create a KV namespace

```bash
npx wrangler kv:namespace create PRICE_CACHE
npx wrangler kv:namespace create PRICE_CACHE --preview
```

This will output namespace IDs. Copy these IDs and update `wrangler.toml`:

```toml
kv_namespaces = [
  { binding = "PRICE_CACHE", id = "YOUR_KV_NAMESPACE_ID", preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID" }
]
```

### 4. Update configuration

Edit `wrangler.toml` with your specific settings:

```toml
[vars]
RPC_URL = "YOUR_WORLD_CHAIN_RPC_URL"
CHAIN_ID = "1337"
REDSTONE_PRICE_FEED_ADDRESS = "YOUR_CONTRACT_ADDRESS"
SUPPORTED_TOKENS = "WLD,ETH,BTC"
PRICE_CACHE_DURATION_MS = "30000"
```

## Local Development

Run the service locally:

```bash
npm run dev
```

This starts a local server at http://localhost:3002 with the following endpoints:

- `/health` - Service health status
- `/metrics` - Service metrics
- `/prices` - All token prices
- `/price/:symbol` - Price for a specific token

## Deployment

### 1. Test the worker

Before deploying, run type checking:

```bash
npm run typecheck
```

### 2. Deploy to Cloudflare

```bash
npm run deploy
```

This will deploy your worker to Cloudflare's edge network and provide a *.workers.dev URL.

### 3. Set up a custom domain (optional)

In the Cloudflare dashboard:

1. Go to Workers & Pages
2. Select your worker
3. Click on "Triggers"
4. Add a Custom Domain
5. Follow the instructions to set up the domain

## Usage

### Endpoints

- `GET /health` - Check service health
- `GET /metrics` - Get service metrics
- `GET /prices` - Get all prices
- `GET /price/:symbol` - Get price for a specific token

### Example Response

```json
{
  "prices": {
    "WLD": 1.24,
    "ETH": 3421.75,
    "BTC": 65235.50
  },
  "timestamp": "2025-05-11T01:15:23.456Z",
  "lastUpdated": "2025-05-11T01:15:00.123Z",
  "status": "success"
}
```

## Monitoring and Maintenance

### Monitoring

- Use the `/health` endpoint to check service status
- Use the `/metrics` endpoint to monitor service performance
- Set up Cloudflare Analytics for detailed request metrics

### Logs

View logs in the Cloudflare Dashboard:

1. Go to Workers & Pages
2. Select your worker
3. Click on "Logs"

### Troubleshooting

Common issues:

1. **KV Access Issues**: Ensure KV namespace is correctly configured in wrangler.toml
2. **RPC Connectivity**: Check if your RPC endpoint is accessible and properly configured
3. **Worker Errors**: Check logs in the Cloudflare Dashboard

## Integration with GMX Interface

Update your GMX interface environment variables to use your Cloudflare Workers URL:

```
VITE_APP_ORACLE_KEEPER_URL=https://your-worker.your-subdomain.workers.dev
```

## Advanced Configuration

### Custom Security Rules

Add additional security with Cloudflare:

1. **Rate Limiting**: Set up rate limiting in the Cloudflare dashboard
2. **IP Access Rules**: Restrict access by IP for admin endpoints
3. **Firewall Rules**: Create firewall rules to block malicious traffic

### High Volume Setup

For high-traffic applications:

1. Increase Workers Unbound limits
2. Configure Workers for Platforms
3. Consider multiple deployment zones for redundancy

## Comparison with VM Deployment

| Feature | Cloudflare Workers | VM (e.g. Digital Ocean) |
|---------|-------------------|------------------------|
| Global Distribution | 200+ locations | 1 location (unless load balanced) |
| Startup Time | Instant | Minutes |
| Scaling | Automatic | Manual |
| Maintenance | None | Regular OS updates |
| Cost | Pay per request | Fixed monthly cost |
| DDoS Protection | Built-in | Additional setup required |
| Cold Starts | Sub-millisecond | None |
| Execution Limits | 30s max (paid plan) | None |

## Benefits for Oracle Keeper Service

The Oracle Keeper service is particularly well-suited for Cloudflare Workers because:

1. **Request Pattern**: Short, bursty requests with low CPU requirements
2. **Global Access**: Users from around the world need price data with minimal latency
3. **High Availability**: Price feeds must be reliable with no single point of failure
4. **Security**: Price data must be protected from manipulation and attacks

By deploying on Cloudflare's edge network, your Oracle Keeper becomes a globally distributed, highly available service with minimal operational overhead.
