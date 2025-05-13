/**
 * World Chain Swap Box
 * Higher-order component that connects the SwapBox to World Chain contracts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import { Logger } from '../../lib/logger';
import { useChainId } from '../../lib/chains';
import { WORLD } from '../../config/chains';
import { useTokensAllowanceData } from '../../domain/synthetics/tokens/useTokenAllowanceData';
import { approveTokens } from '../../domain/tokens';
import { formatAmount } from '../../lib/numbers';
import useWallet from '../../lib/wallets/useWallet';
import { helperToast } from '../../lib/helperToast';

// Import the original SwapBox component
// @ts-ignore - JSX vs TSX file extension difference
import SwapBox from './SwapBox';

const logger = new Logger('WorldChainSwapBox');

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
  setFromTokenAddress: (swapOption: string, address: string) => void;
  setToTokenAddress: (swapOption: string, address: string) => void;
  setSwapOption: (option: string) => void;
  onSelectWalletToken: (token: any) => void;
  onSelectShortTokenAddress: (address: string) => void;
  [key: string]: any;
}

/**
 * World Chain version of the SwapBox component
 * Adds World Chain specific contract interactions
 */
const WorldChainSwapBox: React.FC<SwapBoxProps> = (props) => {
  const { chainId } = useChainId();
  const { active, account, signer } = useWallet();
  const { 
    executeSwap, 
    increasePosition, 
    getMinExecutionFee,
    prices 
  } = useWorldChainTrading();
  
  // State for execution fee
  const [minExecutionFee, setMinExecutionFee] = useState<bigint>(300000000000000n); // Default 0.0003 ETH
  
  // Fetch min execution fee on mount
  useEffect(() => {
    const fetchMinExecutionFee = async () => {
      if (chainId === WORLD) {
        try {
          const fee = await getMinExecutionFee();
          setMinExecutionFee(fee);
          logger.info(`Min execution fee: ${formatAmount(fee, 18, 6)} ETH`);
        } catch (error) {
          logger.error("Error fetching min execution fee:", error);
        }
      }
    };
    
    fetchMinExecutionFee();
  }, [chainId, getMinExecutionFee]);
  
  /**
   * Override swap function with World Chain implementation
   */
  const handleSwap = useCallback(async (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    minAmountOut: bigint
  ) => {
    if (!active || !account || !signer) {
      helperToast.error("Wallet not connected");
      return;
    }
    
    if (chainId !== WORLD) {
      helperToast.error("Please connect to World Chain");
      return;
    }
    
    try {
      // Check allowance and approve if needed
      const tokenAddress = tokenIn === ethers.ZeroAddress ? tokenIn : tokenIn;
      if (tokenIn !== ethers.ZeroAddress) {
        const tokenContract = new ethers.Contract(
          tokenIn,
          ["function allowance(address,address) view returns (uint256)"],
          signer
        );
        
        const routerAddress = process.env.VITE_ROUTER_ADDRESS;
        const allowance = await tokenContract.allowance(account, routerAddress);
        
        if (allowance < amountIn) {
          // Approve token
          await approveTokens({
            tokenAddresses: [tokenIn],
            spenderAddress: routerAddress,
            chainId: WORLD,
            provider: signer.provider as ethers.Provider,
            signer,
            onApproveSubmitted: () => {
              helperToast.success("Approval submitted");
            }
          });
        }
      }
      
      // Create path array
      const path = [tokenIn, tokenOut];
      
      // Execute swap
      const result = await executeSwap({
        path,
        amountIn,
        minOut: minAmountOut
      });
      
      if (result.success) {
        helperToast.success("Swap executed successfully");
        
        // Update pending transactions
        props.setPendingTxns([
          ...props.pendingTxns, 
          {
            hash: result.hash,
            message: `Swap ${formatAmount(amountIn, 18, 4)} → ${tokenOut}`
          }
        ]);
      } else {
        helperToast.error(`Swap failed: ${result.error?.message}`);
      }
    } catch (error) {
      logger.error("Swap error:", error);
      helperToast.error("Swap failed");
    }
  }, [active, account, signer, chainId, executeSwap, props.setPendingTxns]);
  
  /**
   * Override increasePosition function with World Chain implementation
   */
  const handleIncreasePosition = useCallback(async (
    path: string[],
    indexToken: string,
    amountIn: bigint,
    minOut: bigint,
    sizeDelta: bigint,
    isLong: boolean,
    acceptablePrice: bigint
  ) => {
    if (!active || !account || !signer) {
      helperToast.error("Wallet not connected");
      return;
    }
    
    if (chainId !== WORLD) {
      helperToast.error("Please connect to World Chain");
      return;
    }
    
    try {
      // For non-ETH path[0], check allowance and approve if needed
      if (path[0] !== ethers.ZeroAddress) {
        const tokenContract = new ethers.Contract(
          path[0],
          ["function allowance(address,address) view returns (uint256)"],
          signer
        );
        
        const positionRouterAddress = process.env.VITE_POSITION_ROUTER_ADDRESS;
        const allowance = await tokenContract.allowance(account, positionRouterAddress);
        
        if (allowance < amountIn) {
          // Approve token
          await approveTokens({
            tokenAddresses: [path[0]],
            spenderAddress: positionRouterAddress,
            chainId: WORLD,
            provider: signer.provider as ethers.Provider,
            signer,
            onApproveSubmitted: () => {
              helperToast.success("Approval submitted");
            }
          });
        }
      }
      
      // Execute position increase
      const result = await increasePosition({
        path,
        indexToken,
        amountIn,
        minOut,
        sizeDelta,
        isLong,
        acceptablePrice,
        executionFee: minExecutionFee
      });
      
      if (result.success) {
        const positionType = isLong ? "Long" : "Short";
        helperToast.success(`${positionType} position submitted`);
        
        // Update pending transactions
        props.setPendingTxns([
          ...props.pendingTxns, 
          {
            hash: result.hash,
            message: `${positionType} ${formatAmount(sizeDelta, 30, 2)} USD`
          }
        ]);
      } else {
        helperToast.error(`Position failed: ${result.error?.message}`);
      }
    } catch (error) {
      logger.error("IncreasePosition error:", error);
      helperToast.error("Position creation failed");
    }
  }, [active, account, signer, chainId, increasePosition, minExecutionFee, props.setPendingTxns]);
  
  // Inject our implementations into the original SwapBox
  const enhancedProps = {
    ...props,
    // Inject min execution fee
    minExecutionFee,
    // Inject World Chain specific overrides
    worldChainSwap: handleSwap,
    worldChainIncreasePosition: handleIncreasePosition,
    // Inject price data if available
    worldChainPrices: prices
  };
  
  return <SwapBox {...enhancedProps} />;
};

export default WorldChainSwapBox;
