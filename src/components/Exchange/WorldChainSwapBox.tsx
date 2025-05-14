import { ethers } from 'ethers';
import React, { FC, useState, useCallback, useEffect } from 'react';
import { useChainId, useAccount } from 'wagmi';

import Button from '../../components/Button/Button';
import { WORLD } from '../../config/chains';
import { useTransaction } from '../../context/TransactionContext/TransactionContext';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import { SwapParams } from '../../lib/contracts/useWorldChainTrading';
import { helperToast } from '../../lib/helperToast';
import { Logger } from '../../lib/logger';
import { TxStatus } from '../../lib/transactions/useTransactionMonitor';
import { WLD_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS, WETH_TOKEN_ADDRESS } from '../../lib/worldchain/tokenAddressUtils';
import { getSafeTokenAddress, getSafeTokenSymbol, getSafeTokenDecimals } from '../../lib/worldchain/tokenUtils';

// Constants for World Chain tokens from our tokenAddressUtils
const WORLD_NATIVE_TOKEN = WLD_TOKEN_ADDRESS; // WLD
const WORLD_ETH_TOKEN = WETH_TOKEN_ADDRESS; // WETH on World Chain
const WORLD_USDC_TOKEN = USDC_TOKEN_ADDRESS; // USDC on World Chain

/**
 * Token symbol to address mapping
 * Uses addresses from tokenAddressUtils for production compatibility
 */
const TOKEN_ADDRESS_MAP: Record<string, string> = {
  WLD: WORLD_NATIVE_TOKEN,
  WETH: WORLD_ETH_TOKEN,
  ETH: WORLD_ETH_TOKEN, // ETH mapped to WETH
  USDC: WORLD_USDC_TOKEN
};

/**
 * Token interface with all required properties
 */
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  isShortable?: boolean;
  isStable?: boolean;
  prices?: {
    minPrice: bigint;
    maxPrice: bigint;
  };
}

/**
 * Local internal parameters for swap operations before conversion to contract format
 */
interface LocalSwapParams {
  fromToken: string; // Address of the token to swap from
  toToken: string; // Address of the token to swap to
  amount: bigint;
  slippage: number;
}

/**
 * Helper to convert local swap params to contract format
 */
const convertToContractParams = (params: LocalSwapParams): SwapParams => {
  // Create path array for router
  const path = [params.fromToken, params.toToken];
  
  // Calculate minimum output based on slippage
  const minOut = params.amount - (params.amount * BigInt(Math.floor(params.slippage * 100))) / 10000n;
  
  return {
    path,
    amountIn: params.amount,
    minOut,
    referralCode: ethers.ZeroHash // Default referral code
  };
}

/**
 * Local transaction details interface for our component
 */
interface LocalTransactionDetails {
  hash: string;
  message: string;
}

/**
 * Props interface for the SwapBox component
 */
interface SwapBoxProps {
  savedIsPnlInLeverage?: boolean;
  setSavedIsPnlInLeverage?: (value: boolean) => void;
  savedSlippageAmount?: number;
  setSavedSlippageAmount?: (value: number) => void;
  setPendingTxns?: (txns: Record<string, unknown>[]) => void;
  pendingTxns?: Record<string, unknown>[];
  infoTokens?: Record<string, TokenInfo>;
  tokenData?: Record<string, TokenInfo>;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  setFromTokenAddress?: (address: string) => void;
  setToTokenAddress?: (address: string) => void;
}

/**
 * Convert numbers to strings safely for formatting
 */
const safeNumberToString = (value: number | bigint | string | undefined): string => {
  if (value === undefined) return '0';
  try {
    return value.toString();
  } catch (error) {
    return '0';
  }
};

/**
 * Network Switcher Component
 * Shows a warning card when user is on the wrong network
 */
