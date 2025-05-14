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
const WorldChainSwapBox = (props: SwapBoxProps) => {
  const chainId = useChainId();
  
  // Default token symbols
  const [
    fromTokenSymbol,
    _setFromTokenSymbol
  ] = useState<string>("WLD");
  const [
    toTokenSymbol,
    _setToTokenSymbol
  ] = useState<string>("USDC");
  const { active, account, signer } = useWallet();
  
  // Create saved state variables if not provided as props
  const savedIsPnlInLeverage = props.savedIsPnlInLeverage || false;
  const setSavedIsPnlInLeverage = props.setSavedIsPnlInLeverage || (() => { /* no-op */ });
  const savedSlippageAmount = props.savedSlippageAmount || 0.5;
  const setSavedSlippageAmount = props.setSavedSlippageAmount || (() => { /* no-op */ });
  const setPendingTxns = props.setPendingTxns || (() => { /* no-op */ });
  
  // Prepare merged token data
  const mergedInfoTokens = props.infoTokens || {};
  const mergedTokensData = props.tokensData || {};
  const { 
    executeSwap, 
    increasePosition, 
    getMinExecutionFee,
    prices 
  } = useWorldChainTrading();
  
  // Create tokenInfo for World Chain tokens to ensure symbol property is available
  const worldChainTokensInfo = useMemo(() => {
    // Use real token addresses from our worldchain tokens file
    const tokensData: any = {
      // Make sure our token addresses are always available
      // Native token (WLD)
      [getWorldChainNativeToken()]: {
        address: getWorldChainNativeToken(),
        symbol: "WLD",
        name: "World",
        decimals: 18,
        isNative: true,
        isShortable: true,
        isStable: false,
        prices: prices?.WLD ? { 
          minPrice: ethers.parseUnits(prices.WLD.toString(), 30),
          maxPrice: ethers.parseUnits(prices.WLD.toString(), 30) 
        } : undefined
      },
      [WORLD_ETH_TOKEN]: {
        address: WORLD_ETH_TOKEN,
        symbol: "WETH",
        name: "Wrapped Ethereum",
        decimals: 18,
        isNative: false,
        isShortable: true,
        isStable: false,
        prices: prices?.WETH ? { 
          minPrice: ethers.parseUnits(prices.WETH.toString(), 30),
          maxPrice: ethers.parseUnits(prices.WETH.toString(), 30) 
        } : undefined
      },
      [WORLD_USDC_TOKEN]: {
        address: WORLD_USDC_TOKEN,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        isNative: false,
        isShortable: false,
        isStable: true,
        prices: { 
          minPrice: ethers.parseUnits("1", 30),
          maxPrice: ethers.parseUnits("1", 30) 
        }
      },
    };
    
    Logger.info("World Chain Tokens Info initialized", Object.keys(tokensData));
    return tokensData;
  }, [prices]);
  
  // State for execution fee
  const [minExecutionFee, setMinExecutionFee] = useState<bigint>(300000000000000n); // Default 0.0003 ETH
  
  // Fetch min execution fee on mount
  useEffect(() => {
    const fetchMinExecutionFee = async () => {
      if (chainId === WORLD) {
        try {
          const fee = await getMinExecutionFee();
          setMinExecutionFee(fee);
          Logger.info(`Min execution fee: ${formatAmount(fee, 18, 6)} ETH`);
        } catch (error) {
          Logger.error('Error getting signatures:', error);
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
      Logger.error("Wallet not connected");
      helperToast.error("Please connect your wallet");
      return;
    }
    
    if (chainId !== WORLD) {
      Logger.error("World Chain not connected");
      helperToast.error("Please connect to World Chain");
      return;
    }
    
    try {
      // Check allowance and approve if needed
      if (tokenIn !== ethers.ZeroAddress) {
        const tokenContract = new ethers.Contract(
          tokenIn,
          ["function allowance(address,address) view returns (uint256)"],
          signer
        );
        
        const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS;
        const allowance = await tokenContract.allowance(account, routerAddress);
        
        if (allowance < amountIn) {
          // Approve token
          await approveTokens({
            tokenAddress: tokenIn,
            spender: routerAddress,
            chainId: WORLD,
            signer,
            setIsApproving: (_isApproving: boolean) => {
              // No-op, we don't need to track approval state here
            },
            onApproveSubmitted: () => {
              helperToast.success("Approval submitted");
            },
            getTokenInfo: undefined,
            infoTokens: undefined,
            pendingTxns: undefined,
            setPendingTxns: undefined,
            includeMessage: true
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
      Logger.error('Swap transaction error:', error);
      helperToast.error("Swap failed");
    }
  }, [active, account, signer, chainId, executeSwap, props]);
  
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
      Logger.error("Wallet not connected");
      helperToast.error("Please connect your wallet");
      return;
    }
    
    if (chainId !== WORLD) {
      Logger.error("World Chain not connected");
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
        
        const positionRouterAddress = import.meta.env.VITE_POSITION_ROUTER_ADDRESS;
        // Safety check for position router address
        if (!positionRouterAddress) {
          Logger.error('Position router address is not defined in environment variables');
          helperToast.error('Missing configuration: Position router address');
          return;
        }
        const allowance = await tokenContract.allowance(account, positionRouterAddress);
        
        if (allowance < amountIn) {
          // Approve token
          await approveTokens({
            tokenAddress: path[0],
            spender: positionRouterAddress,
            chainId: WORLD,
            signer,
            setIsApproving: (_isApproving: boolean) => {
              // No-op, we don't need to track approval state here
            },
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
      Logger.error("IncreasePosition error:", error);
      helperToast.error("Position creation failed");
    }
  }, [active, account, signer, chainId, increasePosition, minExecutionFee, props]);
  
    // Initialize token addresses and info based on the chain
  const [tokenData, setTokenData] = useState({
    fromTokenAddress: '',
    toTokenAddress: '',
    isValid: false
  });

  // Initialize token info
  const [worldChainTokensInfo, setWorldChainTokensInfo] = useState({});

  // Effect to update token addresses when chain or symbols change
  useEffect(() => {
    if (isWorldChain(chainId)) {
      // Create token addresses based on symbols
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
        const tokenInfo = {};
        
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
  
  // Only render the swap box when on World Chain and with valid tokens
  if (isWorldChain(chainId)) {
      // Use token addresses from URL if available
      let fromToken = fromTokenSymbol ? getTokenBySymbol(chainId, fromTokenSymbol) : undefined;
      let toToken = toTokenSymbol ? getTokenBySymbol(chainId, toTokenSymbol) : undefined;

      if (isWorldChain(chainId)) {
        // For World Chain, use World Chain tokens with safe access
        if (fromTokenSymbol) {
          const worldFromToken = WORLD_CHAIN_TOKENS[fromTokenSymbol];
          // Create a safe token with fallback values if needed
          if (worldFromToken) {
            fromToken = {
              ...fromToken,
              ...worldFromToken,
              symbol: getSafeTokenSymbol(worldFromToken, fromTokenSymbol),
              address: getSafeTokenAddress(worldFromToken)
            };
          } else {
            // If token not found, create a safe token placeholder
            console.warn(`Token ${fromTokenSymbol} not found in WORLD_CHAIN_TOKENS, using fallback`);
            fromToken = createSafeToken(
              undefined, // This will use the native token address
              fromTokenSymbol,
              `${fromTokenSymbol} Token`
            );
          }
        }
        
        if (toTokenSymbol) {
          const worldToToken = WORLD_CHAIN_TOKENS[toTokenSymbol];
          if (worldToToken) {
            toToken = {
              ...toToken,
              ...worldToToken,
              symbol: getSafeTokenSymbol(worldToToken, toTokenSymbol),
              address: getSafeTokenAddress(worldToToken)
            };
          } else {
            // If token not found, create a safe token placeholder
            console.warn(`Token ${toTokenSymbol} not found in WORLD_CHAIN_TOKENS, using fallback`);
            toToken = createSafeToken(
              undefined, // This will use the native token address 
              toTokenSymbol,
              `${toTokenSymbol} Token`
            );
          }
        }
      }
      
      return {
        fromTokenAddress: fromToken?.address,
        toTokenAddress: toToken?.address
      };
    }, [chainId, fromTokenSymbol, toTokenSymbol]);
    
    // Additional validation to ensure we have valid addresses
    const validFromAddress = fromTokenAddress && fromTokenAddress !== '0x0000000000000000000000000000000000000000';
    const validToAddress = toTokenAddress && toTokenAddress !== '0x0000000000000000000000000000000000000000';

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
      tokensData: mergedTokensData
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
  if (!isWorldChain(chainId)) {
    return null;
  }
  
  // Inject World Chain specific overrides
  const enhancedProps = {
    ...props,
    worldChainSwap: handleSwap,
    worldChainIncreasePosition: handleIncreasePosition,
    // Inject price data if available
    worldChainPrices: prices,
    infoTokens: mergedInfoTokens,
    tokensData: mergedTokensData,
    // Provide saved state variables
    savedIsPnlInLeverage,
    setSavedIsPnlInLeverage,
    savedSlippageAmount,
    setSavedSlippageAmount,
    setPendingTxns
  };
  
  return <SwapBox {...enhancedProps} />;
};

export default WorldChainSwapBox;
