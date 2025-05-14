/**
 * World Chain Swap Box Component
 * Provides a UI for swapping tokens on World Chain
 */

import { ethers } from 'ethers';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { parseUnits } from 'ethers/lib/utils';

import Button from '../../components/Button/Button';
import { DEFAULT_CHAIN_ID } from '../../config/chains';
import { isWorldChain } from '../../config/utilities';
import TokenSelector from '../TokenSelector/TokenSelector';
import { useLocalStorageSerializeKey } from '../../lib/localStorage';
import {
  helperToast,
  formatAmount,
  USD_DECIMALS,
  formatAmountFree,
  parseValue,
  expandDecimals,
  formatTokenAmount,
  trimZeroDecimals,
  getAllTokens
} from '../../lib/legacy';
import { getTokenBySymbol } from '../../config/tokens';
import { IoSwapVertical } from 'react-icons/io5';

// World Chain Trading
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import type {
  SwapParams,
  TradingResult
} from '../../lib/contracts/useWorldChainTrading';

// Styled components
import {
  SwapBoxContainer,
  SwapBoxTitle,
  TokenInputContainer,
  AmountInput,
  SwapButtonContainer,
  FeeContainer,
  SwapStatusContainer,
  SwapFeeInfo,
  SwapIconContainer,
  PriceInfoContainer,
  PriceRow,
  SlippageContainer,
  SlippageInput,
  ErrorContainer
} from './SwapBoxStyles';

// Transaction types
interface TxDetails {
  type: 'SWAP' | 'APPROVAL';
  txHash: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  details?: {
    fromToken?: string;
    toToken?: string;
    amount?: string;
  };
}

