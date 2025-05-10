// Test script for RedStone integration with GMX on World Chain
// This script will query the deployed RedStonePriceFeed contract to verify it's working correctly

const { ethers } = require("hardhat");
require("dotenv").config();

// Token symbols to test
const TOKENS_TO_TEST = ["WLD", "ETH", "BTC", "USDC", "USDT"];

async function main() {
  console.log("Testing RedStone Price Feed integration on World Chain");
  console.log("=====================================================\n");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Get the deployed RedStonePriceFeed contract address from .env or command line args
  let redStonePriceFeedAddress = process.env.VITE_APP_WORLD_REDSTONE_PRICE_FEED;
  
  // Allow command line override
  if (process.argv.length > 2) {
    redStonePriceFeedAddress = process.argv[2];
    console.log(`Using command line provided address: ${redStonePriceFeedAddress}`);
  }
  
  if (!redStonePriceFeedAddress) {
    console.error("Error: No RedStonePriceFeed address provided");
    console.log("Please set VITE_APP_WORLD_REDSTONE_PRICE_FEED in .env or provide as argument");
    process.exit(1);
  }
  
  try {
    console.log(`Testing RedStonePriceFeed at address: ${redStonePriceFeedAddress}`);
    
    // Get contract instance
    const RedStonePriceFeed = await ethers.getContractFactory("RedStonePriceFeed");
    const priceFeed = RedStonePriceFeed.attach(redStonePriceFeedAddress);
    
    // Check token decimals
    console.log("\nToken Decimals Configuration:");
    console.log("---------------------------");
    
    for (const token of TOKENS_TO_TEST) {
      try {
        const decimals = await priceFeed.getTokenDecimals(token);
        console.log(`${token}: ${decimals} decimals`);
      } catch (error) {
        console.warn(`Could not get decimals for ${token}: ${error.message}`);
      }
    }
    
    // Check prices
    console.log("\nToken Price Data:");
    console.log("---------------");
    
    // Test individual price queries
    for (const token of TOKENS_TO_TEST) {
      try {
        const price = await priceFeed.getLatestPrice(token);
        console.log(`${token}: ${ethers.utils.formatUnits(price, 8)} USD`);
      } catch (error) {
        console.warn(`Could not get price for ${token}: ${error.message}`);
      }
    }
    
    // Test batch price query
    try {
      console.log("\nBatch Price Query:");
      console.log("----------------");
      
      const prices = await priceFeed.getLatestPrices(TOKENS_TO_TEST);
      
      for (let i = 0; i < TOKENS_TO_TEST.length; i++) {
        console.log(`${TOKENS_TO_TEST[i]}: ${ethers.utils.formatUnits(prices[i], 8)} USD`);
      }
    } catch (error) {
      console.warn(`Could not perform batch price query: ${error.message}`);
    }
    
    // Verify RedStone price feed is working
    console.log("\nVerification Status:");
    console.log("-----------------");
    
    let workingTokens = 0;
    
    for (const token of TOKENS_TO_TEST) {
      try {
        const price = await priceFeed.getLatestPrice(token);
        if (price.gt(0)) {
          workingTokens++;
          console.log(`✅ ${token}: Price feed is working`);
        } else {
          console.log(`❌ ${token}: Price is zero`);
        }
      } catch (error) {
        console.log(`❌ ${token}: Error - ${error.message}`);
      }
    }
    
    // Summary
    console.log("\nSummary:");
    console.log("-------");
    console.log(`${workingTokens} out of ${TOKENS_TO_TEST.length} token price feeds are working`);
    
    if (workingTokens === TOKENS_TO_TEST.length) {
      console.log("✅ RedStone integration is fully functional");
    } else if (workingTokens > 0) {
      console.log("⚠️ RedStone integration is partially functional");
    } else {
      console.log("❌ RedStone integration is not working");
    }
    
  } catch (error) {
    console.error(`Error testing RedStone price feed: ${error.message}`);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
