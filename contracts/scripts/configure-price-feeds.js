// Script to configure GMX markets to use RedStone price feeds
const { ethers } = require("hardhat");

// Replace these with the actual addresses after deployment
const REDSTONE_PRICE_FEED_ADDRESS = "0x123..."; // This will be the deployed RedStonePriceFeed address
const VAULT_ADDRESS = "0x456..."; // GMX Vault address on World Chain
const GMX_ROUTER_ADDRESS = "0x789..."; // GMX Router address on World Chain

async function main() {
  console.log("Configuring GMX to use RedStone price feeds...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Configuring with account: ${deployer.address}`);
  
  // Connect to the deployed contracts
  const vault = await ethers.getContractAt("Vault", VAULT_ADDRESS);
  const router = await ethers.getContractAt("Router", GMX_ROUTER_ADDRESS);
  const priceFeed = await ethers.getContractAt("RedStonePriceFeed", REDSTONE_PRICE_FEED_ADDRESS);
  
  console.log(`Connected to Vault at: ${vault.address}`);
  console.log(`Connected to Router at: ${router.address}`);
  console.log(`Connected to RedStonePriceFeed at: ${priceFeed.address}`);
  
  // Define the tokens we want to configure
  const tokens = [
    { symbol: "WLD", address: "0x163f8c2467924be0ae7b5347228cabf260318753" },
    { symbol: "ETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" },
    { symbol: "BTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" },
    { symbol: "USDC", address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" },
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" }
  ];
  
  // Set price feeds in the Vault
  console.log("Setting price feeds in the Vault...");
  for (const token of tokens) {
    console.log(`Setting price feed for ${token.symbol}...`);
    
    // Example: vault.setPriceFeed(token.address, priceFeed.address)
    // Replace with the actual method name and parameters from the GMX Vault contract
    const tx = await vault.setPriceFeed(token.address, priceFeed.address);
    await tx.wait();
    
    console.log(`Successfully set RedStone price feed for ${token.symbol}`);
  }
  
  console.log("Price feed configuration complete!");
}

// Execute configuration
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
