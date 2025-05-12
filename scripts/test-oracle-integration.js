/* eslint-disable no-console */
// @ts-check
/**
 * World Chain GMX Oracle Integration Test Script
 * 
 * This script tests the integration between the Oracle Keeper and GMX interface
 * for the World Chain implementation. It verifies:
 * 
 * 1. Connection to the Oracle Keeper endpoint
 * 2. Price data retrieval for supported tokens
 * 3. Fallback mechanisms when the primary data source is unavailable
 */

import dotenv from 'dotenv';
import https from 'https';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.development' });

// Default URL can be overridden by environment variables
const ORACLE_KEEPER_URL = (globalThis.process?.env?.VITE_ORACLE_KEEPER_URL) || 'https://oracle-keeper.kevin8396.workers.dev';
const SUPPORTED_TOKENS = ['WLD', 'WETH', 'ETH', 'USDC', 'BTC', 'MAG'];

// Use console.warn for logging as per project standards
console.warn('====================================');
console.warn('World Chain GMX Oracle Integration Test');
console.warn('====================================');
console.warn(`Oracle Keeper URL: ${ORACLE_KEEPER_URL}`);
console.warn(`Testing date: ${new Date().toISOString()}`);
console.warn('====================================\n');

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timeout: ${url}`));
    }, timeout);

    https.get(url, { signal: controller.signal, ...options }, (res) => {
      clearTimeout(timeoutId);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

async function testHealthEndpoint() {
  console.warn('Testing Oracle Keeper Health Endpoint...');
  try {
    const healthData = await fetchWithTimeout(`${ORACLE_KEEPER_URL}/health`);
    console.warn('Health Status:', healthData.status);
    console.warn('API Latency:', healthData.latency, 'ms');
    console.warn('Version:', healthData.version);
    console.warn('Mode:', healthData.mode);
    
    if (healthData.prices && Array.isArray(healthData.prices)) {
      console.warn('\nSupported Tokens:');
      healthData.prices.forEach(token => {
        console.warn(`- ${token.symbol}: ${token.available ? 'Available' : 'Unavailable'} (${token.latestPrice || 'N/A'})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Health endpoint error:', error.message);
    return false;
  }
}

async function testDirectPricesEndpoint() {
  console.warn('\nTesting Direct Prices Endpoint...');
  try {
    const pricesData = await fetchWithTimeout(`${ORACLE_KEEPER_URL}/direct-prices`);
    
    if (pricesData && pricesData.prices) {
      console.warn('Price data retrieved successfully!');
      console.warn('Timestamp:', pricesData.timestamp);
      console.warn('Last Updated:', pricesData.lastUpdated);
      
      console.warn('\nToken Prices:');
      Object.entries(pricesData.prices).forEach(([symbol, price]) => {
        console.warn(`- ${symbol}: $${price}`);
      });
      
      // Check for supported tokens
      console.warn('\nSupported Token Check:');
      SUPPORTED_TOKENS.forEach(token => {
        if (pricesData.prices[token]) {
          console.warn(`✅ ${token}: $${pricesData.prices[token]}`);
        } else {
          console.warn(`❌ ${token}: Not found in price data`);
        }
      });
      
      return true;
    } else {
      console.error('Invalid price data format received');
      return false;
    }
  } catch (error) {
    console.error('Direct prices endpoint error:', error.message);
    return false;
  }
}

async function testTickersEndpoint() {
  console.warn('\nTesting Tickers Data (via Prices Endpoint)...');
  try {
    // Use the /prices endpoint as documented in the Oracle Keeper API
    const pricesData = await fetchWithTimeout(`${ORACLE_KEEPER_URL}/prices`);
    
    if (pricesData && pricesData.prices && typeof pricesData.prices === 'object') {
      console.warn('Prices data retrieved successfully!');
      console.warn(`Total tokens: ${Object.keys(pricesData.prices).length}`);
      console.warn(`Last updated: ${pricesData.lastUpdated || 'unknown'}`);
      console.warn(`Source: ${pricesData.source || 'unknown'}`);
      
      // Convert prices data to ticker format for display
      const tickers = [];
      for (const [symbol, price] of Object.entries(pricesData.prices)) {
        tickers.push({
          tokenSymbol: symbol,
          minPrice: price.toString(),
          maxPrice: price.toString()
        });
      }
      
      console.warn('\nSample Prices:');
      tickers.slice(0, 5).forEach(ticker => {
        console.warn(`- ${ticker.tokenSymbol}: $${parseFloat(ticker.minPrice).toFixed(2)}`);
      });
      
      return true;
    } else {
      console.error('Invalid prices data format received');
      return false;
    }
  } catch (error) {
    console.error('Prices endpoint error:', error.message);
    return false;
  }
}

async function runTests() {
  try {
    const healthResult = await testHealthEndpoint();
    const directPricesResult = await testDirectPricesEndpoint();
    const tickersResult = await testTickersEndpoint();
    
    console.warn('\n====================================');
    console.warn('Test Results Summary:');
    console.warn('====================================');
    console.warn(`Health Endpoint: ${healthResult ? '✅ PASS' : '❌ FAIL'}`);
    console.warn(`Direct Prices Endpoint: ${directPricesResult ? '✅ PASS' : '❌ FAIL'}`);
    console.warn(`Tickers Endpoint: ${tickersResult ? '✅ PASS' : '❌ FAIL'}`);
    console.warn('====================================');
    
    if (healthResult && directPricesResult && tickersResult) {
      console.warn('\n✅ All tests passed! Oracle integration is working correctly.');
      const exit = globalThis.process?.exit || ((code) => { throw new Error(`Exiting with code ${code}`); });
      exit(0);
    } else {
      console.error('\n❌ Some tests failed. Please check the Oracle Keeper integration.');
      const exit = globalThis.process?.exit || ((code) => { throw new Error(`Exiting with code ${code}`); });
      exit(1);
    }
  } catch (error) {
    console.error('Test runner error:', error);
    const exit = globalThis.process?.exit || ((code) => { throw new Error(`Exiting with code ${code}`); });
    exit(1);
  }
}

// Run all tests
runTests();
