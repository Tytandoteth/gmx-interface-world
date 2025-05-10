// Test script for Oracle Keeper service
import dotenv from 'dotenv';
import { createRequire } from 'module';

// For environments that don't have fetch natively (Node.js < 18)
let fetchFunc;
if (typeof fetch === 'undefined') {
  try {
    const require = createRequire(import.meta.url);
    const nodeFetch = require('node-fetch');
    fetchFunc = nodeFetch.default || nodeFetch;
  } catch (error) {
    console.error('Failed to load node-fetch, please install it with: npm install node-fetch');
    process.exit(1);
  }
} else {
  fetchFunc = fetch;
}

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = `http://${HOST}:${PORT}`;

// Test tokens
const TEST_TOKENS = ['WLD', 'ETH', 'BTC'];

/**
 * Run the test suite
 */
async function runTests() {
  console.log('Testing Oracle Keeper Service');
  console.log('============================');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Test health endpoint
  try {
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetchFunc(`${BASE_URL}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`HTTP error ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('Health data:', healthData);
    
    if (healthData.status === 'ok') {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  // Test prices endpoint
  try {
    console.log('\n2. Testing prices endpoint...');
    const pricesResponse = await fetchFunc(`${BASE_URL}/prices`);
    
    if (!pricesResponse.ok) {
      throw new Error(`HTTP error ${pricesResponse.status}`);
    }
    
    const pricesData = await pricesResponse.json();
    console.log('Prices data:', pricesData);
    
    if (pricesData.prices && Object.keys(pricesData.prices).length > 0) {
      console.log('✅ Prices endpoint returned data');
    } else {
      console.log('❌ No prices returned');
    }
  } catch (error) {
    console.error('❌ Prices endpoint test failed:', error.message);
  }
  
  // Test individual price endpoints
  console.log('\n3. Testing individual price endpoints...');
  
  for (const symbol of TEST_TOKENS) {
    try {
      const priceResponse = await fetchFunc(`${BASE_URL}/price/${symbol}`);
      
      if (!priceResponse.ok) {
        throw new Error(`HTTP error ${priceResponse.status}`);
      }
      
      const priceData = await priceResponse.json();
      console.log(`${symbol} price data:`, priceData);
      
      if (priceData.price !== undefined) {
        console.log(`✅ ${symbol} price endpoint returned data`);
      } else {
        console.log(`❌ No price returned for ${symbol}`);
      }
    } catch (error) {
      console.error(`❌ ${symbol} price endpoint test failed:`, error.message);
    }
  }
  
  console.log('\nTest suite completed');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
});
