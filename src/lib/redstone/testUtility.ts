/**
 * RedStone Testing Utilities
 * 
 * This module provides utilities for testing the RedStone integration
 * in both development and production modes.
 */

import { ethers } from 'ethers';
import { getWorldChainConfig, shouldUseProductionMode } from 'lib/worldchain/worldChainProduction';
import { WORLD } from 'sdk/configs/chains';

// Default test tokens for validation
const TEST_TOKENS = ['WLD', 'ETH', 'BTC', 'USDC', 'USDT', 'MAG'];

interface PriceTestResult {
  token: string;
  mockPrice: number | null;
  livePrice: number | null;
  source: 'mock' | 'redstone' | 'none';
  status: 'success' | 'error';
  error?: string;
}

interface IntegrationTestResult {
  mode: 'development' | 'production';
  timestamp: number;
  isWorldChain: boolean;
  oracleKeeperStatus: 'active' | 'error' | 'loading';
  contractsStatus: 'active' | 'error' | 'loading';
  priceFeeds: PriceTestResult[];
  overallStatus: 'success' | 'partial' | 'failure';
}

/**
 * Tests the Oracle Keeper connection
 * @param url Oracle Keeper URL to test
 * @returns Promise resolving to a boolean indicating success
 */
export async function testOracleKeeperConnection(
  url: string = getWorldChainConfig().oracleKeeperUrl
): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Oracle Keeper connection test failed:', error);
    return false;
  }
}

/**
 * Tests the connection to a RedStone price feed contract
 * @param signer Ethers signer to use for contract interaction
 * @param chainId Current chain ID
 * @returns Promise resolving to a boolean indicating success
 */
export async function testPriceFeedContract(
  signer: ethers.Signer | null,
  chainId: number
): Promise<boolean> {
  if (!signer || chainId !== WORLD) {
    return false;
  }
  
  try {
    const config = getWorldChainConfig();
    const contractAddress = config.redstone?.priceFeedAddress;
    
    if (!contractAddress) {
      throw new Error('Price feed contract address not configured');
    }
    
    // Basic contract validation - we're just checking if it exists
    const code = await signer.provider?.getCode(contractAddress);
    return code !== '0x';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Price feed contract test failed:', error);
    return false;
  }
}

/**
 * Runs a comprehensive test of the current integration mode
 * @param signer Ethers signer to use for contract interaction
 * @param chainId Current chain ID
 * @param customTokens Optional array of tokens to test
 * @returns Promise resolving to test results
 */
export async function testIntegration(
  signer: ethers.Signer | null,
  chainId: number,
  priceGetter: (token: string) => Promise<number | null>,
  mockPrices: Record<string, number> | null,
  customTokens?: string[]
): Promise<IntegrationTestResult> {
  const tokens = customTokens || TEST_TOKENS;
  const isProduction = shouldUseProductionMode();
  const isWorldChain = chainId === WORLD;
  
  // Test Oracle Keeper connection
  const oracleStatus = await testOracleKeeperConnection();
  
  // Test contract connection if in production mode
  const contractStatus = isProduction ? 
    await testPriceFeedContract(signer, chainId) : 
    false;
  
  // Test price feeds for each token
  const priceResults: PriceTestResult[] = [];
  
  for (const token of tokens) {
    try {
      // Get live price from contracts (if in production mode)
      let livePrice: number | null = null;
      if (isProduction && isWorldChain) {
        livePrice = await priceGetter(token);
      }
      
      // Get mock price
      const mockPrice = mockPrices ? mockPrices[token] || null : null;
      
      // Determine which source was used
      const source = livePrice !== null ? 
        'redstone' : 
        mockPrice !== null ? 
          'mock' : 
          'none';
      
      priceResults.push({
        token,
        mockPrice,
        livePrice,
        source,
        status: (livePrice !== null || mockPrice !== null) ? 'success' : 'error',
      });
    } catch (error) {
      priceResults.push({
        token,
        mockPrice: null,
        livePrice: null,
        source: 'none',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Calculate overall status
  const successCount = priceResults.filter(r => r.status === 'success').length;
  const overallStatus = successCount === tokens.length ? 
    'success' : 
    successCount > 0 ? 
      'partial' : 
      'failure';
  
  return {
    mode: isProduction ? 'production' : 'development',
    timestamp: Date.now(),
    isWorldChain,
    oracleKeeperStatus: oracleStatus ? 'active' : 'error',
    contractsStatus: contractStatus ? 'active' : isProduction ? 'error' : 'loading',
    priceFeeds: priceResults,
    overallStatus,
  };
}

/**
 * Validates whether the current configuration is ready for production
 * @returns Object containing validation results and any issues found
 */
export function validateProductionReadiness(): {
  ready: boolean;
  issues: string[];
} {
  const config = getWorldChainConfig();
  const issues: string[] = [];
  
  // Check RedStone configuration
  if (!config.redstone?.enabled) {
    issues.push('RedStone integration is not enabled in production config');
  }
  
  if (!config.redstone?.priceFeedAddress) {
    issues.push('RedStone price feed contract address is not configured');
  }
  
  // Check contract addresses
  if (!config.contracts?.vault) {
    issues.push('Vault contract address is not configured');
  }
  
  if (!config.contracts?.router) {
    issues.push('Router contract address is not configured');
  }
  
  if (!config.contracts?.positionRouter) {
    issues.push('Position Router contract address is not configured');
  }
  
  // Check Oracle Keeper URL
  if (!config.oracleKeeperUrl) {
    issues.push('Oracle Keeper URL is not configured');
  }
  
  // Check tokens
  if (!config.tokens?.WLD) {
    issues.push('WLD token address is not configured');
  }
  
  if (!config.tokens?.ETH) {
    issues.push('ETH token address is not configured');
  }
  
  // Check markets
  if (!config.markets?.WLD_USDC?.marketTokenAddress) {
    issues.push('WLD-USDC market token address is not configured');
  }
  
  if (!config.markets?.ETH_USDC?.marketTokenAddress) {
    issues.push('ETH-USDC market token address is not configured');
  }
  
  return {
    ready: issues.length === 0,
    issues,
  };
}
