/**
 * Test tokens configuration for GMX on World Chain
 * These tokens map to real-world prices from the Oracle Keeper
 */
export const TEST_TOKENS: Record<string, TestToken> = {
  TUSD: {
    address: "0xc1f17FB5db2A71617840eCe29c241997448f6720",
    symbol: "TUSD",
    name: "Test USD",
    decimals: 18,
    isStable: true,
    isShortable: false,
    priceSource: "WLD",
    imageUrl: "/icons/tusd.svg"
  },
  TBTC: {
    address: "0x9cdee0fb64c18d3af7C8cB30Aada5f7fe90aF553",
    symbol: "TBTC",
    name: "Test Bitcoin",
    decimals: 8,
    isStable: false,
    isShortable: true,
    priceSource: "WETH",
    priceScale: 12,
    imageUrl: "/icons/tbtc.svg"
  },
  TETH: {
    address: "0xE9298442418B800105b86953db930659e5b13058",
    symbol: "TETH",
    name: "Test Ethereum",
    decimals: 18,
    isStable: false,
    isShortable: true,
    priceSource: "WETH",
    imageUrl: "/icons/teth.svg"
  }
};

/**
 * Test token type definition
 */
export interface TestToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isStable: boolean;
  isShortable: boolean;
  priceSource: string;
  priceScale?: number;
  imageUrl: string;
}

/**
 * Core contract addresses for the test environment
 */
export const TEST_CONTRACTS = {
  Vault: "0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5",
  Router: "0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b",
  PositionRouter: "0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF",
  PositionManager: "0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D",
  OrderBook: "0x8179D468fF072B8A9203A293a37ef70EdCA850fc",
  SimplePriceFeed: "0xa19F571B0B00A36028Ce47721AFa1395Bb581E5d"
};

/**
 * Check if test mode is active based on environment variables
 */
export const isTestMode = (): boolean => {
  return import.meta.env.VITE_USE_TEST_TOKENS === "true";
};

/**
 * Get contract address for a given contract name
 * @param name Contract name
 * @returns Contract address
 */
export const getTestContractAddress = (name: keyof typeof TEST_CONTRACTS): string => {
  return TEST_CONTRACTS[name];
};
