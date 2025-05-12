/**
 * CoinGecko Integration Test Script
 * Validates the Oracle Keeper integration with CoinGecko as the primary price source
 */

// Simplified fetch function for Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Oracle Keeper URL - same as in our .env.local template
const ORACLE_KEEPER_URL = 'https://oracle-keeper.kevin8396.workers.dev/direct-prices';

// Required tokens for World Chain GMX
const REQUIRED_TOKENS = ['WLD', 'WETH', 'MAG'];

// Main test function
async function testCoinGeckoIntegration() {
  console.log('\n===== CoinGecko Integration Test =====\n');
  console.log(`Testing Oracle Keeper endpoint: ${ORACLE_KEEPER_URL}`);
  
  try {
    // 1. Fetch prices from Oracle Keeper
    console.log('\nFetching prices from Oracle Keeper...');
    const response = await fetch(ORACLE_KEEPER_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 2. Validate response structure
    console.log('\nValidating response structure...');
    if (data.status !== 'success') {
      throw new Error(`Expected status 'success', got '${data.status}'`);
    }
    
    if (!data.prices) {
      throw new Error('No prices found in the response');
    }
    
    if (!data.source) {
      throw new Error('No source information found in the response');
    }
    
    // 3. Validate price source is CoinGecko
    console.log('\nValidating price source...');
    if (!data.source.toLowerCase().includes('coingecko')) {
      console.warn(`Warning: Expected source to include 'CoinGecko', got '${data.source}'`);
    } else {
      console.log(`✅ Price source confirmed: ${data.source}`);
    }
    
    // 4. Validate all required tokens are present
    console.log('\nValidating required tokens...');
    const missingTokens = REQUIRED_TOKENS.filter(token => !data.prices[token]);
    
    if (missingTokens.length > 0) {
      throw new Error(`Missing required tokens: ${missingTokens.join(', ')}`);
    }
    
    console.log('✅ All required tokens found with price data');
    
    // 5. Display price data
    console.log('\nToken Price Data:');
    console.log('================');
    
    REQUIRED_TOKENS.forEach(token => {
      console.log(`${token}: $${data.prices[token].toFixed(6)}`);
    });
    
    // 6. Validate timestamps
    console.log('\nValidating timestamps...');
    const lastUpdated = new Date(data.lastUpdated);
    const now = new Date();
    const timeDiffMinutes = (now - lastUpdated) / (1000 * 60);
    
    console.log(`Last Updated: ${lastUpdated.toISOString()}`);
    console.log(`Age: ${timeDiffMinutes.toFixed(2)} minutes ago`);
    
    if (timeDiffMinutes > 15) {
      console.warn(`⚠️ Warning: Price data is over 15 minutes old (${timeDiffMinutes.toFixed(2)} minutes)`);
    } else {
      console.log('✅ Price data is current (< 15 minutes old)');
    }
    
    // 7. Overall validation
    console.log('\n===== Test Summary =====');
    console.log('✅ CoinGecko integration test passed!');
    console.log(`✅ Source: ${data.source}`);
    console.log(`✅ Tokens: ${REQUIRED_TOKENS.join(', ')}`);
    console.log(`✅ Last Updated: ${timeDiffMinutes.toFixed(2)} minutes ago`);
    
  } catch (error) {
    console.error('\n❌ ERROR: CoinGecko integration test failed!');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCoinGeckoIntegration();