const NetworkSwitcher: FC<{className?: string; switchToWorldChain: () => void}> = ({ 
  className, 
  switchToWorldChain 
}) => {
  return (
    <div className={`network-error-container ${className || ''}`}>
      <div className="network-error-card">
        <h3>Wrong Network</h3>
        <p>Please connect to World Chain to use this feature</p>
        <Button
          variant="primary"
          onClick={switchToWorldChain}
        >
          Switch to World Chain
        </Button>
      </div>
    </div>
  );
};

/**
 * World Chain Swap Box Component
 * Provides UI for swapping tokens on World Chain
 */
const WorldChainSwapBox: FC<SwapBoxProps> = (props) => {
  const { 
    fromTokenAddress, 
    toTokenAddress, 
    setFromTokenAddress, 
    setToTokenAddress,
    savedSlippageAmount,
    setSavedSlippageAmount,
    setPendingTxns
  } = props;

  // State for the component
  const [fromTokenSymbol, setFromTokenSymbol] = useState<string>('WLD');
  const [toTokenSymbol, setToTokenSymbol] = useState<string>('USDC');
  const [swapAmount, setSwapAmount] = useState<string>('0.01');
  const [slippagePercent, setSlippagePercent] = useState<number>(savedSlippageAmount || 0.5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hook into user's account
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  
  // Get World Chain trading functions
  const { 
    isCorrectNetwork,
    switchToWorldChain,
    executeSwap,
    swapLastTx,
    isSwapping
  } = useWorldChainTrading();

  // Add a transaction to pending transactions
  const { addTransaction } = useTransaction();

  useEffect(() => {
    // Initialize token selections with safe token addresses
    if (setFromTokenAddress) {
      const safeFromAddress = getSafeTokenAddress(null, WORLD_NATIVE_TOKEN);
      setFromTokenAddress(safeFromAddress);
    }
    if (setToTokenAddress) {
      const safeToAddress = getSafeTokenAddress(null, WORLD_USDC_TOKEN);
      setToTokenAddress(safeToAddress);
    }
    
    // Save slippage settings if changed
    if (setSavedSlippageAmount && slippagePercent !== savedSlippageAmount) {
      setSavedSlippageAmount(slippagePercent);
    }
  }, [setFromTokenAddress, setToTokenAddress, setSavedSlippageAmount, slippagePercent, savedSlippageAmount]);

  // Execute swap when the user clicks swap button
  const handleSwap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Make sure user is connected to correct network
      if (!isCorrectNetwork) {
        switchToWorldChain();
        return;
      }
      
      // Get token addresses
      const fromToken = TOKEN_ADDRESS_MAP[fromTokenSymbol];
      // Convert string amount to BigInt with safe token decimals
      let amountBigInt;
      try {
        // Get the correct number of decimals for the token
        const decimals = getSafeTokenDecimals(null, 18);
        amountBigInt = ethers.parseUnits(swapAmount, decimals);
      } catch (e) {
        setError("Invalid amount format.");
        helperToast.error("Invalid amount format.");
        setIsLoading(false);
        return;
      }
      
      // Prepare swap parameters
      const localParams: LocalSwapParams = {
        fromToken: TOKEN_ADDRESS_MAP[fromTokenSymbol],
        toToken: TOKEN_ADDRESS_MAP[toTokenSymbol],
        amount: amountBigInt,
        slippage: slippagePercent
      };
      
      // Convert to contract format
      const contractParams = convertToContractParams(localParams);
      
      // Execute the swap
      const result = await executeSwap(contractParams);

      if (result.success && result.hash) {
        // Show success toast
        helperToast.success("Swap executed! Transaction: " + result.hash.slice(0, 8) + "...");
        
        // Add to pending transactions
        if (setPendingTxns) {
          // Create transaction details for UI display
          const txDetails: Record<string, unknown> = {
            hash: result.hash,
            message: `Swap ${getSafeTokenSymbol(null, fromTokenSymbol)} → ${getSafeTokenSymbol(null, toTokenSymbol)}`
          };
          
          // Update pending transactions in parent component
          setPendingTxns([...(props.pendingTxns || []), txDetails]);
        }
        
        // Add transaction to context
        addTransaction({
          hash: result.hash,
          // Additional fields that match TxDetails interface
          status: TxStatus.MINING,
          metadata: {
            fromToken: fromTokenSymbol,
            toToken: toTokenSymbol,
            amount: swapAmount,
            addedTime: Date.now()
          }
        });
        
        helperToast.success(
          `Swap initiated! ${swapAmount} ${fromTokenSymbol} to ${toTokenSymbol}`
        );
      } else if (result.error) {
        // Show error toast with better error handling
        const errorMessage = result.error instanceof Error ? 
          result.error.message : 
          String(result.error);
          
        helperToast.error(errorMessage);
        setError(errorMessage);
        
        // Log detailed error for debugging
        Logger.error("Swap failed with error:", result.error);
      } else {
        // Fallback error message
        helperToast.error("Swap failed due to unknown error");
        setError("Swap failed due to unknown error");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error('Swap error:', error.message);
      setError(`Swap failed: ${error.message}`);
      helperToast.error(`Swap failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    fromTokenSymbol, 
    toTokenSymbol, 
    swapAmount, 
    slippagePercent, 
    executeSwap, 
    isCorrectNetwork, 
    switchToWorldChain,
    setPendingTxns,
    addTransaction,
  ]);

  // If not on World Chain, display the network switcher
  if (!isCorrectNetwork) {
    return <NetworkSwitcher switchToWorldChain={switchToWorldChain} />;
  }

  return (
    <div className="WorldChainSwapBox">
      <div className="WorldChainSwapBox-content">
        <h3>Swap on World Chain</h3>
        
        {/* From Token Selection */}
        <div className="swap-form-group">
          <label>From</label>
          <select 
            value={fromTokenSymbol}
            onChange={(e) => setFromTokenSymbol(e.target.value)}
          >
            <option value="WLD">WLD</option>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
          </select>
          
          <div className="amount-input">
            <input
              type="number"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              placeholder="0.0"
              min="0"
            />
          </div>
        </div>
        
        {/* Swap Direction Indicator */}
        <div className="swap-direction">
          <span>↓</span>
        </div>
        
        {/* To Token Selection */}
        <div className="swap-form-group">
          <label>To</label>
          <select 
            value={toTokenSymbol}
            onChange={(e) => setToTokenSymbol(e.target.value)}
          >
            <option value="USDC">USDC</option>
            <option value="WLD">WLD</option>
            <option value="ETH">ETH</option>
          </select>
          
          <div className="swap-estimate">
            <span>Estimated receipt:</span>
          </div>
        </div>
        
        {/* Slippage Settings */}
        <div className="slippage-settings">
          <label>Slippage Tolerance: {slippagePercent}%</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={slippagePercent}
            onChange={(e) => setSlippagePercent(parseFloat(e.target.value))}
          />
        </div>
        
        {/* Error Display */}
        {error && <div className="swap-error">{error}</div>}
        
        {/* Wallet Connection Status */}
        {!isCorrectNetwork && (
          <div className="wallet-warning">
            <p>Please connect to World Chain to swap tokens</p>
          </div>
        )}
        
        {/* Swap Button */}
        <Button
          variant="primary"
          onClick={handleSwap}
          disabled={isLoading || isSwapping || !isCorrectNetwork}
          className="swap-button"
        >
          {!isCorrectNetwork ? 'Connect to World Chain' : isLoading || isSwapping ? 'Swapping...' : 'Swap'}
        </Button>
      </div>
    </div>
  );
};

export default WorldChainSwapBox;

/**
 * Helper to check token existence safely
 * @param tokenAddress Token address to check
 * @returns True if the token address exists
 */
function isValidTokenAddress(tokenAddress?: string): boolean {
  return tokenAddress !== undefined && 
         tokenAddress !== null && 
         tokenAddress.length >= 40 && 
         tokenAddress.startsWith('0x');
}
