import { ethers } from "ethers";
import { Provider } from "@ethersproject/providers";
import { getRedstoneAdapter } from "./RedstoneAdapter";
import { isWorldChain } from "lib/worldchain";
import { WorldChainConfig } from "lib/worldchain/worldChainDevMode";

/**
 * Type for price data from any source
 */
export interface PriceData {
  // Token symbol
  symbol: string;
  // Price value
  price: number;
  // Source of the price data
  source: "oracle-keeper" | "redstone" | "fallback";
  // Timestamp when the price was fetched
  timestamp: number;
}

/**
 * Integrates RedStone on-chain data with Oracle Keeper off-chain data
 * to provide a robust price feed system for World Chain
 */
export class RedstoneOracleIntegration {
  private readonly chainId: number;
  private readonly provider: Provider;
  private readonly oracleKeeperUrl: string;
  
  /**
   * Constructor
   * @param chainId Chain ID
   * @param provider Ethers provider
   * @param oracleKeeperUrl URL of the Oracle Keeper service
   */
  constructor(
    chainId: number,
    provider: Provider,
    oracleKeeperUrl: string = WorldChainConfig.oracleKeeperUrl
  ) {
    this.chainId = chainId;
    this.provider = provider;
    this.oracleKeeperUrl = oracleKeeperUrl;
  }
  
  /**
   * Fetches prices from both Oracle Keeper and RedStone (if available)
   * and returns the most reliable data
   * @param symbols Array of token symbols to fetch prices for
   * @returns Object mapping symbols to price data
   */
  public async getPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    const result: Record<string, PriceData> = {};
    const timestamp = Date.now();
    
    try {
      // Only use RedStone integration for World Chain
      if (isWorldChain(this.chainId) && WorldChainConfig.redstone.enabled) {
        // Get prices from RedStone on-chain
        const redstoneAdapter = getRedstoneAdapter(this.chainId, this.provider);
        const redstoneData = await redstoneAdapter.getPrices(symbols);
        
        // Use RedStone data for available tokens
        for (const symbol of symbols) {
          if (redstoneData[symbol]) {
            result[symbol] = {
              symbol,
              price: redstoneData[symbol],
              source: "redstone",
              timestamp
            };
          }
        }
        
        console.log(`Got ${Object.keys(result).length} prices from RedStone on-chain`);
      }
      
      // Get prices from Oracle Keeper for any missing tokens
      const missingSymbols = symbols.filter(symbol => !result[symbol]);
      
      if (missingSymbols.length > 0) {
        const response = await fetch(`${this.oracleKeeperUrl}/prices`);
        if (response.ok) {
          const priceData = await response.json() as Record<string, number>;
          
          for (const symbol of missingSymbols) {
            if (priceData[symbol]) {
              result[symbol] = {
                symbol,
                price: priceData[symbol],
                source: "oracle-keeper",
                timestamp
              };
            }
          }
        }
        
        console.log(`Got ${missingSymbols.length - symbols.filter(symbol => !result[symbol]).length} prices from Oracle Keeper`);
      }
      
      // Use fallback prices for any still missing tokens
      const stillMissingSymbols = symbols.filter(symbol => !result[symbol]);
      
      for (const symbol of stillMissingSymbols) {
        const fallbackPrice = WorldChainConfig.defaultPrices[symbol as keyof typeof WorldChainConfig.defaultPrices] || 
                             WorldChainConfig.defaultPrices.DEFAULT;
                             
        result[symbol] = {
          symbol,
          price: fallbackPrice,
          source: "fallback",
          timestamp
        };
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching prices:", error);
      
      // Return fallback prices for all symbols
      for (const symbol of symbols) {
        if (!result[symbol]) {
          const fallbackPrice = WorldChainConfig.defaultPrices[symbol as keyof typeof WorldChainConfig.defaultPrices] || 
                               WorldChainConfig.defaultPrices.DEFAULT;
                               
          result[symbol] = {
            symbol,
            price: fallbackPrice,
            source: "fallback",
            timestamp
          };
        }
      }
      
      return result;
    }
  }
}

// Singleton instance with a function to get it
let integrationInstance: RedstoneOracleIntegration | null = null;

/**
 * Get the RedstoneOracleIntegration instance
 * @param chainId Chain ID 
 * @param provider Ethers provider
 * @param oracleKeeperUrl Optional Oracle Keeper URL
 * @returns The integration instance
 */
export function getRedstoneOracleIntegration(
  chainId: number,
  provider: Provider,
  oracleKeeperUrl?: string
): RedstoneOracleIntegration {
  if (!integrationInstance) {
    integrationInstance = new RedstoneOracleIntegration(chainId, provider, oracleKeeperUrl);
  }
  
  return integrationInstance;
}
