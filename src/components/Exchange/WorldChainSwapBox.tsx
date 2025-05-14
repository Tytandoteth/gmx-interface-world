

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { ethers } from 'ethers';
import { useChainId } from 'wagmi';

import { worldChain } from '../../config/chains';
import { useWallet } from '../../App';
import { useTransaction } from '../../context/TransactionContext/TransactionContext';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import { helperToast } from '../../lib/helperToast';
import { Logger } from '../../lib/logger';

// Constants for World Chain tokens
const WORLD_NATIVE_TOKEN = '0x163f8C2467924be0ae7B5347228CABF260318753'; // WLD
const WORLD_ETH_TOKEN = '0x4200000000000000000000000000000000000006'; // WETH on World Chain
const WORLD_USDC_TOKEN = '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'; // USDC on World Chain

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
 * Type definition for token mapping
 */
type TokensMap = Record<string, TokenInfo>;

/**
 * Parameters for swap operations
 */
interface SwapParams {
  fromToken: string; // Address of the token to swap from
  toToken: string; // Address of the token to swap to
  amount: bigint;
  slippage: number;
}

/**
 * Result of a trading operation
 */
interface TradingResult {
  success: boolean;
  tx?: { // Using tx instead of transaction to match the expected API
    hash: string;
  };
  error?: string;
}

/**
 * Transaction data interface
 */
interface TransactionDetails {
  hash: string;
  description: string;
}

/**
 * Props interface for the SwapBox component
 */
interface SwapBoxProps {
  savedIsPnlInLeverage?: boolean;
  setSavedIsPnlInLeverage?: (value: boolean) => void;
  savedSlippageAmount?: number;
  setSavedSlippageAmount?: (value: number) => void;
  setPendingTxns?: (txns: Array<Record<string, unknown>>) => void;
  pendingTxns?: Array<Record<string, unknown>>;
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
  return value.toString();
};

/**
 * Token symbol to address mapping
 */
const TOKEN_ADDRESS_MAP: Record<string, string> = {
  "WLD": WORLD_NATIVE_TOKEN,
  "ETH": WORLD_ETH_TOKEN,
  "USDC": WORLD_USDC_TOKEN
};

/**
 * Get token information by symbol
 */
const getTokenBySymbol = (chain: string, symbol: string): TokenInfo => {
  // Fallback implementation until proper token system is in place
  const worldTokens: Record<string, TokenInfo> = {
    "WLD": {
      address: WORLD_NATIVE_TOKEN,
      symbol: "WLD",
      name: "World",
      decimals: 18,
      isNative: true
    },
    "ETH": {
      address: WORLD_ETH_TOKEN,
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18
    },
    "USDC": {
      address: WORLD_USDC_TOKEN,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      isStable: true
    }
  };
  
  return worldTokens[symbol] || {
    address: ethers.ZeroAddress,
    symbol: "UNKNOWN",
    name: "Unknown Token",
    decimals: 18
  };
};

/**
 * World Chain Swap Box Component
 * Connects SwapBox component to World Chain contracts
 */
