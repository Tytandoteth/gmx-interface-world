import { Provider } from "@ethersproject/providers";

// Import the OracleKeeperFetcher class to access Oracle Keeper features
import { OracleKeeperFetcher } from "../oracleKeeperFetcher/oracleKeeperFetcher";

/**
 * Price data with source information
 */
export interface PriceData {
  price: number;
  timestamp: number;
  source: "oracle-keeper" | "fallback";
  lastUpdated: number;
}

/**
 * DEPRECATED: Originally integrated Witnet on-chain data with Oracle Keeper off-chain data
 * Now forwards all price requests to CoinGecko via the Oracle Keeper
 * Maintained for backward compatibility
 */
export class WitnetOracleIntegration {
  private chainId: number;
  private provider: Provider;
  private oracleKeeperUrl: string;
  
  /**
   * Constructor
   * @param chainId Chain ID
   * @param provider Ethers provider
   * @param oracleKeeperUrl URL for Oracle Keeper API
   */
  constructor(chainId: number, provider: Provider, oracleKeeperUrl: string) {
    this.chainId = chainId;
    this.provider = provider;
    this.oracleKeeperUrl = oracleKeeperUrl;
  }
  
  /**
   * Get a price for a specific token
   * @param symbol Token symbol
   * @returns Price data or null if not available
   */
  async getPrice(symbol: string): Promise<PriceData | null> {
    const prices = await this.getPrices([symbol]);
    return prices[symbol] || null;
  }
  
  /**
   * Get prices for specified symbols
   * @param symbols Token symbols to get prices for
   * @returns Map of token prices
   */
  async getPrices(_symbols: string[] = []): Promise<Record<string, PriceData>> {
    const now = Date.now();
    const result: Record<string, PriceData> = {};

    try {
      // Create Oracle Keeper fetcher instance
      const fetcher = new OracleKeeperFetcher({
        chainId: this.chainId,
        oracleKeeperIndex: 0,
        forceIncentivesActive: false
      });

      // Get prices from Oracle Keeper (CoinGecko)
      const directPricesResponse = await fetcher.fetchDirectPrices();

      if (directPricesResponse && directPricesResponse.prices) {
        // Transform Oracle Keeper data to PriceData format
        Object.entries(directPricesResponse.prices).forEach(([tokenSymbol, price]) => {
          if (typeof price === 'number') {
            result[tokenSymbol] = {
              price,
              timestamp: directPricesResponse.timestamp || now,
              source: 'oracle-keeper',
              lastUpdated: now
            };
          }
        });

        if (Object.keys(result).length > 0) {
          return result;
        }
      }
    } catch (error) {
      console.warn("Error fetching prices from Oracle Keeper with CoinGecko:", error);
    }
    
    // Fallback to mock prices if Oracle Keeper fails
    return this.getMockPrices();
  }
  
  /**
   * Get mock prices for development and testing
   * @returns Mock price data
   */
  private getMockPrices(): Record<string, PriceData> {
    const now = Date.now();
    
    // Define mock prices for common tokens
    const mockPrices: Record<string, number> = {
      WLD: 1.25,
      WETH: 3000.00,
      MAG: 2.50,
      // Add more tokens as needed
      USDC: 1.00,
      BTC: 45000.00
    };
    
    const result: Record<string, PriceData> = {};
    
    // Convert to PriceData format
    Object.entries(mockPrices).forEach(([symbol, price]) => {
      result[symbol] = {
        price,
        timestamp: now,
        source: "fallback",
        lastUpdated: now
      };
    });
    
    return result;
  }
}

// Singleton instance for the integration
let integrationInstance: WitnetOracleIntegration | null = null;

/**
 * Get the WitnetOracleIntegration instance
 * @param chainId Chain ID
 * @param provider Ethers provider
 * @param oracleKeeperUrl URL for Oracle Keeper API
 * @returns WitnetOracleIntegration instance
 */
export function getWitnetOracleIntegration(
  chainId: number,
  provider: Provider,
  oracleKeeperUrl: string
): WitnetOracleIntegration {
  if (!integrationInstance) {
    integrationInstance = new WitnetOracleIntegration(chainId, provider, oracleKeeperUrl);
  }
  
  return integrationInstance;
}
