// Script to deploy the RedStonePriceFeed contract to World Chain
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying RedStonePriceFeed contract to World Chain...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Check balance to ensure we have enough for deployment
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} WLD`);
  
  // Deploy the RedStonePriceFeed contract
  const RedStonePriceFeed = await ethers.getContractFactory("RedStonePriceFeed");
  const priceFeed = await RedStonePriceFeed.deploy();
  await priceFeed.deployed();
  
  console.log(`RedStonePriceFeed deployed to: ${priceFeed.address}`);
  
  // Set token decimals for commonly used tokens
  console.log("Setting token decimals...");
  const tokens = ["WLD", "ETH", "BTC", "USDC", "USDT"];
  const decimals = [8, 8, 8, 8, 8];
  
  for (let i = 0; i < tokens.length; i++) {
    const tx = await priceFeed.setTokenDecimals(tokens[i], decimals[i]);
    await tx.wait();
    console.log(`Set decimals for ${tokens[i]} to ${decimals[i]}`);
  }
  
  console.log("Deployment and configuration complete!");
  
  // Return the contract address for use in other scripts
  return priceFeed.address;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
