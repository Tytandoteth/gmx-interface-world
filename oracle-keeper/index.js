// Oracle Keeper service for GMX-RedStone integration
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { WrapperBuilder } from '@redstone-finance/evm-connector';
import winston from 'winston';

// Load environment variables
dotenv.config();

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
    new winston.transports.File({ filename: 'oracle-keeper.log' })
  ]
});

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const RPC_URL = process.env.RPC_URL || 'https://rpc.world.computer';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '1337');
const REDSTONE_PRICE_FEED_ADDRESS = process.env.REDSTONE_PRICE_FEED_ADDRESS || '0x345bc48E1370fa399D0A6611669726aAC676DBB3';
const SUPPORTED_TOKENS = (process.env.SUPPORTED_TOKENS || 'WLD,ETH,BTC').split(',');
const PRICE_CACHE_DURATION_MS = parseInt(process.env.PRICE_CACHE_DURATION_MS || '30000');

// RedStonePriceFeed ABI - only include the methods we need
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
      }
    }
    
    // Update cache
    priceCache = {
      lastUpdated: Date.now(),
      prices,
      errors,
      status: Object.keys(prices).length > 0 ? 'success' : 'error'
    };
    
    logger.info(`Prices updated: ${JSON.stringify(prices)}`);
    return prices;
  } catch (error) {
    logger.error(`Failed to fetch prices: ${error.message}`);
    
    priceCache.status = 'error';
    priceCache.error = error.message;
    
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

// Initialize server
async function initializeServer() {
  // Initialize blockchain connection
  const initialized = await initializeBlockchainConnection();
  
  if (!initialized) {
    logger.error('Failed to initialize server, exiting...');
    process.exit(1);
  }
  
  // Initial price fetch
  await fetchPrices();
  
  // Set up price refresh interval
  setInterval(fetchPrices, PRICE_CACHE_DURATION_MS);
  
  // Start the server
  app.listen(PORT, HOST, () => {
    logger.info(`Oracle Keeper service running at http://${HOST}:${PORT}`);
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    priceCache: {
      lastUpdated: new Date(priceCache.lastUpdated).toISOString(),
      status: priceCache.status,
      tokenCount: Object.keys(priceCache.prices).length
    }
  });
});

// Prices endpoint
app.get('/prices', async (req, res) => {
  try {
    const prices = await getPricesWithCache();
    res.json({
      prices,
      timestamp: new Date().toISOString(),
      lastUpdated: new Date(priceCache.lastUpdated).toISOString()
    });
  } catch (error) {
    logger.error(`Error in /prices endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
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
      return res.status(404).json({
        error: `Price for ${normalizedSymbol} not available`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      symbol: normalizedSymbol,
      price: prices[normalizedSymbol],
      timestamp: new Date().toISOString(),
      lastUpdated: new Date(priceCache.lastUpdated).toISOString()
    });
  } catch (error) {
    logger.error(`Error in /price/:symbol endpoint: ${error.message}`);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
initializeServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
