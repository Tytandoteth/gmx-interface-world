import { ethers } from "ethers";

(async () => {
  try {
    // Test with the demo QuickNode endpoint
    console.log("Testing QuickNode demo endpoint...");
    const demoProvider = new ethers.JsonRpcProvider("https://docs-demo.worldchain-mainnet.quiknode.pro/");
    const demoAccounts = await demoProvider.listAccounts();
    console.log("Demo Accounts:", demoAccounts);
    
    // Also test with our project's QuickNode endpoint
    console.log("\nTesting our project's QuickNode endpoint...");
    const projectProvider = new ethers.JsonRpcProvider("https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/");
    const blockNumber = await projectProvider.getBlockNumber();
    console.log("Current Block Number:", blockNumber);
    const projectAccounts = await projectProvider.listAccounts();
    console.log("Project Accounts:", projectAccounts);
  } catch (error) {
    console.error("Error testing RPC endpoints:", error.message);
  }
})();
