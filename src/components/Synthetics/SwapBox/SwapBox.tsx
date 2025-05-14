/**
 * SwapBox Component (Stub implementation)
 * 
 * This is a stub implementation that provides the necessary exports
 * required by the WorldChainSwapBox component.
 */
import React from 'react';

export type SwapBoxProps = {
  tokenSelector?: React.ReactNode;
  fromToken?: any;
  toToken?: any;
  fromValue?: string;
  toValue?: string;
  onFromValueChange?: (value: string) => void;
  onToValueChange?: (value: string) => void;
  onFromTokenChange?: (token: any) => void;
  onToTokenChange?: (token: any) => void;
  setPendingTxns?: (txns: any[]) => void;
  isWrap?: boolean;
  isUnwrap?: boolean;
  isHighPriceImpact?: boolean;
  setIsHighPriceImpact?: (isHighPriceImpact: boolean) => void;
  shouldDisableValidation?: boolean;
  setOffersInfo?: (offers: any) => void;
  minExecutionFee?: any;
  inputValue?: any;
  showSwapCheckboxes?: any;
  shouldDisplayWrap?: any;
  swapCheckboxesSelection?: any;
  setSwapCheckboxesSelection?: any;
  fees?: any;
  orderOption?: string;
  setOrderOption?: (option: string) => void;
  spotMarketsInfo?: any;
  marketsInfo?: any;
  children?: React.ReactNode;
};

const SwapBox: React.FC<SwapBoxProps> = ({ 
  children,
  // Most props are not used in this stub implementation
}) => {
  return (
    <div className="Exchange-swap-box">
      {children}
    </div>
  );
};

export default SwapBox;
