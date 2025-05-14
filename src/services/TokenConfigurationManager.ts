/**
 * TokenConfigurationManager
 * 
 * A centralized manager for token configuration across the application.
 * This integrates token addresses, prices, and metadata in a standardized way.
 */

import { ethers } from 'ethers';
import { Logger } from 'lib/logger';
import { isProductionEnvironment } from 'lib/worldchain/environmentUtils';
import { getSafeTokenSymbol, getSafeTokenDecimals } from 'lib/worldchain/tokenUtils';
import { TokenType, getTokenAddressSafe, getAllTokenAddresses } from './TokenAddressService';
import { tokenPriceManager } from './TokenPriceService';

// Token metadata
export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isNative?: boolean;
  isStable?: boolean;
  isShortable?: boolean;
  isTradable?: boolean;
}

// Token configuration
export interface TokenConfig extends TokenMetadata {
  priceUsd?: number;
  balance?: ethers.BigNumber;
  allowance?: ethers.BigNumber;
}

// Global token settings
interface TokenSettings {
  defaultGasToken: TokenType;
  defaultStablecoin: TokenType;
  tradableTokens: TokenType[];
  lpTokens: TokenType[];
}

// Default settings
const DEFAULT_TOKEN_SETTINGS: TokenSettings = {
  defaultGasToken: TokenType.WLD,
  defaultStablecoin: TokenType.USDC,
  tradableTokens: [TokenType.WLD, TokenType.ETH, TokenType.USDC, TokenType.MAG],
  lpTokens: [TokenType.WLD_USDC_LP, TokenType.ETH_USDC_LP]
};

// Token metadata map
const TOKEN_METADATA: Record<TokenType, Partial<TokenMetadata>> = {
  [TokenType.WLD]: {
    name: 'World Token',
    symbol: 'WLD',
    decimals: 18,
    isNative: true,
    isShortable: false,
    isTradable: true,
    logoURI: '/tokens/wld.png'
  },
  [TokenType.ETH]: {
    name: 'Wrapped Ethereum',
    symbol: 'WETH',
    decimals: 18,
    isNative: false,
    isShortable: true,
    isTradable: true,
    logoURI: '/tokens/weth.png'
  },
  [TokenType.USDC]: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    isNative: false,
    isStable: true,
    isShortable: false,
    isTradable: true,
    logoURI: '/tokens/usdc.png'
  },
  [TokenType.MAG]: {
    name: 'Magnetite',
    symbol: 'MAG',
    decimals: 18,
    isNative: false,
    isShortable: false,
    isTradable: true,
    logoURI: '/tokens/mag.png'
  },
  [TokenType.WLD_USDC_LP]: {
    name: 'WLD-USDC LP',
    symbol: 'WLD-USDC',
    decimals: 18,
    isTradable: false,
    logoURI: '/tokens/wld-usdc.png'
  },
  [TokenType.ETH_USDC_LP]: {
    name: 'ETH-USDC LP',
    symbol: 'ETH-USDC',
    decimals: 18,
    isTradable: false,
    logoURI: '/tokens/eth-usdc.png'
  }
};

/**
 * Singleton manager for token configuration
 */
class TokenConfigurationManager {
  private static instance: TokenConfigurationManager;
  private tokenConfigs: Map<string, TokenConfig> = new Map();
  private settings: TokenSettings;
  private initialized: boolean = false;
  
