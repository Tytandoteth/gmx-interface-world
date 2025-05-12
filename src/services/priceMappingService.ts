import { fetchOracleKeeperPrices } from './oracleKeeperService';

// Mapping between real tokens and test tokens
export const TOKEN_PRICE_MAPPING: Record<string, { source: string; scale: number }> = {
  'TUSD': { source: 'WLD', scale: 1 },     // TUSD price = WLD price
  'TBTC': { source: 'WETH', scale: 12 },   // TBTC price = WETH price * 12
  'TETH': { source: 'WETH', scale: 1 }     // TETH price = WETH price
};

export interface MappedPrices {
  real: Record<string, number>;      // Real prices from price feed (WLD, WETH, MAG)
  test: Record<string, number>;      // Mapped prices (TUSD, TBTC, TETH)
  timestamp: string;
  source: string;                    // Source of the price data (CoinGecko, etc.)
}

/**
 * Maps Oracle Keeper price data to test tokens
 * This creates a realistic test environment with prices that move according to real market conditions
 * @returns Promise with original and mapped price data
 */
export const mapOracleKeeperPrices = async (): Promise<MappedPrices> => {
  // Fetch data from Oracle Keeper (could be from CoinGecko or any other source)
  const oracleData = await fetchOracleKeeperPrices();
  const realPrices = oracleData.prices;
  const testPrices: Record<string, number> = {};
  
  // Map real token prices to test tokens based on defined mapping
  Object.entries(TOKEN_PRICE_MAPPING).forEach(([testToken, mapping]) => {
    const { source, scale } = mapping;
    
    if (realPrices[source]) {
      testPrices[testToken] = realPrices[source] * scale;
    } else {
      // Use fallback values if source prices aren't available
      if (testToken === 'TUSD') testPrices[testToken] = 1.0;
      if (testToken === 'TBTC') testPrices[testToken] = 30000.0;
      if (testToken === 'TETH') testPrices[testToken] = 2500.0;
    }
  });
  
  return {
    real: realPrices,
    test: testPrices,
    timestamp: oracleData.timestamp,
    source: oracleData.source
  };
};

/**
 * Gets the equivalent test token for a real token
 * @param realToken The real token symbol (e.g., 'WLD', 'WETH')
 * @returns The corresponding test token symbol, or undefined if no mapping exists
 */
export const getTestTokenForRealToken = (realToken: string): string | undefined => {
  for (const [testToken, mapping] of Object.entries(TOKEN_PRICE_MAPPING)) {
    if (mapping.source === realToken) {
      return testToken;
    }
  }
  return undefined;
};

/**
 * Gets the equivalent real token for a test token
 * @param testToken The test token symbol (e.g., 'TUSD', 'TBTC')
 * @returns The corresponding real token symbol, or undefined if no mapping exists
 */
export const getRealTokenForTestToken = (testToken: string): string | undefined => {
  return TOKEN_PRICE_MAPPING[testToken]?.source;
};

/**
 * Updates the token price mapping configuration
 * @param newMapping New token mapping configuration
 */
export const updateTokenPriceMapping = (newMapping: Record<string, { source: string; scale: number }>): void => {
  // In a real implementation, this would update the mapping, for now we just log
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('Token price mapping would be updated to:', newMapping);
  }
};
