// Setup script for RedStone integration with GMX on World Chain
// This script will:
// 1. Deploy the RedStonePriceFeed contract
// 2. Configure the GMX Vault to use the deployed RedStone price feeds
// 3. Verify the setup by checking if the price feeds are working correctly

const { ethers } = require("hardhat");
require("dotenv").config();

// Wait for a transaction to be confirmed
async function waitForTx(tx) {
  console.log(`Transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

// Log a divider for better console output
function logDivider() {
  console.log("\n" + "=".repeat(80) + "\n");
}

async function main() {
  console.log("Starting RedStone integration setup for GMX on World Chain");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  logDivider();
  
  // Step 1: Deploy the RedStonePriceFeed contract
  console.log("Step 1: Deploying RedStonePriceFeed contract");
  
  const RedStonePriceFeed = await ethers.getContractFactory("RedStonePriceFeed");
  const redStonePriceFeed = await RedStonePriceFeed.deploy();
  
  await waitForTx(redStonePriceFeed.deployTransaction);
  console.log(`RedStonePriceFeed deployed to: ${redStonePriceFeed.address}`);
  
  // Configure token decimals
  const tokens = [
    { symbol: "WLD", decimals: 18 },
    { symbol: "ETH", decimals: 18 },
    { symbol: "BTC", decimals: 8 },
    { symbol: "USDC", decimals: 6 },
    { symbol: "USDT", decimals: 6 }
  ];
  
  for (const token of tokens) {
    console.log(`Setting decimals for ${token.symbol} to ${token.decimals}`);
    await waitForTx(await redStonePriceFeed.setTokenDecimals(token.symbol, token.decimals));
  }
  
  logDivider();
  
  // Step 2: Configure GMX Vault to use RedStone price feeds
  console.log("Step 2: Configuring GMX Vault to use RedStone price feeds");
  
  // Load GMX Vault address from environment or use a default for testing
  const vaultAddress = process.env.VITE_APP_WORLD_VAULT_ADDRESS;
  
  if (!vaultAddress) {
    console.warn("Warning: No Vault address provided in environment variables");
    console.log("Skipping GMX Vault configuration");
  } else {
    console.log(`GMX Vault address: ${vaultAddress}`);
    
    try {
      // Get Vault contract instance
      const Vault = await ethers.getContractFactory("Vault");
      const vault = await Vault.attach(vaultAddress);
      
      // Configure price feeds for each token
      for (const token of tokens) {
        console.log(`Setting price feed for ${token.symbol} to RedStonePriceFeed`);
        await waitForTx(await vault.setPriceFeed(token.symbol, redStonePriceFeed.address));
      }
      
      console.log("Successfully configured GMX Vault to use RedStone price feeds");
    } catch (error) {
      console.error("Error configuring GMX Vault:", error.message);
      console.log("You may need to run the configure-price-feeds.js script separately");
    }
  }
  
  logDivider();
  
  // Step 3: Verify the setup
  console.log("Step 3: Verifying RedStone integration setup");
  
  // Check if RedStonePriceFeed is working correctly
  for (const token of tokens) {
    try {
      const price = await redStonePriceFeed.getLatestPrice(token.symbol);
      console.log(`${token.symbol} price: ${ethers.utils.formatUnits(price, 8)} USD`);
    } catch (error) {
      console.warn(`Warning: Could not get price for ${token.symbol}:`, error.message);
    }
  }
  
  // Output the contract addresses for .env configuration
  logDivider();
  console.log("RedStone Integration Setup Complete");
  console.log("\nCopy the following values to your .env file:");
  console.log(`VITE_APP_WORLD_REDSTONE_PRICE_FEED=${redStonePriceFeed.address}`);
  
  if (vaultAddress) {
    console.log(`VITE_APP_WORLD_VAULT_ADDRESS=${vaultAddress}`);
  }
  
  logDivider();
  console.log("Next Steps:");
  console.log("1. Update your .env file with the contract addresses above");
  console.log("2. Restart your application");
  console.log("3. Test the integration by checking price feeds in the GMX interface");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
