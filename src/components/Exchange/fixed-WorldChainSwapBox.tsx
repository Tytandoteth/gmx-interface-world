/**
 * World Chain Swap Box
 * Higher-order component that connects the SwapBox to World Chain contracts
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useChainId } from 'wagmi';

// Config imports
import { WORLD } from '../../config/chains';
import { getTokenBySymbol } from '../../config/tokens';

// Domain imports
import { approveTokens } from '../../domain/tokens';

// Utility imports
import { formatAmount } from '../../lib/numbers';
import useWallet from '../../lib/wallets/useWallet';
import { Logger } from '../../lib/logger';
import { helperToast } from '../../lib/helperToast';

// World Chain specific imports
import { 
  WORLD_ETH_TOKEN, 
  WORLD_USDC_TOKEN, 
  getWorldChainNativeToken,
  isWorldChain 
} from '../../lib/worldchain';
import { getSafeTokenSymbol, getSafeTokenAddress, createSafeToken } from '../../lib/worldchain/tokenUtils';
import { WORLD_CHAIN_TOKENS } from '../../lib/worldchain/worldChainTokens';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';

// Components
import SwapBox from '../Synthetics/SwapBox/SwapBox';
import './WorldChainSwapBox.css';

/**
 * Interface for SwapBox props
 */
interface SwapBoxProps {
  setPendingTxns: (txns: any[]) => void;
  pendingTxns: any[];
  savedSlippageAmount: number;
  infoTokens: any;
  openSettings: () => void;
  positionsMap: any;
  pendingPositions: any;
  setPendingPositions: (positions: any) => void;
  flagOrdersEnabled: boolean;
  tokensData: any;
  usdgSupply: any;
  totalTokenWeights: any;
  savedIsPnlInLeverage: boolean;
  savedShowPnlAfterFees: boolean;
  allowedSlippage: number;
  nativeTokenAddress: string;
  setFromTokenAddress?: (swapOption: string, address: string) => void;
  setToTokenAddress?: (swapOption: string, address: string) => void;
  setSwapOption?: (option: string) => void;
  onSelectWalletToken?: (token: any) => void;
  onSelectShortTokenAddress?: (address: string) => void;
}

