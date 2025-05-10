// Simple standalone RedStone integration test
import { ethers } from 'ethers';
import { WrapperBuilder } from '@redstone-finance/evm-connector';

// Basic ABI for RedStonePriceFeed
const REDSTONE_PRICE_FEED_ABI = [
  "function getLatestPrice(string memory symbol) public view returns (uint256)",
  "function getLatestPrices(string[] memory symbols) public view returns (uint256[] memory)",
  "function getTokenDecimals(string memory symbol) public view returns (uint8)",
  "function getUniqueSignersThreshold() public view returns (uint8)",
  "function getSupportedTokens() public pure returns (string[] memory)"
];

async function main() {
  console.log("RedStone Integration Test");
  console.log("========================");
  
  try {
    // Connect to World Chain (try multiple RPC endpoints)
    let provider;
    const rpcEndpoints = [
      'http://localhost:8545',  // Local node
      'https://nodes.world.computer', // Alternative URL format
      'https://rpc.world.computer'
    ];
    
    // Try each endpoint until one works
    for (const endpoint of rpcEndpoints) {
      try {
        provider = new ethers.JsonRpcProvider(endpoint);
        // Quick test to see if provider works
        await provider.getBlockNumber();
        console.log(`Connected to World Chain via ${endpoint}`);
        break;
      } catch (error) {
        console.log(`Failed to connect to ${endpoint}: ${error.message}`);
        if (endpoint === rpcEndpoints[rpcEndpoints.length - 1]) {
          throw new Error('Failed to connect to any World Chain RPC endpoint');
        }
      }
    }
    
    // Get the network details
    const network = await provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // RedStonePriceFeed contract address
    const redStonePriceFeedAddress = '0x345bc48E1370fa399D0A6611669726aAC676DBB3';
    console.log(`RedStonePriceFeed Address: ${redStonePriceFeedAddress}`);
    
    // Create contract instance
    const redStonePriceFeed = new ethers.Contract(
      redStonePriceFeedAddress,
      REDSTONE_PRICE_FEED_ABI,
      provider
    );
    
    // Test direct contract calls for metadata functions
    console.log("\nTesting contract metadata functions:");
    
    try {
      const uniqueSignersThreshold = await redStonePriceFeed.getUniqueSignersThreshold();
      console.log(`✅ getUniqueSignersThreshold: ${uniqueSignersThreshold}`);
    } catch (error) {
      console.log(`❌ getUniqueSignersThreshold failed: ${error.message}`);
    }
    
    try {
      const supportedTokens = await redStonePriceFeed.getSupportedTokens();
      console.log(`✅ getSupportedTokens: ${supportedTokens.join(', ')}`);
    } catch (error) {
      console.log(`❌ getSupportedTokens failed: ${error.message}`);
    }
    
    // Test direct price calls (these will fail without RedStone wrapper)
    console.log("\nTesting direct price calls (expected to fail):");
    
    try {
      const wldPrice = await redStonePriceFeed.getLatestPrice("WLD");
      console.log(`WLD Price: ${ethers.formatUnits(wldPrice, 8)} USD`);
    } catch (error) {
      console.log(`❌ Direct WLD price call failed: ${error.message.split('\n')[0]}`);
    }
    
    // Try with RedStone wrapper
    console.log("\nTesting with RedStone wrapper:");
    
    try {
      // Create wrapped contract with RedStone data service
      const wrappedContract = WrapperBuilder
        .wrapLite(redStonePriceFeed)
        .usingDataService({
          dataServiceId: "redstone-main-demo",
          uniqueSignersCount: 1,
          dataFeeds: ["WLD", "ETH"]
        });
      
      console.log("✅ Successfully created wrapped contract");
      
      // Try to get price with wrapped contract
      try {
        const wldPrice = await wrappedContract.getLatestPrice("WLD");
        console.log(`✅ WLD Price: ${ethers.formatUnits(wldPrice, 8)} USD`);
      } catch (error) {
        console.log(`❌ Wrapped WLD price call failed: ${error.message.split('\n')[0]}`);
      }
      
      try {
        const ethPrice = await wrappedContract.getLatestPrice("ETH");
        console.log(`✅ ETH Price: ${ethers.formatUnits(ethPrice, 8)} USD`);
      } catch (error) {
        console.log(`❌ Wrapped ETH price call failed: ${error.message.split('\n')[0]}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to create wrapped contract: ${error.message}`);
    }
    
    console.log("\nTest completed!");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
