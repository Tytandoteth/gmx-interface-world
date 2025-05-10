/**
 * Special handling for World Chain multicall errors
 * This module provides fallback data for common multicall failures
 */

import { BigNumberish, ethers } from "ethers";
import { WORLD } from "sdk/configs/chains";
import { isWorldChain } from "./worldChainDevMode";
import { bigNumberify } from "lib/numbers";

// Map of mock data for different contract calls
interface MulticallMockData {
  [key: string]: any;
}

/**
 * Mock data for different types of multicall calls
 * Organized by function/hook name
 */
const MULTICALL_MOCK_DATA: MulticallMockData = {
  // Default gas limits for different operations
  useGasLimitsConfig: {
    depositGasLimit: 400000n,
    withdrawalGasLimit: 500000n,
    singleSwapGasLimit: 700000n,
    increaseOrderGasLimit: 800000n,
    decreaseOrderGasLimit: 800000n,
    swapOrderGasLimit: 800000n,
    swapGasLimit: 500000n,
    unstakingGasLimit: 300000n
  },
  
  // Position constants
  usePositionsConstants: {
    minCollateralUsd: 10n * 10n ** 30n, // $10 min collateral
    minPositionSizeUsd: 1n * 10n ** 30n, // $1 min position size
    maxLeverage: 100, // 100x max leverage
    maxLeverageBps: 10000, // 10000 bps = 100x
    maxGlobalLongSizes: {}, // Empty map for now
    maxGlobalShortSizes: {} // Empty map for now
  },
  
  // UI fee factor
  uiFeeFactorForAccount: {
    borrowingFactorPerSecondForLongs: 1n * 10n ** 10n, // very small number
    borrowingFactorPerSecondForShorts: 1n * 10n ** 10n, // very small number
    borrowingExponentFactorForLongs: 1n,
    borrowingExponentFactorForShorts: 1n,
    fundingFactor: 1n * 10n ** 14n, // 0.0001 in 18 decimals
    fundingExponentFactor: 1n,
    fundingIncreaseFactorPerSecond: 0n,
    fundingDecreaseFactorPerSecond: 0n,
    maxFundingFactor: 1n * 10n ** 15n, // 0.001 in 18 decimals
    minFundingFactor: 0n,
    thresholdForStableFunding: 0n,
    thresholdForDecreaseFunding: 0n
  },
  
  // Block timestamp (current time)
  useBlockTimestamp: {
    timestamp: Math.floor(Date.now() / 1000)
  }
};

/**
 * Check if this is a multicall request for World Chain that we should handle
 */
export function shouldHandleMulticallError(chainId: number, errorInfo: any): boolean {
  return isWorldChain(chainId) && errorInfo?.message?.includes("Multicall request failed");
}

/**
 * Get mock data for a specific multicall function
 * @param functionName The name of the function or hook (e.g., "useGasLimitsConfig")
 * @returns Mock data for the specified function, or null if not available
 */
export function getMulticallMockData<T>(functionName: string): T | null {
  return (MULTICALL_MOCK_DATA[functionName] as T) || null;
}

/**
 * Intercept and handle multicall errors for World Chain
 * This sets up global hooks to catch and suppress multicall errors
 */
export function initWorldChainMulticallHandler(): void {
  // Store the original console.error
  const originalConsoleError = console.error;
  
  // Override console.error to intercept multicall errors
  console.error = function(...args: any[]): void {
    // Check if this is a multicall error and we're on World Chain
    const isMulticallError = 
      args.length > 0 && 
      typeof args[0] === 'string' && 
      args[0].includes('Multicall request failed');
    
    // Check if we should handle this error
    if (isMulticallError && (window as any).currentChainId === WORLD) {
      // Get the function name from the error message
      const functionName = args[1] && typeof args[1] === 'object' ? Object.keys(args[1])[0] : null;
      
      // Log a more helpful message for development
      console.debug(
        `[World Chain Dev] Intercepted multicall error for: ${functionName || 'unknown function'}. ` +
        `Mock data ${functionName && MULTICALL_MOCK_DATA[functionName] ? 'is' : 'is not'} available.`
      );
      
      // Don't display the original error to reduce console noise
      return;
    }
    
    // For other errors, use the original console.error
    originalConsoleError.apply(console, args);
  };
  
  console.log("World Chain multicall error handler initialized");
}
