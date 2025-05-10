// Mock Oracle Keeper for development and testing
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const SUPPORTED_TOKENS = (process.env.SUPPORTED_TOKENS || 'WLD,ETH,BTC').split(',');

// Generate realistic price data
function generatePrices() {
  const prices = {};
  
  // Use realistic base prices
  const basePrices = {
    'WLD': 1.25,  // Example WLD price
    'ETH': 3450.75, // Example ETH price
    'BTC': 65430.50, // Example BTC price
    'MAG': 0.85    // Example MAG price for future integration
  };
  
  // Add slight random fluctuation to simulate real data
  SUPPORTED_TOKENS.forEach(symbol => {
    const basePrice = basePrices[symbol] || 1.0;
    const fluctuation = (Math.random() * 0.02) - 0.01; // +/- 1%
    prices[symbol] = +(basePrice * (1 + fluctuation)).toFixed(2);
  });
  
  return prices;
}

// Simulated price cache
let priceCache = {
  lastUpdated: Date.now(),
  prices: generatePrices(),
  status: 'success'
};

// Update price cache every 30 seconds
setInterval(() => {
  priceCache = {
    lastUpdated: Date.now(),
    prices: generatePrices(),
    status: 'success'
  };
  console.log(`[${new Date().toISOString()}] Updated mock prices:`, priceCache.prices);
}, 30000);

// Set up Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0 (MOCK)',
    timestamp: new Date().toISOString(),
    priceCache: {
      lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
      status: priceCache.status,
      tokenCount: Object.keys(priceCache.prices).length
    }
  });
});

// Prices endpoint
app.get('/prices', (req, res) => {
  res.json({
    prices: priceCache.prices,
    timestamp: new Date().toISOString(),
    lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
    mode: 'mock'
  });
});

// Price endpoint for a specific token
app.get('/price/:symbol', (req, res) => {
  const { symbol } = req.params;
  const normalizedSymbol = symbol.toUpperCase();
  
  if (!SUPPORTED_TOKENS.includes(normalizedSymbol)) {
    return res.status(404).json({
      error: `Token ${normalizedSymbol} not supported`,
      supportedTokens: SUPPORTED_TOKENS,
      timestamp: new Date().toISOString()
    });
  }
  
  const price = priceCache.prices[normalizedSymbol];
  
  res.json({
    symbol: normalizedSymbol,
    price,
    timestamp: new Date().toISOString(),
    lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
    mode: 'mock'
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Mock Oracle Keeper running at http://${HOST}:${PORT}`);
  console.log(`Supported tokens: ${SUPPORTED_TOKENS.join(', ')}`);
  console.log(`Initial prices:`, priceCache.prices);
});