const WorldChainSwapBoxNew: React.FC = () => {
  // Token state
  const [fromToken, setFromToken] = useState<string>('WLD');
  const [toToken, setToToken] = useState<string>('USDC');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  
  // UI state
  const [isSwapButtonEnabled, setIsSwapButtonEnabled] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<string>('0.5');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFromTokenApproved, setIsFromTokenApproved] = useState<boolean>(false);
  
  // Transaction state
  const [pendingTxns, setPendingTxns] = useLocalStorageSerializeKey(
    'exchange-pending-txns',
    []
  );
  
  // Format inputs
  const fromTokenInfo = getTokenBySymbol(DEFAULT_CHAIN_ID, fromToken);
  const toTokenInfo = getTokenBySymbol(DEFAULT_CHAIN_ID, toToken);
  
  // Safety checks for token info
  const fromTokenAddress = fromTokenInfo?.address || '';
  const toTokenAddress = toTokenInfo?.address || '';
  const fromTokenDecimals = fromTokenInfo?.decimals || 18;
  const toTokenDecimals = toTokenInfo?.decimals || 18;
  
  // Safe string conversion
  const safeNumberToString = (value: number | undefined, fallback: string = '0'): string => {
    if (value === undefined || value === null || isNaN(value)) return fallback;
    return value.toString();
  };
  
  // Get trading context
  const {
    executeSwap,
    isSwapping,
    swapLastTx,
    swapError,
    prices,
    getTokenPrice,
    isCorrectNetwork,
    switchToWorldChain,
    isLoading
  } = useWorldChainTrading();
  
  // Get connected wallet info
  const userAddress = ""; // To be implemented with useAccount()
  const chainId = DEFAULT_CHAIN_ID;
  
  // Calculate rate
  const fromTokenPrice = getTokenPrice(fromToken, 0);
  const toTokenPrice = getTokenPrice(toToken, 0);
  
  const fromUSDValue = fromTokenPrice && fromAmount 
    ? parseFloat(fromAmount) * fromTokenPrice 
    : 0;
    
  const toUSDValue = toTokenPrice && toAmount 
    ? parseFloat(toAmount) * toTokenPrice 
    : 0;
    
  // Swap direction toggle
  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setToAmount('');
  };
  
  // Approve token (placeholder - real implementation would use contract calls)
  const approveFromToken = async () => {
    try {
      // This would be implemented with actual contract calls in a production environment
      setIsFromTokenApproved(true);
      helperToast.success('Token approved successfully');
    } catch (error) {
      console.error('Token approval failed:', error);
      helperToast.error('Token approval failed');
      setIsFromTokenApproved(false);
    }
  };
  
  // Calculate to amount based on from amount
  useEffect(() => {
    if (!fromAmount || !fromTokenPrice || !toTokenPrice) {
      setToAmount('');
      return;
    }
    
    try {
      const fromValue = parseFloat(fromAmount);
      const fromValueUSD = fromValue * fromTokenPrice;
      const toValue = fromValueUSD / toTokenPrice;
      
      // Apply estimated slippage for display
      const slippagePercent = parseFloat(slippage) / 100;
      const adjustedToValue = toValue * (1 - slippagePercent);
      
      setToAmount(adjustedToValue.toFixed(6));
    } catch (error) {
      console.error('Error calculating swap amounts:', error);
      setToAmount('');
    }
  }, [fromAmount, fromTokenPrice, toTokenPrice, slippage]);
  
  // Validate input and enable/disable swap button
  useEffect(() => {
    setErrorMessage('');
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setIsSwapButtonEnabled(false);
      return;
    }
    
    if (!toAmount || parseFloat(toAmount) <= 0) {
      setIsSwapButtonEnabled(false);
      return;
    }
    
    if (!isCorrectNetwork) {
      setErrorMessage('Please connect to World Chain');
      setIsSwapButtonEnabled(false);
      return;
    }
    
    if (!isFromTokenApproved && fromToken !== 'WLD') {
      // Only require approval for non-native tokens
      setIsSwapButtonEnabled(false);
      return;
    }
    
    setIsSwapButtonEnabled(true);
  }, [fromAmount, toAmount, isCorrectNetwork, isFromTokenApproved, fromToken]);
  
  // Execute the swap
  const handleSwap = async () => {
    if (!isSwapButtonEnabled || !fromAmount || isSwapping) return;
    
    try {
      // Prepare swap parameters
      const swapAmountBN = parseUnits(fromAmount, fromTokenDecimals);
      const swapAmountDecimal = parseFloat(fromAmount);
      
      // Calculate minimum amount out with slippage
      const slippagePercent = parseFloat(slippage) / 100;
      const expectedToAmount = parseFloat(toAmount);
      const minOutAmount = expectedToAmount * (1 - slippagePercent);
      const minOutBN = parseUnits(minOutAmount.toFixed(toTokenDecimals), toTokenDecimals);
      
      // Execute the swap
      const result = await executeSwap({
        path: [fromTokenAddress, toTokenAddress],
        amountIn: swapAmountBN.toBigInt(),
        minOut: minOutBN.toBigInt()
      });
      
      if (result.success && result.hash) {
        // Add to pending transactions
        setPendingTxns((pendingTxns) => [
          ...pendingTxns,
          {
            type: 'SWAP',
            txHash: result.hash,
            status: 'PENDING',
            details: {
              fromToken,
              toToken,
              amount: fromAmount
            }
          }
        ]);
        
        helperToast.success(
          <div>
            Swap submitted!{" "}
            <a href={`https://worldchain.explorer/tx/${result.hash}`} target="_blank" rel="noreferrer">
              View status
            </a>
          </div>
        );
        
        // Reset form after successful swap
        setFromAmount('');
        setToAmount('');
      } else {
        helperToast.error(result.error || 'Swap failed');
      }
    } catch (error) {
      console.error('Swap execution error:', error);
      helperToast.error('Failed to execute swap');
    }
  };
  
  // Render the component
  return (
    <SwapBoxContainer>
      <SwapBoxTitle>Swap Tokens</SwapBoxTitle>
      
      {/* From Token Input */}
      <TokenInputContainer>
        <TokenSelector 
          token={fromToken} 
          onTokenChange={setFromToken} 
          chainId={DEFAULT_CHAIN_ID}
        />
        <AmountInput
          type="number"
          placeholder="0.0"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
          min="0"
        />
        {fromTokenPrice && (
          <div className="usd-value">
            ≈ ${formatAmount(fromUSDValue, USD_DECIMALS, 2, true)}
          </div>
        )}
      </TokenInputContainer>
      
      {/* Swap Direction Toggle */}
      <SwapIconContainer onClick={switchTokens}>
        <IoSwapVertical size={24} />
      </SwapIconContainer>
      
      {/* To Token Input */}
      <TokenInputContainer>
        <TokenSelector 
          token={toToken} 
          onTokenChange={setToToken} 
          chainId={DEFAULT_CHAIN_ID}
        />
        <AmountInput
          type="number"
          placeholder="0.0"
          value={toAmount}
          onChange={(e) => setToAmount(e.target.value)}
          disabled={true}
          min="0"
        />
        {toTokenPrice && (
          <div className="usd-value">
            ≈ ${formatAmount(toUSDValue, USD_DECIMALS, 2, true)}
          </div>
        )}
      </TokenInputContainer>
      
      {/* Price Information */}
      <PriceInfoContainer>
        <PriceRow>
          <span>Rate:</span>
          <span>
            1 {fromToken} = {fromTokenPrice && toTokenPrice 
              ? formatAmount(fromTokenPrice / toTokenPrice, USD_DECIMALS, 6, true) 
              : '...'} {toToken}
          </span>
        </PriceRow>
        
        {/* Slippage Setting */}
        <SlippageContainer>
          <span>Slippage Tolerance:</span>
          <SlippageInput
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            min="0.1"
            max="5"
            step="0.1"
          />
          <span>%</span>
        </SlippageContainer>
      </PriceInfoContainer>
      
      {/* Error Message */}
      {errorMessage && (
        <ErrorContainer>
          {errorMessage}
        </ErrorContainer>
      )}
      
      {/* Action Buttons */}
      <SwapButtonContainer>
        {!isCorrectNetwork ? (
          <Button 
            variant="primary-action" 
            className="w-full" 
            onClick={switchToWorldChain}
          >
            Switch to World Chain
          </Button>
        ) : fromToken !== 'WLD' && !isFromTokenApproved ? (
          <Button 
            variant="primary-action" 
            className="w-full" 
            onClick={approveFromToken}
            disabled={isLoading}
          >
            Approve {fromToken}
          </Button>
        ) : (
          <Button 
            variant="primary-action" 
            className="w-full" 
            onClick={handleSwap}
            disabled={!isSwapButtonEnabled || isSwapping}
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
          </Button>
        )}
      </SwapButtonContainer>
      
      {/* Swap Status */}
      <SwapStatusContainer>
        {isSwapping && (
          <div className="status-message">
            Processing your swap...
          </div>
        )}
      </SwapStatusContainer>
    </SwapBoxContainer>
  );
};

export default WorldChainSwapBoxNew;
