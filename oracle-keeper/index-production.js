// Production-ready Oracle Keeper service with enhanced monitoring
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { WrapperBuilder } from '@redstone-finance/evm-connector';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'oracle-keeper.log')
    })
  ]
});

// Configuration
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';
const RPC_URL = process.env.RPC_URL || 'https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '1337');
const REDSTONE_PRICE_FEED_ADDRESS = process.env.REDSTONE_PRICE_FEED_ADDRESS || '0x345bc48E1370fa399D0A6611669726aAC676DBB3';
const SUPPORTED_TOKENS = (process.env.SUPPORTED_TOKENS || 'WLD,ETH,BTC').split(',');
const PRICE_CACHE_DURATION_MS = parseInt(process.env.PRICE_CACHE_DURATION_MS || '30000');

// Server metrics
const metrics = {
  requestCount: 0,
  errorCount: 0,
  lastError: null,
  priceUpdates: 0,
  uptime: Date.now(),
  lastPriceUpdate: 0
};

// RedStonePriceFeed ABI
const REDSTONE_PRICE_FEED_ABI = [
  "function getLatestPrice(string memory symbol) public view returns (uint256)",
  "function getLatestPrices(string[] memory symbols) public view returns (uint256[] memory)",
  "function getTokenDecimals(string memory symbol) public view returns (uint8)",
  "function getUniqueSignersThreshold() public view returns (uint8)",
  "function getSupportedTokens() public pure returns (string[] memory)"
];

// Price cache
let priceCache = {
  lastUpdated: 0,
  prices: {},
  status: 'uninitialized'
};

// Initialize ethers provider
let provider;
let redStonePriceFeed;
let wrappedContract;

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  metrics.requestCount++;
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    
    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }
  });
  
  next();
});

// Initialize connection to the blockchain
async function initializeBlockchainConnection() {
  try {
    logger.info('Initializing blockchain connection...');
    logger.info(`Using RPC URL: ${RPC_URL}`);
    logger.info(`Using RedStonePriceFeed address: ${REDSTONE_PRICE_FEED_ADDRESS}`);
    
    // Create provider
    provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get network info
    const network = await provider.getNetwork();
    logger.info(`Connected to network: chainId ${network.chainId}`);
    
    // Create contract instance
    redStonePriceFeed = new ethers.Contract(
      REDSTONE_PRICE_FEED_ADDRESS,
      REDSTONE_PRICE_FEED_ABI,
      provider
    );
    
    // Create wrapped contract
    wrappedContract = WrapperBuilder
      .wrapLite(redStonePriceFeed)
      .usingDataService({
        dataServiceId: "redstone-main-demo",
        uniqueSignersCount: 1,
        dataFeeds: SUPPORTED_TOKENS
      });
      
    logger.info('Blockchain connection initialized successfully');
    
    // Test the connection with a call to getSupportedTokens
    try {
      const supportedTokens = await redStonePriceFeed.getSupportedTokens();
      logger.info(`Contract supports tokens: ${supportedTokens.join(', ')}`);
    } catch (error) {
      logger.warn(`Failed to get supported tokens: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to initialize blockchain connection: ${error.message}`);
    metrics.lastError = {
      timestamp: Date.now(),
      message: error.message,
      context: 'blockchain_connection'
    };
    return false;
  }
}

// Fetch prices from RedStone
async function fetchPrices() {
  try {
    logger.debug('Fetching prices from RedStone...');
    
    // Create fresh prices object
    const prices = {};
    const errors = {};
    
    // Fetch prices for all supported tokens
    for (const symbol of SUPPORTED_TOKENS) {
      try {
        const price = await wrappedContract.getLatestPrice(symbol);
        // Convert to decimal (assuming 8 decimals for price feeds)
        prices[symbol] = parseFloat(ethers.formatUnits(price, 8));
        logger.debug(`Fetched ${symbol} price: ${prices[symbol]}`);
      } catch (error) {
        logger.error(`Failed to fetch ${symbol} price: ${error.message}`);
        errors[symbol] = error.message;
        metrics.lastError = {
          timestamp: Date.now(),
          message: error.message,
          context: `price_fetch_${symbol}`
        };
      }
    }
    
    // Update cache
    priceCache = {
      lastUpdated: Date.now(),
      prices,
      errors,
      status: Object.keys(prices).length > 0 ? 'success' : 'error'
    };
    
    metrics.lastPriceUpdate = Date.now();
    metrics.priceUpdates++;
    
    logger.info(`Prices updated: ${JSON.stringify(prices)}`);
    return prices;
  } catch (error) {
    logger.error(`Failed to fetch prices: ${error.message}`);
    
    priceCache.status = 'error';
    priceCache.error = error.message;
    
    metrics.lastError = {
      timestamp: Date.now(),
      message: error.message,
      context: 'price_fetch_batch'
    };
    
    return null;
  }
}

// Fetch prices with caching
async function getPricesWithCache() {
  // If cache is fresh, return it
  if (Date.now() - priceCache.lastUpdated < PRICE_CACHE_DURATION_MS && priceCache.status === 'success') {
    logger.debug('Returning cached prices');
    return priceCache.prices;
  }
  
  // Otherwise, fetch fresh prices
  return await fetchPrices();
}

// Fallback to mock data if real data is unavailable
function getMockPrices() {
  logger.warn('Using mock price data as fallback');
  
  const mockPrices = {
    'WLD': 1.25 + (Math.random() * 0.1 - 0.05),  // WLD price with small variation
    'ETH': 3450.75 + (Math.random() * 100 - 50), // ETH price with variation
    'BTC': 65430.50 + (Math.random() * 500 - 250) // BTC price with variation
  };
  
  // Only include supported tokens
  const filteredPrices = {};
  SUPPORTED_TOKENS.forEach(symbol => {
    if (mockPrices[symbol]) {
      filteredPrices[symbol] = +mockPrices[symbol].toFixed(2);
    }
  });
  
  return filteredPrices;
}

// Initialize server
async function initializeServer() {
  // Initialize blockchain connection
  const initialized = await initializeBlockchainConnection();
  
  if (!initialized) {
    logger.warn('Failed to initialize blockchain connection. Starting in fallback mode.');
    // Continue with fallback mode rather than exiting
    priceCache = {
      lastUpdated: Date.now(),
      prices: getMockPrices(),
      status: 'fallback',
      error: 'Using mock data due to blockchain connection failure'
    };
  } else {
    // Initial price fetch
    await fetchPrices();
  }
  
  // Set up price refresh interval
  setInterval(async () => {
    try {
      if (initialized) {
        await fetchPrices();
      } else {
        // Try to reconnect if in fallback mode
        const reconnected = await initializeBlockchainConnection();
        if (reconnected) {
          logger.info('Successfully reconnected to blockchain');
          await fetchPrices();
        } else {
          // Continue with mock data
          priceCache = {
            lastUpdated: Date.now(),
            prices: getMockPrices(),
            status: 'fallback',
            error: 'Using mock data due to blockchain connection failure'
          };
          metrics.lastPriceUpdate = Date.now();
        }
      }
    } catch (error) {
      logger.error(`Error in price refresh interval: ${error.message}`);
    }
  }, PRICE_CACHE_DURATION_MS);
  
  // Start the server
  app.listen(PORT, HOST, () => {
    logger.info(`Oracle Keeper service running at http://${HOST}:${PORT}`);
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: priceCache.status === 'error' ? 'degraded' : 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - metrics.uptime) / 1000),
    priceCache: {
      lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
      status: priceCache.status,
      tokenCount: Object.keys(priceCache.prices).length
    }
  });
});

