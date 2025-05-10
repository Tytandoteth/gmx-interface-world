import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import { formatUnits } from "@ethersproject/units";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { WORLD } from "sdk/configs/chains";
import { isWorldChain } from "lib/worldchain";
import { getActiveDeployment } from "../worldchain/customDeployment";

// Simple ABI for the RedStonePriceFeed contract
const REDSTONE_PRICE_FEED_ABI = [
  "function getLatestPrice(string memory symbol) public view returns (uint256)",
  "function getLatestPrices(string[] memory symbols) public view returns (uint256[] memory)",
  "function getTokenDecimals(string memory symbol) public view returns (uint8)"
];

/**
 * Adapter for interacting with the custom RedStone price feed on World Chain
 * This implementation uses the RedStone EVM Connector to properly wrap contract calls
 */
export class CustomRedstoneAdapter {
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
      // Use custom deployment address if available
      const activeDeployment = getActiveDeployment();
      const address = priceFeedAddress || activeDeployment.redStonePriceFeed;
      
      if (!address) {
        console.error("No RedStone price feed address provided");
        return;
      }
      
      try {
        this.priceFeedContract = new Contract(
          address,
          REDSTONE_PRICE_FEED_ABI,
          provider
        );
        console.log(`CustomRedstoneAdapter initialized with contract at ${address}`);
      } catch (error) {
        console.error("Failed to initialize CustomRedstoneAdapter:", error);
        this.priceFeedContract = null;
      }
    } else {
      console.debug(`CustomRedstoneAdapter not initialized for chain ${chainId} (not World Chain)`);
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
      // This is required because RedStone delivers price data in the transaction calldata
      const wrappedContract = WrapperBuilder
        .wrap(this.priceFeedContract)
        .usingDataService({
          dataServiceId: "redstone-primary-prod",
          // RedStone API expects authorized signers
          authorizedSigners: ["0x0C39486f770B26F5527BBBf942726537986Cd7eb"], // Example signer address
          // Packages containing the price data
          dataPackagesIds: ["price-feed"]
        });
      
      // Get price from wrapped contract
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
        .wrap(this.priceFeedContract)
        .usingDataService({
          dataServiceId: "redstone-primary-prod",
          uniqueSignersCount: 1
        });
      
      // Get prices from wrapped contract
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
  
  /**
   * Get token decimals
   * @param symbol Token symbol
   * @returns Number of decimals for the token
   */
  public async getTokenDecimals(symbol: string): Promise<number> {
    try {
      if (!this.isConnected() || !this.priceFeedContract) {
        return 8; // Default to 8 decimals
      }
      
      // Wrap the contract with RedStone data provider
      const wrappedContract = WrapperBuilder
        .wrap(this.priceFeedContract)
        .usingDataService({
          dataServiceId: "redstone-primary-prod",
          uniqueSignersCount: 1
        });
      
      // Get decimals from wrapped contract
      const decimals = await wrappedContract.getTokenDecimals(symbol);
      
      return decimals;
    } catch (error) {
      console.error(`Failed to get decimals for ${symbol} from RedStone:`, error);
      return 8; // Default to 8 decimals
    }
  }
}

// Singleton instance
let customAdapterInstance: CustomRedstoneAdapter | null = null;

/**
 * Get the CustomRedstoneAdapter instance
 * @param chainId Chain ID
 * @param provider Ethers provider
 * @param priceFeedAddress Optional price feed address
 * @returns CustomRedstoneAdapter instance
 */
export function getCustomRedstoneAdapter(
  chainId: number,
  provider: Provider,
  priceFeedAddress?: string
): CustomRedstoneAdapter {
  if (!customAdapterInstance) {
    customAdapterInstance = new CustomRedstoneAdapter(chainId, provider, priceFeedAddress);
  }
  
  return customAdapterInstance;
}