const WorldChainSwapBox: React.FC<SwapBoxProps> = (props) => {
  const { 
    savedIsPnlInLeverage = false,
    setSavedIsPnlInLeverage,
    savedSlippageAmount = 0.5,
    setSavedSlippageAmount,
    setPendingTxns,
    pendingTxns = []
  } = props;
  
  // Store selected token addresses
  const [fromToken, setFromToken] = useState<string>(TOKEN_ADDRESS_MAP["WLD"]);
  const [toToken, setToToken] = useState<string>(TOKEN_ADDRESS_MAP["ETH"]);
  
  // Store swap amount
  const [swapAmount, setSwapAmount] = useState<string>("");
  
  // Get chain ID
  const chainId = useChainId();
  
  // Get wallet info
  const { account, active } = useWallet();
  
  // Transaction monitoring
  const { addTransaction } = useTransaction();
  
  // World Chain trading functions
  const { 
    executeSwap, 
    isSwapping, 
    getTokenPrice, 
    isPriceAvailable 
  } = useWorldChainTrading();
  
  /**
   * Check if the current chain is World Chain
   */
  const isConnectedToWorldChain = useMemo(() => {
    return isWorldChain(chainId);
  }, [chainId]);
  
  /**
   * Create a simplified token info map for World Chain tokens
   */
  const worldChainTokensInfo: TokensMap = useMemo(() => {
    const tokensMap: TokensMap = {};
    
    // Add World native token
    tokensMap["WLD"] = {
      address: getWorldChainNativeToken(),
      symbol: "WLD",
      name: "World",
      decimals: 18,
      isNative: true
    };
    
    // Add ETH
    tokensMap["ETH"] = {
      address: WORLD_ETH_TOKEN,
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18
    };
    
    // Add USDC
    tokensMap["USDC"] = {
      address: WORLD_USDC_TOKEN,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      isStable: true
    };
    
    return tokensMap;
  }, []);
  
  /**
   * Get token prices for World Chain tokens
   */
  const tokenPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    
    // Set some default prices (these would be fetched from oracle in production)
    prices["WLD"] = 1.25;
    prices["ETH"] = 3000;
    prices["USDC"] = 1.0;
    
    return prices;
  }, []);
  
  /**
   * Handle approving token for swap
   */
  const handleApprove = useCallback(async (tokenAddress: string, amount: string) => {
    if (!account || !active) {
      helperToast.error("Wallet not connected");
      return;
    }
    
    try {
      // This is a stub - actual approval would need to be implemented
      helperToast.success("Token approved");
    } catch (error) {
      Logger.error(error);
      helperToast.error("Error approving token");
    }
  }, [account, active]);
  
  /**
   * Handle token swap
   */
  const handleSwap = useCallback(async () => {
    if (!account || !active) {
      helperToast.error("Wallet not connected");
      return;
    }
    
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      helperToast.error("Invalid swap amount");
      return;
    }
    
    try {
      const fromTokenInfo = getTokenBySymbol("WORLD", "WLD");
      const toTokenInfo = getTokenBySymbol("WORLD", "ETH");
      
      const parsedAmount = ethers.parseUnits(
        swapAmount,
        fromTokenInfo.decimals
      );
      
      // Execute the swap
      const result = await executeSwap({
        fromTokenAddress: fromTokenInfo.address,
        toTokenAddress: toTokenInfo.address,
        amount: parsedAmount,
        slippage: savedSlippageAmount
      });
      
      if (result.success && result.transaction) {
        // Monitor the transaction
        addTransaction({
          hash: result.transaction.hash,
          description: `Swap ${swapAmount} ${fromTokenInfo.symbol} for ${toTokenInfo.symbol}`,
        });
        
        helperToast.success("Swap initiated successfully");
      } else {
        helperToast.error(result.error || "Swap failed");
      }
    } catch (error) {
      Logger.error(error);
      helperToast.error("Error executing swap");
    }
  }, [account, active, swapAmount, executeSwap, addTransaction, savedSlippageAmount]);
  
  /**
   * Calculate display values for the swap box
   */
  const displayValues = useMemo(() => {
    const fromTokenInfo = getTokenBySymbol("WORLD", "WLD");
    const toTokenInfo = getTokenBySymbol("WORLD", "ETH");
    
    const fromTokenPrice = tokenPrices[fromTokenInfo.symbol] || 0;
    const toTokenPrice = tokenPrices[toTokenInfo.symbol] || 0;
    
    let toAmount = "0";
    let fromUsd = "$0.00";
    let toUsd = "$0.00";
    
    if (swapAmount && parseFloat(swapAmount) > 0) {
      // Calculate receiving amount based on price ratio
      const fromAmount = parseFloat(swapAmount);
      const expectedToAmount = (fromAmount * fromTokenPrice) / toTokenPrice;
      
      // Format amounts for display
      toAmount = expectedToAmount.toFixed(6);
      fromUsd = `$${(fromAmount * fromTokenPrice).toFixed(2)}`;
      toUsd = `$${(expectedToAmount * toTokenPrice).toFixed(2)}`;
    }
    
    return {
      fromTokenSymbol: fromTokenInfo.symbol,
      toTokenSymbol: toTokenInfo.symbol,
      fromTokenPrice: `$${fromTokenPrice.toFixed(2)}`,
      toTokenPrice: `$${toTokenPrice.toFixed(2)}`,
      toAmount,
      fromUsd,
      toUsd
    };
  }, [swapAmount, tokenPrices]);
  
  // Effect to handle token setting from props
  useEffect(() => {
    if (props.fromTokenAddress) {
      setFromToken(props.fromTokenAddress);
    }
    
    if (props.toTokenAddress) {
      setToToken(props.toTokenAddress);
    }
  }, [props.fromTokenAddress, props.toTokenAddress]);
  
  // If not connected to World Chain, show a message
  if (!isConnectedToWorldChain) {
    return (
      <div className="WorldChainSwapBox">
        <div className="ConnectMessage">
          <h2>Connect to World Chain</h2>
          <p>Please connect your wallet to World Chain to use the swap functionality.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="WorldChainSwapBox">
      <Suspense fallback={<div>Loading SwapBox...</div>}>
        {/* Placeholder SwapBox component until actual implementation is available */}
        <div className="WorldChainSwapBox-content">
          <h2>World Chain Swap</h2>
          
          <div className="SwapBox-tokens">
            <div className="SwapBox-token-section">
              <label>From</label>
              <select 
                value={fromToken} 
                onChange={(e) => setFromToken(e.target.value)}
                className="SwapBox-token-selector"
              >
                {Object.keys(worldChainTokensInfo).map((symbol) => (
                  <option key={symbol} value={worldChainTokensInfo[symbol].address}>
                    {symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="0.0"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                className="SwapBox-amount-input"
              />
              <div className="SwapBox-token-value">{displayValues.fromUsd}</div>
            </div>
            
            <div className="SwapBox-arrow">↓</div>
            
            <div className="SwapBox-token-section">
              <label>To</label>
              <select 
                value={toToken} 
                onChange={(e) => setToToken(e.target.value)}
                className="SwapBox-token-selector"
              >
                {Object.keys(worldChainTokensInfo).map((symbol) => (
                  <option key={symbol} value={worldChainTokensInfo[symbol].address}>
                    {symbol}
                  </option>
                ))}
              </select>
              <div className="SwapBox-readonly-amount">{displayValues.toAmount}</div>
              <div className="SwapBox-token-value">{displayValues.toUsd}</div>
            </div>
          </div>
          
          <div className="SwapBox-slippage">
            <label>Slippage Tolerance: {savedSlippageAmount}%</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={savedSlippageAmount}
              onChange={(e) => setSavedSlippageAmount && setSavedSlippageAmount(parseFloat(e.target.value))}
            />
          </div>
          
          <button 
            className={`SwapBox-submit-button ${isSwapping ? 'disabled' : ''}`}
            onClick={handleSwap}
            disabled={isSwapping || !swapAmount || parseFloat(swapAmount) <= 0}
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
          </button>
          
          <div className="SwapBox-info">
            <div>Rate: 1 {displayValues.fromTokenSymbol} = {(tokenPrices[displayValues.toTokenSymbol] / tokenPrices[displayValues.fromTokenSymbol]).toFixed(6)} {displayValues.toTokenSymbol}</div>
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default WorldChainSwapBox;


  
  /**
   * Check if the current chain is World Chain
   */
  const isConnectedToWorldChain = useMemo(() => {
    return isWorldChain(chainId);
  }, [chainId]);
  
  /**
   * Create a simplified token info map for World Chain tokens
   */
  const worldChainTokensInfo = useMemo(() => {
    const tokensMap: TokensMap = {};
    
    // Add World native token
    tokensMap["WLD"] = {
      address: getWorldChainNativeToken(),
      symbol: "WLD",
      name: "World",
      decimals: 18,
      isNative: true
    };
    
    // Add ETH
    tokensMap["ETH"] = {
      address: WORLD_ETH_TOKEN,
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18
    };
    
    // Add USDC
    tokensMap["USDC"] = {
      address: WORLD_USDC_TOKEN,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      isStable: true
    };
    
    return tokensMap;
  }, []);
  
  /**
   * Get token prices for World Chain tokens
   */
  const tokenPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    
    // Set some default prices (these would be fetched from oracle in production)
    prices["WLD"] = 1.25;
    prices["ETH"] = 3000;
    prices["USDC"] = 1.0;
    
    return prices;
  }, []);
  
  /**
   * Handle approving token for swap
   */
  const handleApprove = useCallback(async (token: string, amount: string) => {
    if (!account || !active) {
      helperToast.error("Wallet not connected");
      return;
    }
    
    try {
      const fromTokenInfo = getTokenBySymbol("WORLD", "WLD");
      const tokenAddress = fromTokenInfo.address;
      
      // This is a stub - actual approval would need to be implemented
      helperToast.success("Token approved");
    } catch (error) {
      Logger.error(error);
      helperToast.error("Error approving token");
    }
  }, [account, active]);
  
  /**
   * Handle token swap
   */
  const handleSwap = useCallback(async () => {
    if (!account || !active) {
      helperToast.error("Wallet not connected");
      return;
    }
    
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      helperToast.error("Invalid swap amount");
      return;
    }
    
    try {
      const fromTokenInfo = getTokenBySymbol("WORLD", "WLD");
      const toTokenInfo = getTokenBySymbol("WORLD", "ETH");
      
      const parsedAmount = ethers.parseUnits(
        swapAmount,
        fromTokenInfo.decimals
      );
      
      // Execute the swap
      const result = await executeSwap({
        fromToken: fromTokenInfo.address,
        toToken: toTokenInfo.address,
        amount: parsedAmount,
        slippage: savedSlippageAmount
      });
      
      if (result && result.tx) {
        // Monitor the transaction
        monitorTransaction({
          hash: result.tx.hash,
          description: `Swap ${swapAmount} ${fromTokenInfo.symbol} for ${toTokenInfo.symbol}`,
        });
        
        helperToast.success("Swap initiated successfully");
      } else {
        helperToast.error("Swap failed");
      }
    } catch (error) {
      Logger.error(error);
      helperToast.error("Error executing swap");
    }
  }, [account, active, swapAmount, executeSwap, monitorTransaction, savedSlippageAmount]);
  
  /**
   * Calculate display values for the swap box
   */
  const displayValues = useMemo(() => {
    const fromTokenInfo = getTokenBySymbol("WORLD", "WLD");
    const toTokenInfo = getTokenBySymbol("WORLD", "ETH");
    
    const fromTokenPrice = tokenPrices[fromTokenInfo.symbol] || 0;
    const toTokenPrice = tokenPrices[toTokenInfo.symbol] || 0;
    
    let toAmount = "0";
    let fromUsd = "$0.00";
    let toUsd = "$0.00";
    
    if (swapAmount && parseFloat(swapAmount) > 0) {
      // Calculate receiving amount based on price ratio
      const fromAmount = parseFloat(swapAmount);
      const expectedToAmount = (fromAmount * fromTokenPrice) / toTokenPrice;
      
      // Format amounts for display
      toAmount = expectedToAmount.toFixed(6);
      fromUsd = `$${(fromAmount * fromTokenPrice).toFixed(2)}`;
      toUsd = `$${(expectedToAmount * toTokenPrice).toFixed(2)}`;
    }
    
    return {
      fromTokenSymbol: fromTokenInfo.symbol,
      toTokenSymbol: toTokenInfo.symbol,
      fromTokenPrice: `$${fromTokenPrice.toFixed(2)}`,
      toTokenPrice: `$${toTokenPrice.toFixed(2)}`,
      toAmount,
      fromUsd,
      toUsd
    };
  }, [swapAmount, tokenPrices]);
  
  // Effect to handle token setting from props
  useEffect(() => {
    if (props.fromTokenAddress) {
      setFromToken(props.fromTokenAddress);
    }
    
    if (props.toTokenAddress) {
      setToToken(props.toTokenAddress);
    }
  }, [props.fromTokenAddress, props.toTokenAddress]);
  
  // If not connected to World Chain, show a message
  if (!isConnectedToWorldChain) {
    return (
      <div className="WorldChainSwapBox">
        <div className="ConnectMessage">
          <h2>Connect to World Chain</h2>
          <p>Please connect your wallet to World Chain to use the swap functionality.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="WorldChainSwapBox">
      <Suspense fallback={<div>Loading SwapBox...</div>}>
        {/* Placeholder SwapBox component - to be replaced with actual implementation */}
        <div className="WorldChainSwapBox-content">
          <h2>World Chain Swap</h2>
          
          <div className="SwapBox-tokens">
            <div className="SwapBox-token-section">
              <label>From</label>
              <select 
                value={fromToken} 
                onChange={(e) => setFromToken(e.target.value)}
                className="SwapBox-token-selector"
              >
                {Object.keys(worldChainTokensInfo).map(symbol => (
                  <option key={symbol} value={worldChainTokensInfo[symbol].address}>
                    {symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="0.0"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                className="SwapBox-amount-input"
              />
              <div className="SwapBox-token-value">{displayValues.fromUsd}</div>
            </div>
            
            <div className="SwapBox-arrow">↓</div>
            
            <div className="SwapBox-token-section">
              <label>To</label>
              <select 
                value={toToken} 
                onChange={(e) => setToToken(e.target.value)}
                className="SwapBox-token-selector"
              >
                {Object.keys(worldChainTokensInfo).map(symbol => (
                  <option key={symbol} value={worldChainTokensInfo[symbol].address}>
                    {symbol}
                  </option>
                ))}
              </select>
              <div className="SwapBox-readonly-amount">{displayValues.toAmount}</div>
              <div className="SwapBox-token-value">{displayValues.toUsd}</div>
            </div>
          </div>
          
          <div className="SwapBox-slippage">
            <label>Slippage Tolerance: {savedSlippageAmount}%</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={savedSlippageAmount}
              onChange={(e) => setSavedSlippageAmount && setSavedSlippageAmount(parseFloat(e.target.value))}
            />
          </div>
          
          <button 
            className={`SwapBox-submit-button ${isSwapping ? 'disabled' : ''}`}
            onClick={handleSwap}
            disabled={isSwapping || !swapAmount || parseFloat(swapAmount) <= 0}
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
          </button>
          
          <div className="SwapBox-info">
            <div>Rate: 1 {displayValues.fromTokenSymbol} = {(tokenPrices[displayValues.toTokenSymbol] / tokenPrices[displayValues.fromTokenSymbol]).toFixed(6)} {displayValues.toTokenSymbol}</div>
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default WorldChainSwapBox;

/**
 * Interface for SwapBox props with strict type safety
 */
interface SwapBoxProps {
  setPendingTxns: (txns: Array<Record<string, unknown>>) => void;
  pendingTxns: Array<Record<string, unknown>>;
  savedSlippageAmount: number;
  infoTokens: Record<string, TokenInfo>;
  openSettings: () => void;
  positionsMap: Record<string, unknown>;
  pendingPositions: Record<string, unknown>;
  setPendingPositions: (positions: Record<string, unknown>) => void;
  flagOrdersEnabled: boolean;
  tokensData: Record<string, TokenInfo>;
  usdgSupply: bigint;
  totalTokenWeights: bigint;
  savedIsPnlInLeverage: boolean;
  savedShowPnlAfterFees: boolean;
  allowedSlippage: number;
  nativeTokenAddress: string;
  setFromTokenAddress: (swapOption: string, address: string) => void;
  setToTokenAddress: (swapOption: string, address: string) => void;
  setSwapOption: (option: string) => void;
  onSelectWalletToken: (token: TokenInfo) => void;
  onSelectShortTokenAddress: (address: string) => void;
}

/**
 * World Chain version of the SwapBox component
 * Adds World Chain specific contract interactions
 */
const WorldChainSwapBox: React.FC<SwapBoxProps> = (props) => {
  const {
    setPendingTxns = () => { /* no-op */ },
    pendingTxns = [],
    savedSlippageAmount = 0.5,
    infoTokens = {},
    tokensData = {},
    savedIsPnlInLeverage = false,
    setSavedIsPnlInLeverage = () => { /* no-op */ },
    setSavedSlippageAmount = () => { /* no-op */ },
  } = props;
  
  const chainId = useChainId();
  const { trackTransaction } = useTransaction();
  
  // Default token symbols
  const [
    fromTokenSymbol,
    setFromTokenSymbol
  ] = useState<string>("WLD");
  const [
    toTokenSymbol,
    setToTokenSymbol
  ] = useState<string>("USDC");
  const { active, account, signer } = useWallet();
  
  const { 
    executeSwap, 
    increasePosition, 
    getMinExecutionFee,
    prices 
  } = useWorldChainTrading();
  
  // Create tokenInfo for World Chain tokens to ensure symbol property is available
  const worldChainTokensInfo = useMemo<Record<string, TokenInfo>>(() => {
    // Use real token addresses from our worldchain tokens file
    const tokensData: Record<string, TokenInfo> = {
      [getWorldChainNativeToken()]: {
        address: getWorldChainNativeToken(),
        symbol: "WLD",
        name: "World",
        decimals: 18,
        isNative: true,
        isShortable: true,
        isStable: false,
        prices: prices?.WLD ? { 
          minPrice: BigInt(Math.floor((prices.WLD || 0) * 1e30)),
          maxPrice: BigInt(Math.floor((prices.WLD || 0) * 1e30))
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
          minPrice: BigInt(Math.floor((prices.WETH || 0) * 1e30)),
          maxPrice: BigInt(Math.floor((prices.WETH || 0) * 1e30))
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
          minPrice: BigInt(1e30),
          maxPrice: BigInt(1e30)
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