const WorldChainSwapBox: React.FC<SwapBoxProps> = (props) => {
  const chainId = useChainId();
  
  // Default token symbols
  const [fromTokenSymbol, _setFromTokenSymbol] = useState<string>('WLD');
  const [toTokenSymbol, _setToTokenSymbol] = useState<string>('USDC');
  const { active, account, signer } = useWallet();
  
  // Create saved state variables if not provided as props
  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useState(props.savedIsPnlInLeverage || false);
  const [savedSlippageAmount, setSavedSlippageAmount] = useState(props.savedSlippageAmount || 0.5);
  const [pendingTxns, setPendingTxns] = useState(props.pendingTxns || []);
  
  // Token prices and trading functions
  const { 
    prices, 
    executeSwap, 
    increasePosition, 
    getMinExecutionFee 
  } = useWorldChainTrading();
  
  // Token data and addresses
  const [tokenData, setTokenData] = useState({
    fromTokenAddress: '',
    toTokenAddress: '',
    isValid: false
  });
  
  // Initialize token data
  const [worldChainTokensInfo, setWorldChainTokensInfo] = useState<Record<string, any>>({});
  
  // Execution fee
  const [minExecutionFee, setMinExecutionFee] = useState(ethers.BigNumber.from(0));

  // Update pending transactions
  useEffect(() => {
    if (props.pendingTxns) {
      setPendingTxns(props.pendingTxns);
    }
  }, [props.pendingTxns]);
  
  // Fetch min execution fee
  useEffect(() => {
    const fetchExecutionFee = async () => {
      if (active && signer && isWorldChain(chainId)) {
        try {
          const fee = await getMinExecutionFee();
          setMinExecutionFee(fee);
          Logger.info(`Min execution fee: ${formatAmount(fee, 18, 6)} ETH`);
        } catch (error) {
          Logger.error('Error getting min execution fee:', error);
        }
      }
    };
    
    fetchExecutionFee();
  }, [active, signer, chainId, getMinExecutionFee]);
  
  // Update token addresses based on symbols
  useEffect(() => {
    if (isWorldChain(chainId)) {
      try {
        // Use token addresses from URL if available
        let fromToken = fromTokenSymbol ? getTokenBySymbol(chainId, fromTokenSymbol) : undefined;
        let toToken = toTokenSymbol ? getTokenBySymbol(chainId, toTokenSymbol) : undefined;
        
        // Fallback to defaults if tokens not found
        if (!fromToken) {
          fromToken = getTokenBySymbol(chainId, 'WLD');
        }
        
        if (!toToken) {
          toToken = getTokenBySymbol(chainId, 'USDC');
        }
        
        // Get safe addresses
        const fromAddress = getSafeTokenAddress(fromToken);
        const toAddress = getSafeTokenAddress(toToken);
        
        // Build token info
        const tokenInfo: Record<string, any> = {};
        
        if (fromToken) {
          tokenInfo[fromAddress] = createSafeToken(fromToken);
        }
        
        if (toToken) {
          tokenInfo[toAddress] = createSafeToken(toToken);
        }
        
        // Add Native token
        const nativeToken = getWorldChainNativeToken(chainId);
        if (nativeToken) {
          const nativeAddress = getSafeTokenAddress(nativeToken);
          tokenInfo[nativeAddress] = createSafeToken(nativeToken);
        }
        
        // Validate
        const validFromAddress = fromAddress && fromAddress !== '0x0000000000000000000000000000000000000000';
        const validToAddress = toAddress && toAddress !== '0x0000000000000000000000000000000000000000';
        
        // Update state
        setTokenData({
          fromTokenAddress: fromAddress,
          toTokenAddress: toAddress,
          isValid: validFromAddress && validToAddress
        });
        
        setWorldChainTokensInfo(tokenInfo);
      } catch (error) {
        Logger.error('Error setting up token addresses', error);
        setTokenData({
          fromTokenAddress: '',
          toTokenAddress: '',
          isValid: false
        });
      }
    }
  }, [chainId, fromTokenSymbol, toTokenSymbol]);
  
  // Handle World Chain swap
  const handleSwap = useCallback(async (swapData: any) => {
    if (!active || !account || !signer) {
      helperToast.error("Wallet not connected");
      return { success: false, error: new Error("Wallet not connected") };
    }
    
    try {
      const { fromToken, toToken, fromAmount, toAmount, slippage } = swapData;
      
      Logger.info("World Chain Swap", {
        fromToken: getSafeTokenSymbol(fromToken),
        toToken: getSafeTokenSymbol(toToken),
        fromAmount,
        toAmount,
        slippage
      });
      
      // Call approveTokens before executing swap
      await approveTokens({
        token: fromToken,
        account,
        spender: WORLD_CHAIN_TOKENS.contracts.router,
        signer,
        amount: fromAmount,
        chainId,
      });
      
      // Execute the swap
      const result = await executeSwap({
        fromToken,
        toToken,
        amount: fromAmount,
        slippage
      });
      
      if (result.success) {
        helperToast.success("Swap successful");
        return result;
      } else {
        helperToast.error(`Swap failed: ${result.error?.message}`);
      }
    } catch (error) {
      Logger.error('Swap transaction error:', error);
      helperToast.error("Swap failed");
    }
  }, [active, account, signer, chainId, executeSwap]);
  
  // Handle position increase
  const handleIncreasePosition = useCallback(async (positionData: any) => {
    if (!active || !account || !signer) {
      helperToast.error("Wallet not connected");
      return { success: false, error: new Error("Wallet not connected") };
    }
    
    try {
      const { 
        fromToken, 
        toToken, 
        fromAmount, 
        leverage,
        isLong,
        slippage 
      } = positionData;
      
      Logger.info("World Chain Increase Position", {
        fromToken: getSafeTokenSymbol(fromToken),
        toToken: getSafeTokenSymbol(toToken),
        fromAmount,
        leverage,
        isLong,
        slippage
      });
      
      // Call approveTokens before executing increase position
      await approveTokens({
        token: fromToken,
        account,
        spender: WORLD_CHAIN_TOKENS.contracts.router,
        signer,
        amount: fromAmount,
        chainId,
      });
      
      // Execute the increase position
      const result = await increasePosition({
        collateralToken: fromToken,
        indexToken: toToken,
        amount: fromAmount,
        leverage,
        isLong,
        slippage,
        executionFee: minExecutionFee
      });
      
      if (result.success) {
        helperToast.success("Position increased successfully");
        return result;
      } else {
        helperToast.error(`Failed to increase position: ${result.error?.message}`);
      }
    } catch (error) {
      Logger.error('Position error:', error);
      helperToast.error("Failed to increase position");
    }
  }, [active, account, signer, chainId, increasePosition, minExecutionFee]);
  
  // Only render the swap box when on World Chain
  if (isWorldChain(chainId)) {
    // If invalid tokens, show error
    if (!tokenData.isValid) {
      Logger.warn('Invalid token addresses detected in WorldChainSwapBox', {
        fromTokenAddress: tokenData.fromTokenAddress,
        toTokenAddress: tokenData.toTokenAddress
      });
      return (
        <div className="Exchange-swap-box-wrapper World-chain-swap-box error">
          <div className="swap-error-message">
            Unable to load tokens. Please check network connection and refresh.
          </div>
        </div>
      );
    }

    // Merge our token data with existing token data to ensure symbols are available
    const mergedTokensData = { ...worldChainTokensInfo, ...props.tokensData };
    const mergedInfoTokens = { ...worldChainTokensInfo, ...props.infoTokens };
    
    // Inject our implementations into the original SwapBox
    const enhancedProps = {
      ...props,
      // Inject min execution fee
      minExecutionFee,
      // Inject World Chain specific overrides
      worldChainSwap: handleSwap,
      worldChainIncreasePosition: handleIncreasePosition,
      // Inject price data if available
      worldChainPrices: prices,
      infoTokens: mergedInfoTokens,
      tokensData: mergedTokensData,
      // Use our state for these
      savedIsPnlInLeverage,
      setSavedIsPnlInLeverage,
      savedSlippageAmount,
      setSavedSlippageAmount,
      setPendingTxns
    };
    
    return (
      <div className="Exchange-swap-box-wrapper World-chain-swap-box">
        <SwapBox
          chainId={chainId}
          fromTokenAddress={tokenData.fromTokenAddress}
          toTokenAddress={tokenData.toTokenAddress}
          {...enhancedProps}
        />
      </div>
    );
  }

  // If not on World Chain, return null
  return null;
};

export default WorldChainSwapBox;
