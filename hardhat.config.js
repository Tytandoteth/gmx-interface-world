require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("@typechain/hardhat");

// Load environment variables
require("dotenv").config();

const {
  WORLD_CHAIN_URL,
  WORLD_CHAIN_DEPLOY_KEY,
  ETHERSCAN_API_KEY,
} = process.env;

// Default values for local development
const DEFAULT_WORLD_CHAIN_URL = "http://localhost:8545";
const NETWORK_ID = 773;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      allowUnlimitedContractSize: true
    },
    world: {
      url: WORLD_CHAIN_URL || DEFAULT_WORLD_CHAIN_URL,
      chainId: NETWORK_ID,
      accounts: WORLD_CHAIN_DEPLOY_KEY ? [WORLD_CHAIN_DEPLOY_KEY] : []
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  }
};
