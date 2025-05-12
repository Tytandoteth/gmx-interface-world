import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import { formatUnits } from "@ethersproject/units";
import { WORLD } from "sdk/configs/chains";
import { isWorldChain } from "lib/worldchain";
import { WorldChainConfig } from "lib/worldchain/worldChainDevMode";
import { getActiveDeployment } from "../worldchain/customDeployment";

// Simple ABI for the Witnet Price Router contract
const WITNET_PRICE_ROUTER_ABI = [
  "function valueFor(bytes32 id) external view returns (int256)",
  "function timestampFor(bytes32 id) external view returns (uint256)",
  "function lastPriceFor(bytes32 id) external view returns (int256, uint256)"
];

// Map token symbols to their Witnet Price Feed IDs
// These IDs are bytes32 values that identify the specific price feed
const TOKEN_TO_WITNET_ID: Record<string, string> = {
  // Format: TOKEN_SYMBOL: "0x...", (bytes32 ID for the price feed)
  WLD: "0x1234000000000000000000000000000000000000000000000000000000000000", // Placeholder ID
  WETH: "0x5678000000000000000000000000000000000000000000000000000000000000", // Placeholder ID
  MAG: "0x9abc000000000000000000000000000000000000000000000000000000000000"  // Placeholder ID
};

/**
 * Adapter for interacting with the Witnet price router on World Chain
 */
export class WitnetAdapter {
  private provider: Provider;
  private priceRouterContract: Contract | null = null;
  readonly chainId: number;
  
  /**
   * Constructor
   * @param chainId Chain ID
   * @param provider Ethers provider
   * @param priceRouterAddress Witnet price router contract address
   */
  constructor(
    chainId: number,
    provider: Provider,
    priceRouterAddress?: string
  ) {
    this.chainId = chainId;
    this.provider = provider;
    
    // Only initialize for World Chain
    if (isWorldChain(chainId)) {
      // Get the router address from config or parameters
      // In the future, this could be part of WorldChainConfig.witnet.priceRouterAddress
      const address = priceRouterAddress || getActiveDeployment()?.witnetPriceRouter || "";
      
      if (!address) {
        console.error("Failed to initialize WitnetAdapter: No Witnet Price Router address provided");
        return;
      }
      
      try {
        this.priceRouterContract = new Contract(
          address,
          WITNET_PRICE_ROUTER_ABI,
          provider
        );
        console.log(`WitnetAdapter initialized for World Chain with contract at ${address}`);
      } catch (error) {
        console.error("Failed to initialize WitnetAdapter:", error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  /**
   * Check if the adapter is initialized
   * @returns Boolean indicating if the adapter is initialized
   */
  public isInitialized(): boolean {
    return !!this.priceRouterContract;
  }
  
  /**
   * Get price for a single token
   * @param symbol Token symbol
   * @returns Price in USD with 6 decimal places or null if price not available
   */
  public async getPrice(symbol: string): Promise<number | null> {
    if (!this.priceRouterContract) {
      console.error("WitnetAdapter not initialized");
      return null;
    }
    
    try {
      const witnetId = TOKEN_TO_WITNET_ID[symbol];
      
      if (!witnetId) {
        console.warn(`No Witnet ID mapping for symbol: ${symbol}`);
        return null;
      }
      
      // Call the Witnet Price Router contract to get the latest price
      const [price, timestamp] = await this.priceRouterContract.lastPriceFor(witnetId);
      
      // Witnet prices are typically returned with 6 decimals
      const formattedPrice = parseFloat(formatUnits(price, 6));
      
      return formattedPrice;
    } catch (error) {
      console.error(`Error fetching price for ${symbol} from Witnet:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }
  
  /**
   * Get prices for multiple tokens
   * @param symbols Array of token symbols
   * @returns Map of token symbol to price
   */
  public async getPrices(symbols: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    
    // Process tokens in parallel
    const promises = symbols.map(async (symbol) => {
      const price = await this.getPrice(symbol);
      if (price !== null) {
        result[symbol] = price;
      }
    });
    
    await Promise.all(promises);
    
    return result;
  }
}

// Singleton instance type
interface WitnetAdapterSingleton {
  instance: WitnetAdapter | null;
  chainId: number | null;
}

// Create a singleton instance for the adapter
const witnetAdapterSingleton: WitnetAdapterSingleton = {
  instance: null,
  chainId: null
};

/**
 * Get the WitnetAdapter instance for a chain
 * @param chainId Chain ID
 * @param provider Ethers provider
 * @param priceRouterAddress Optional price router address (defaults to config)
 * @returns WitnetAdapter instance
 */
export function getWitnetAdapter(
  chainId: number,
  provider: Provider,
  priceRouterAddress?: string
): WitnetAdapter {
  // Check if we need to create a new instance
  if (
    !witnetAdapterSingleton.instance ||
    witnetAdapterSingleton.chainId !== chainId
  ) {
    // Create a new instance
    witnetAdapterSingleton.instance = new WitnetAdapter(
      chainId,
      provider,
      priceRouterAddress
    );
    witnetAdapterSingleton.chainId = chainId;
  }
  
  return witnetAdapterSingleton.instance;
}
