# GMX RedStone Oracle Keeper

This service provides a simple REST API for accessing RedStone price feeds, making it easier to integrate with the GMX interface for World Chain.

## Features

- **API Endpoints**: Simple REST endpoints for accessing price data
- **Caching**: Configurable caching to minimize blockchain calls
- **Error Handling**: Robust error handling with detailed logging
- **Health Monitoring**: Health check endpoint for service monitoring

## Getting Started

### Prerequisites

- Node.js v18+
- Access to a World Chain RPC endpoint

### Installation

1. Clone this repository
2. Install dependencies:

```bash
cd oracle-keeper
npm install
```

3. Create an environment file:

```bash
cp .env.example .env
```

4. Update the `.env` file with your specific configuration

### Running the Service

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

## API Endpoints

### GET /health
Returns the health status of the Oracle Keeper service.

**Response**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-05-11T00:00:00.000Z",
  "priceCache": {
    "lastUpdated": "2025-05-11T00:00:00.000Z",
    "status": "success",
    "tokenCount": 3
  }
}
```

### GET /prices
Returns prices for all supported tokens.

**Response**:
```json
{
  "prices": {
    "WLD": 1.23,
    "ETH": 3456.78,
    "BTC": 65432.10
  },
  "timestamp": "2025-05-11T00:00:00.000Z",
  "lastUpdated": "2025-05-11T00:00:00.000Z"
}
```

### GET /price/:symbol
Returns the price for a specific token.

**Example**: `GET /price/WLD`

**Response**:
```json
{
  "symbol": "WLD",
  "price": 1.23,
  "timestamp": "2025-05-11T00:00:00.000Z",
  "lastUpdated": "2025-05-11T00:00:00.000Z"
}
```

## Integration with GMX Interface

To integrate this Oracle Keeper with the GMX interface for World Chain:

1. Start the Oracle Keeper service
2. Update the GMX interface environment to include the Oracle Keeper URL:

```
VITE_APP_ORACLE_KEEPER_URL=http://localhost:3001
```

3. Update the price fetching logic in the RedstoneTest component to use the Oracle Keeper API

## Deployment

For production deployment, consider:

1. Using Docker for containerization
2. Setting up a process manager like PM2
3. Configuring HTTPS with a reverse proxy like Nginx
4. Implementing proper monitoring and alerting

## Adding Support for Additional Tokens

To add support for additional tokens (like MAG):

1. Update the `SUPPORTED_TOKENS` in the `.env` file
2. Ensure the RedStonePriceFeed contract supports the new token
3. Update the VaultPriceFeed to use the RedStonePriceFeed for the new token
