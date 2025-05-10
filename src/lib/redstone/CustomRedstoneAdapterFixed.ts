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

// RedStone authorized signers - update these with the actual RedStone signers
const REDSTONE_SIGNERS = [
  "0x0C39486f770B26F5527BBBf942726537986Cd7eb"
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
      
      console.log(`Fetching price for ${symbol} using RedStone...`);
      
      try {
        // Attempt to get the price directly without the wrapper first
        // This is for testing and will likely fail with CalldataMustHaveValidPayload
        const directPrice = await this.priceFeedContract.getLatestPrice(symbol);
        console.log(`Direct price for ${symbol}: ${formatUnits(directPrice, 8)}`);
      } catch (directError) {
        console.log(`Expected direct call error: ${directError.message}`);
      }
      
      // Wrap the contract with RedStone data provider
      // This is required because RedStone delivers price data in the transaction calldata
      const wrappedContract = WrapperBuilder
        .wrap(this.priceFeedContract)
        .usingDataService({
          dataServiceId: "redstone-primary-prod",
          dataFeeds: [symbol], // Specify which token data we want
          // RedStone API configuration
          authProviders: [
            {
              // Provider type tells how to verify signatures
              type: "redstone", 
              // Provide list of authorized signers trusted by your app
              authorizedSigners: REDSTONE_SIGNERS
            }
          ]
        });
      
      console.log(`Getting price for ${symbol} with wrapped contract...`);
      
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
      // Wrap the contract using the current RedStone SDK API
      // Cast to any to bypass strict type checking due to SDK version differences
      const wrappedContract = (WrapperBuilder as any)
        .wrap(this.priceFeedContract)
        .usingDataService({
          // Use parameters that work with the installed SDK version
          dataServiceId: "redstone-primary-prod",
          uniqueSignersCount: 1,
          // For newer versions of RedStone SDK
          dataPackagesIds: ["price-feed"],
          // Fallback for older versions
          authorizedSigners: REDSTONE_SIGNERS
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
          dataFeeds: [symbol], // Specify which token data we want
          // RedStone API configuration
          authProviders: [
            {
              // Provider type tells how to verify signatures
              type: "redstone", 
              // Provide list of authorized signers trusted by your app
              authorizedSigners: REDSTONE_SIGNERS
            }
          ]
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