  private constructor() {
    this.settings = { ...DEFAULT_TOKEN_SETTINGS };
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenConfigurationManager {
    if (!TokenConfigurationManager.instance) {
      TokenConfigurationManager.instance = new TokenConfigurationManager();
    }
    return TokenConfigurationManager.instance;
  }
  
  /**
   * Initialize the token configuration
   * Should be called at app startup
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }
    
    // Get all token addresses
    const tokenAddresses = getAllTokenAddresses();
    
    // Create token configurations
    for (const [tokenType, address] of Object.entries(tokenAddresses)) {
      const metadata = TOKEN_METADATA[tokenType as TokenType] || {};
      const symbol = getSafeTokenSymbol(null, tokenType);
      const decimals = getSafeTokenDecimals(null, metadata.decimals || 18);
      
      // Create token config with metadata and address
      const tokenConfig: TokenConfig = {
        address,
        symbol,
        name: metadata.name || symbol,
        decimals,
        ...metadata
      };
      
      // Add price data if available
      const price = tokenPriceManager.getPrice(symbol);
      if (price !== undefined) {
        tokenConfig.priceUsd = price;
      }
      
      // Add to tokens map
      this.tokenConfigs.set(tokenType, tokenConfig);
      this.tokenConfigs.set(address.toLowerCase(), tokenConfig); // Also index by address
    }
    
    this.initialized = true;
    
    if (!isProductionEnvironment()) {
      Logger.info(`TokenConfigurationManager initialized with ${this.tokenConfigs.size / 2} tokens`);
    }
  }
  
  /**
   * Update prices for all tokens
   * @param prices Record of token symbols to prices
   */
  public updatePrices(prices: Record<string, number>): void {
    // First update price manager
    tokenPriceManager.updatePrices(prices);
    
    // Then update token configs
    for (const [symbol, price] of Object.entries(prices)) {
      // Find token configs for this symbol
      for (const [key, config] of this.tokenConfigs.entries()) {
        if (config.symbol === symbol) {
          config.priceUsd = price;
        }
      }
    }
  }
  
  /**
   * Update token balances
   * @param balances Record of token addresses to balances
   */
  public updateBalances(balances: Record<string, ethers.BigNumber>): void {
    for (const [address, balance] of Object.entries(balances)) {
      const lowerAddress = address.toLowerCase();
      const tokenConfig = this.tokenConfigs.get(lowerAddress);
      
      if (tokenConfig) {
        tokenConfig.balance = balance;
      }
    }
  }
  
  /**
   * Update token allowances
   * @param spender Address allowed to spend tokens
   * @param allowances Record of token addresses to allowance amounts
   */
  public updateAllowances(spender: string, allowances: Record<string, ethers.BigNumber>): void {
    for (const [address, allowance] of Object.entries(allowances)) {
      const lowerAddress = address.toLowerCase();
      const tokenConfig = this.tokenConfigs.get(lowerAddress);
      
      if (tokenConfig) {
        tokenConfig.allowance = allowance;
      }
    }
  }
  
  /**
   * Get token configuration by token type
   * @param tokenType TokenType enum value
   * @returns Token configuration or undefined
   */
  public getTokenByType(tokenType: TokenType | string): TokenConfig | undefined {
    return this.tokenConfigs.get(tokenType);
  }
  
  /**
   * Get token configuration by address
   * @param address Token address
   * @returns Token configuration or undefined
   */
  public getTokenByAddress(address: string): TokenConfig | undefined {
    if (!address) return undefined;
    
    return this.tokenConfigs.get(address.toLowerCase());
  }
  
  /**
   * Get all tokens as an array
   * @param onlyTradable Only include tradable tokens
   * @returns Array of token configurations
   */
  public getAllTokens(onlyTradable = false): TokenConfig[] {
    const tokenSet = new Set<TokenConfig>();
    
    // Collect unique token configs
    for (const config of this.tokenConfigs.values()) {
      if (!onlyTradable || config.isTradable) {
        tokenSet.add(config);
      }
    }
    
    return Array.from(tokenSet);
  }
  
  /**
   * Get tradable tokens
   * @returns Array of tradable token configurations
   */
  public getTradableTokens(): TokenConfig[] {
    return this.settings.tradableTokens
      .map(tokenType => this.getTokenByType(tokenType))
      .filter(token => token !== undefined) as TokenConfig[];
  }
  
  /**
   * Get the default gas token
   * @returns Gas token configuration
   */
  public getDefaultGasToken(): TokenConfig | undefined {
    return this.getTokenByType(this.settings.defaultGasToken);
  }
  
  /**
   * Get the default stablecoin
   * @returns Stablecoin token configuration
   */
  public getDefaultStablecoin(): TokenConfig | undefined {
    return this.getTokenByType(this.settings.defaultStablecoin);
  }
  
  /**
   * Create a safe token object compatible with the app's token format
   * @param tokenType Token type or address
   * @returns Token object or undefined if not found
   */
  public createSafeToken(tokenType: TokenType | string): any {
    const config = typeof tokenType === 'string' && ethers.utils.isAddress(tokenType) 
      ? this.getTokenByAddress(tokenType)
      : this.getTokenByType(tokenType);
      
    if (!config) {
      return undefined;
    }
    
    return {
      address: config.address,
      symbol: config.symbol,
      name: config.name,
      decimals: config.decimals,
      priceUsd: config.priceUsd,
      isNative: config.isNative,
      isStable: config.isStable
    };
  }
}

// Export singleton instance
export const tokenManager = TokenConfigurationManager.getInstance();

/**
 * Initialize tokens at application startup
 * Call this once at the root of your application
 */
export function initializeTokens(): void {
  tokenManager.initialize();
}

/**
 * Get a token by type with safe fallback
 * @param tokenType Token type or address
 * @returns Token configuration or undefined
 */
export function getToken(tokenType: TokenType | string): TokenConfig | undefined {
  const manager = TokenConfigurationManager.getInstance();
  
  if (typeof tokenType === 'string' && ethers.utils.isAddress(tokenType)) {
    return manager.getTokenByAddress(tokenType);
  }
  
  return manager.getTokenByType(tokenType);
}

/**
 * Get a token's price in USD
 * @param tokenType Token type or address
 * @param fallback Fallback price if not available
 * @returns Token price or fallback/undefined
 */
export function getTokenPrice(tokenType: TokenType | string, fallback?: number): number | undefined {
  const token = getToken(tokenType);
  if (!token) return fallback;
  
  return token.priceUsd !== undefined ? token.priceUsd : fallback;
}