// Monitoring endpoint
app.get('/metrics', (req, res) => {
  const currentMetrics = {
    ...metrics,
    uptime: Math.floor((Date.now() - metrics.uptime) / 1000),
    lastPriceUpdateSeconds: metrics.lastPriceUpdate ? Math.floor((Date.now() - metrics.lastPriceUpdate) / 1000) : null,
    cacheStatus: priceCache.status,
    cacheAge: Math.floor((Date.now() - priceCache.lastUpdated) / 1000),
    supportedTokens: SUPPORTED_TOKENS,
    priceCount: Object.keys(priceCache.prices).length
  };
  
  res.json(currentMetrics);
});

// Prices endpoint
app.get('/prices', async (req, res) => {
  try {
    const prices = await getPricesWithCache();
    res.json({
      prices,
      timestamp: new Date().toISOString(),
      lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
      status: priceCache.status
    });
  } catch (error) {
    logger.error(`Error in /prices endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'error',
      fallback: priceCache.status === 'fallback' ? getMockPrices() : null
    });
  }
});

// Price endpoint for a specific token
app.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const normalizedSymbol = symbol.toUpperCase();
    
    // Check if token is supported
    if (!SUPPORTED_TOKENS.includes(normalizedSymbol)) {
      return res.status(404).json({
        error: `Token ${normalizedSymbol} not supported`,
        supportedTokens: SUPPORTED_TOKENS,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get prices
    const prices = await getPricesWithCache();
    
    if (!prices || !prices[normalizedSymbol]) {
      // Try fallback if main source fails
      if (priceCache.status === 'fallback') {
        const mockPrices = getMockPrices();
        if (mockPrices[normalizedSymbol]) {
          return res.json({
            symbol: normalizedSymbol,
            price: mockPrices[normalizedSymbol],
            timestamp: new Date().toISOString(),
            lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
            status: 'fallback'
          });
        }
      }
      
      return res.status(404).json({
        error: `Price for ${normalizedSymbol} not available`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      symbol: normalizedSymbol,
      price: prices[normalizedSymbol],
      timestamp: new Date().toISOString(),
      lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
      status: priceCache.status
    });
  } catch (error) {
    logger.error(`Error in /price/:symbol endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint (only available in non-production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV || 'development',
      config: {
        port: PORT,
        host: HOST,
        rpcUrl: RPC_URL,
        chainId: CHAIN_ID,
        redStonePriceFeedAddress: REDSTONE_PRICE_FEED_ADDRESS,
        supportedTokens: SUPPORTED_TOKENS,
        priceCacheDurationMs: PRICE_CACHE_DURATION_MS
      },
      cache: priceCache,
      metrics
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  metrics.lastError = {
    timestamp: Date.now(),
    message: error.message,
    context: 'uncaught_exception'
  };
});

// Start server
initializeServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
