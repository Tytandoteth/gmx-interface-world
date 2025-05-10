import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import { formatUnits } from "@ethersproject/units";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { WORLD } from "sdk/configs/chains";
import { isWorldChain } from "lib/worldchain";
import { WorldChainConfig } from "lib/worldchain/worldChainDevMode";
import { getActiveDeployment } from "../worldchain/customDeployment";

// Simple ABI for the RedStonePriceFeed contract
const REDSTONE_PRICE_FEED_ABI = [
  "function getLatestPrice(string memory symbol) public view returns (uint256)",
  "function getLatestPrices(string[] memory symbols) public view returns (uint256[] memory)"
];

/**
 * Adapter for interacting with the RedStone price feed on World Chain
 */
export class RedstoneAdapter {
  private provider: Provider;
  private priceFeedContract: Contract | null = null;
  readonly chainId: number;
  
  /**
   * Constructor
   * @param chainId Chain ID
   * @param provider Ethers provider
   * @param priceFeedAddress RedStone price feed contract address
   */
  constructor(
    chainId: number,
    provider: Provider,
    priceFeedAddress?: string
  ) {
    this.chainId = chainId;
    this.provider = provider;
    
    // Only initialize for World Chain
    if (isWorldChain(chainId)) {
      const address = priceFeedAddress || WorldChainConfig.redstone.priceFeedAddress;
      
      try {
        this.priceFeedContract = new Contract(
          address,
          REDSTONE_PRICE_FEED_ABI,
          provider
        );
        console.log(`RedstoneAdapter initialized for World Chain with contract at ${address}`);
      } catch (error) {
        console.error("Failed to initialize RedstoneAdapter:", error);
        this.priceFeedContract = null;
      }
    } else {
      console.debug(`RedstoneAdapter not initialized for chain ${chainId} (not World Chain)`);
    }
  }

  /**
   * Check if the adapter is properly connected to the price feed contract
   * @returns true if connected
   */
  public isConnected(): boolean {
    return !!this.priceFeedContract && isWorldChain(this.chainId);
  }
  
  /**
   * Get the latest price for a token
   * @param symbol Token symbol
   * @returns Price with 8 decimal places or null if error
   */
  public async getPrice(symbol: string): Promise<number | null> {
    try {
      if (!this.isConnected() || !this.priceFeedContract) {
        return null;
      }
      
      // Wrap the contract with RedStone data provider
      const wrappedContract = WrapperBuilder
        .wrapLite(this.priceFeedContract)
        .usingPriceFeed("redstone-primary");
      
      // Get price from contract with RedStone wrapper
      const price = await wrappedContract.getLatestPrice(symbol);
      
      // Price is returned with 8 decimal places, convert to number
      return parseFloat(formatUnits(price, 8));
    } catch (error) {
      console.error(`Failed to get price for ${symbol} from RedStone:`, error);
      return null;
    }
  }
  
  /**
   * Get the latest prices for multiple tokens
   * @param symbols Array of token symbols
   * @returns Object with symbol -> price mappings
   */
  public async getPrices(symbols: string[]): Promise<Record<string, number>> {
    try {
      if (!this.isConnected() || !this.priceFeedContract) {
        return {};
      }
      
      // Wrap the contract with RedStone data provider
      const wrappedContract = WrapperBuilder
        .wrapLite(this.priceFeedContract)
        .usingPriceFeed("redstone-primary");
      
      // Get prices from contract with RedStone wrapper
      const prices = await wrappedContract.getLatestPrices(symbols);
      
      // Create mapping from symbols to prices
      const result: Record<string, number> = {};
      
      for (let i = 0; i < symbols.length; i++) {
        result[symbols[i]] = parseFloat(formatUnits(prices[i], 8));
      }
      
      return result;
    } catch (error) {
      console.error("Failed to get prices from RedStone:", error);
      return {};
    }
  }
}

// Singleton instance type
interface RedstoneAdapterSingleton {
  instance: RedstoneAdapter | null;
  chainId: number | null;
}

// Create a singleton instance for the adapter
const redstoneAdapterSingleton: RedstoneAdapterSingleton = {
  instance: null,
  chainId: null
};

/**
 * Get the RedstoneAdapter instance for a chain
 * @param chainId Chain ID
 * @param provider Ethers provider
 * @param priceFeedAddress Optional price feed address (defaults to config)
 * @returns RedstoneAdapter instance
 */
export function getRedstoneAdapter(
  chainId: number,
  provider: Provider,
  priceFeedAddress?: string
): RedstoneAdapter {
  // Get the price feed address based on the active deployment (original or custom)
  const activeDeployment = getActiveDeployment();
  const defaultPriceFeedAddress = activeDeployment.redStonePriceFeed || 
                               WorldChainConfig.redstone.priceFeedAddress;
  
  // Use the provided address, or the active deployment address, or the config default
  const addressToUse = priceFeedAddress || defaultPriceFeedAddress;
  
  // Only create a new instance if needed
  if (!redstoneAdapterSingleton.instance || 
      redstoneAdapterSingleton.chainId !== chainId) {
    redstoneAdapterSingleton.instance = new RedstoneAdapter(chainId, provider, addressToUse);
    redstoneAdapterSingleton.chainId = chainId;
  }
  
  return redstoneAdapterSingleton.instance;
}
