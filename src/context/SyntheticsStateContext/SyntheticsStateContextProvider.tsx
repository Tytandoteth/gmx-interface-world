import { ethers } from "ethers";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";

import { WORLD, isChainInDevelopment } from "sdk/configs/chains";
import { 
  isWorldChain, 
  withWorldChainFallback, 
  getWorldChainMockData, 
  getMulticallMockData,
  getWorldChainTokensData
} from "lib/worldchain";

import { getKeepLeverageKey } from "config/localStorage";
import { SettingsContextType, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { UserReferralInfo, useUserReferralInfoRequest } from "domain/referrals";
import { useIsLargeAccountTracker } from "domain/stats/isLargeAccount";
import {
  AccountStats,
  PeriodAccountStats,
  useAccountStats,
  usePeriodAccountStats,
} from "domain/synthetics/accountStats";
import { ExternalSwapState } from "domain/synthetics/externalSwaps/types";
import { useInitExternalSwapState } from "domain/synthetics/externalSwaps/useInitExternalSwapState";
import { useGasLimits, useGasPrice } from "domain/synthetics/fees";
import { RebateInfoItem, useRebatesInfoRequest } from "domain/synthetics/fees/useRebatesInfo";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  MarketsInfoResult,
  MarketsResult,
  useMarketTokensDataRequest,
  useMarkets,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { OrderEditorState, useOrderEditorState } from "domain/synthetics/orders/useOrderEditorState";
import { AggregatedOrdersDataResult, useOrdersInfoRequest } from "domain/synthetics/orders/useOrdersInfo";
import {
  PositionsConstantsResult,
  PositionsInfoResult,
  usePositions,
  usePositionsConstantsRequest,
  usePositionsInfoRequest,
} from "domain/synthetics/positions";
import { TokensData, useTokensDataRequest } from "domain/synthetics/tokens";
import { ConfirmationBoxState, useConfirmationBoxState } from "domain/synthetics/trade/useConfirmationBoxState";
import { PositionEditorState, usePositionEditorState } from "domain/synthetics/trade/usePositionEditorState";
import { PositionSellerState, usePositionSellerState } from "domain/synthetics/trade/usePositionSellerState";
import { TradeboxState, useTradeboxState } from "domain/synthetics/trade/useTradeboxState";
import useIsFirstOrder from "domain/synthetics/tradeHistory/useIsFirstOrder";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { BlockTimestampData, useBlockTimestampRequest } from "lib/useBlockTimestampRequest";
import useWallet from "lib/wallets/useWallet";

import { useCollectSyntheticsMetrics } from "./useCollectSyntheticsMetrics";
import { LeaderboardState, useLeaderboardState } from "./useLeaderboardState";

export type SyntheticsPageType =
  | "accounts"
  | "trade"
  | "pools"
  | "leaderboard"
  | "competitions"
  | "dashboard"
  | "earn"
  | "buy"
  | "home";

export type SyntheticsState = {
  pageType: SyntheticsPageType;
  globals: {
    chainId: number;
    markets: MarketsResult;
    marketsInfo: MarketsInfoResult;
    positionsInfo: PositionsInfoResult;
    account: string | undefined;
    ordersInfo: AggregatedOrdersDataResult;
    positionsConstants: PositionsConstantsResult["positionsConstants"];
    uiFeeFactor: bigint;
    userReferralInfo: UserReferralInfo | undefined;
    depositMarketTokensData: TokensData | undefined;
    glvInfo: ReturnType<typeof useGlvMarketsInfo>;

    closingPositionKey: string | undefined;
    setClosingPositionKey: (key: string | undefined) => void;

    keepLeverage: boolean | undefined;
    setKeepLeverage: (value: boolean) => void;

    missedCoinsModalPlace: MissedCoinsPlace | undefined;
    setMissedCoinsModalPlace: (place: MissedCoinsPlace | undefined) => void;

    gasLimits: ReturnType<typeof useGasLimits>;
    gasPrice: ReturnType<typeof useGasPrice>;

    lastWeekAccountStats?: PeriodAccountStats;
    lastMonthAccountStats?: PeriodAccountStats;
    accountStats?: AccountStats;
    isCandlesLoaded: boolean;
    setIsCandlesLoaded: (isLoaded: boolean) => void;
    isLargeAccount?: boolean;
    isFirstOrder: boolean;
    blockTimestampData: BlockTimestampData | undefined;
  };
  claims: {
    accruedPositionPriceImpactFees: RebateInfoItem[];
    claimablePositionPriceImpactFees: RebateInfoItem[];
  };
  leaderboard: LeaderboardState;
  settings: SettingsContextType;
  tradebox: TradeboxState;
  externalSwap: ExternalSwapState;
  orderEditor: OrderEditorState;
  positionSeller: PositionSellerState;
  positionEditor: PositionEditorState;
  confirmationBox: ConfirmationBoxState;
};

const StateCtx = createContext<SyntheticsState | null>(null);

let latestState: SyntheticsState | null = null;

export function SyntheticsStateContextProvider({
  children,
  skipLocalReferralCode,
  pageType,
  overrideChainId,
}: {
  children: ReactNode;
  skipLocalReferralCode: boolean;
  pageType: SyntheticsState["pageType"];
  overrideChainId?: number;
}) {
  const { chainId: selectedChainId } = useChainId();

  const { account: walletAccount, signer } = useWallet();
  const { account: paramsAccount } = useParams<{ account?: string }>();

  let checkSummedAccount: string | undefined;

  if (paramsAccount && ethers.isAddress(paramsAccount)) {
    checkSummedAccount = ethers.getAddress(paramsAccount);
  }

  const isLeaderboardPage = pageType === "competitions" || pageType === "leaderboard";
  const isTradePage = pageType === "trade";
  const isAccountPage = pageType === "accounts";

  const account = isAccountPage ? checkSummedAccount : walletAccount;
  const leaderboard = useLeaderboardState(account, isLeaderboardPage);
  const chainId = isLeaderboardPage ? leaderboard.chainId : overrideChainId ?? selectedChainId;
  
  // Check if current chain is in development mode (World Chain)
  const isDevModeChain = isWorldChain(chainId) && isChainInDevelopment(chainId);
  
  // Log development mode status for debugging
  console.log(`Chain ${chainId} is in ${isDevModeChain ? 'development' : 'production'} mode`);
  
  /**
   * Wrap data fetching functions with World Chain development mode support
   * This ensures we have graceful fallbacks for missing contract data
   */
  const withWorldChainSupport = useCallback(<T,>(data: T | undefined | null, mockDataKey: string): T | undefined => {
    if (data !== undefined && data !== null) return data;
    if (!isWorldChain(chainId)) return undefined;
    
    // For World Chain in development mode, try to provide mock data
    const mockData = getMulticallMockData<T>(mockDataKey);
    if (mockData) {
      console.debug(`[World Chain Dev] Using mock data for ${mockDataKey}`);
      return mockData;
    }
    
    return undefined;
  }, [chainId]);

  // Get markets data with World Chain development mode support
  const marketsResult = useMarkets(chainId);
  const tokensResult = useTokensDataRequest(chainId);
  
  // Apply fallbacks for World Chain in development mode
  const markets = useMemo(() => {
    // If we have valid markets data, use it
    if (marketsResult.marketsData && Object.keys(marketsResult.marketsData).length > 0) {
      return marketsResult;
    }
    
    // For World Chain in development mode, provide mock data
    if (isWorldChain(chainId) && isChainInDevelopment(chainId)) {
      console.debug("[World Chain Dev] Using mock markets data");
      const mockMarketsData = getWorldChainMockData<Record<string, any>>("markets");
      
      // If we have mock data, use it
      if (mockMarketsData && Object.keys(mockMarketsData).length > 0) {
        return {
          ...marketsResult,
          marketsData: mockMarketsData
        };
      }
    }
    
    // Return original result if no fallback is available
    return marketsResult;
  }, [chainId, marketsResult]);
  
  // Apply tokens data fallbacks for World Chain
  const tokensData = useMemo(() => {
    try {
      // If we have valid tokens data, use it
      if (tokensResult.tokensData && Object.keys(tokensResult.tokensData).length > 0) {
        // For World Chain, we might need to merge with our custom token data
        if (isWorldChain(chainId)) {
          console.debug("[World Chain] Applying World Chain token data with existing tokens");
          return getWorldChainTokensData(tokensResult.tokensData, chainId);
        }
        return tokensResult.tokensData;
      }
      
      // For World Chain in development mode, provide detailed token configuration
      if (isWorldChain(chainId) && isChainInDevelopment(chainId)) {
        console.debug("[World Chain Dev] Using World Chain token configuration");
        return getWorldChainTokensData({}, chainId);
      }
      
      // Return original result if no fallback is available
      return tokensResult.tokensData || {};
    } catch (error) {
      console.error("[World Chain] Error handling token data:", error);
      // Always return a valid object to prevent rendering errors
      return isWorldChain(chainId) ? getWorldChainTokensData({}, chainId) : {};
    }
  }, [chainId, tokensResult.tokensData]);

  const positionsResult = usePositions(chainId, {
    account,
    marketsData: markets.marketsData,
    tokensData,
  });

  // Get markets info with World Chain development mode support
  const marketsInfoResult = useMarketsInfoRequest(chainId);
  
  // Apply fallbacks for World Chain in development mode
  const marketsInfo = useMemo(() => {
    // If we have valid markets info data, use it
    if (marketsInfoResult.marketsInfoData && Object.keys(marketsInfoResult.marketsInfoData).length > 0) {
      return marketsInfoResult;
    }
    
    // For World Chain in development mode, provide mock data
    if (isWorldChain(chainId) && isChainInDevelopment(chainId)) {
      console.debug("[World Chain Dev] Using mock markets info data");
      const mockMarketsInfoData = getWorldChainMockData<Record<string, any>>("marketsInfo");
      
      // If we have mock data, use it
      if (mockMarketsInfoData && Object.keys(mockMarketsInfoData).length > 0) {
        return {
          ...marketsInfoResult,
          marketsInfoData: mockMarketsInfoData,
          tokensData: tokensData || {}
        };
      }
    }
    
    // Return original result if no fallback is available
    return marketsInfoResult;
  }, [chainId, marketsInfoResult, tokensData]);

  const { isFirstOrder } = useIsFirstOrder(chainId, { account });

  const shouldFetchGlvMarkets =
    isGlvEnabled(chainId) && (pageType === "pools" || pageType === "earn" || pageType === "buy");
  const glvInfo = useGlvMarketsInfo(shouldFetchGlvMarkets, {
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
    chainId: chainId,
    account: account,
  });

  const { marketTokensData: depositMarketTokensData } = useMarketTokensDataRequest(chainId, {
    isDeposit: true,
    account,
    glvData: glvInfo.glvData,
    withGlv: shouldFetchGlvMarkets,
  });
  // Apply fallbacks for critical contract data when using World Chain in development mode
  const positionsConstantsResult = usePositionsConstantsRequest(chainId);
  const uiFeeFactorResult = useUiFeeFactorRequest(chainId);
  
  // Apply our World Chain development mode support to ensure we have valid data
  const positionsConstants = useMemo(() => {
    // Provide fallback with empty object that matches the expected type
    const defaultConstants = { 
      minCollateralUsd: 0n,
      minPositionSizeUsd: 0n,
      maxAutoCancelOrders: 0n 
    };
    
    return withWorldChainSupport(positionsConstantsResult.positionsConstants, "usePositionsConstants") || defaultConstants;
  }, [withWorldChainSupport, positionsConstantsResult.positionsConstants]);
  
  const uiFeeFactor = useMemo(() => {
    return withWorldChainSupport(uiFeeFactorResult.uiFeeFactor, "uiFeeFactorForAccount") ?? 0n;
  }, [withWorldChainSupport, uiFeeFactorResult.uiFeeFactor]);
  const userReferralInfo = useUserReferralInfoRequest(signer, chainId, account, skipLocalReferralCode);
  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [isCandlesLoaded, setIsCandlesLoaded] = useState(false);
  const { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } = useRebatesInfoRequest(
    chainId,
    isTradePage
  );

  const [missedCoinsModalPlace, setMissedCoinsModalPlace] = useState<MissedCoinsPlace>();

  const settings = useSettings();

  // Request positions info with proper error handling
  const positionsInfoRequest = usePositionsInfoRequest(chainId, {
    account,
    showPnlInLeverage: settings.isPnlInLeverage,
    marketsInfoData: marketsInfo.marketsInfoData,
    positionsData: positionsResult.positionsData,
    positionsError: positionsResult.error,
    marketsData: markets.marketsData,
    skipLocalReferralCode,
    tokensData,
  });
  
  // Extract key values from positions info request with fallbacks
  const isLoading = positionsInfoRequest.isLoading;
  const positionsInfoError = positionsInfoRequest.error;
  
  // Apply World Chain development mode support to positions info data
  const positionsInfoData = useMemo(() => {
    // If we have valid positions info data, use it
    if (positionsInfoRequest.positionsInfoData) {
      return positionsInfoRequest.positionsInfoData;
    }
    
    // For World Chain in development mode with no positions, return empty object
    // This ensures the UI works properly even without position data
    if (isWorldChain(chainId) && isChainInDevelopment(chainId)) {
      console.debug("[World Chain Dev] Using empty positions data");
      return {};
    }
    
    // Return undefined for other chains to match expected behavior
    return undefined;
  }, [chainId, positionsInfoRequest.positionsInfoData]);

  const ordersInfo = useOrdersInfoRequest(chainId, {
    account,
    marketsInfoData: marketsInfo.marketsInfoData,
    tokensData: marketsInfo.tokensData,
  });

  const tradeboxState = useTradeboxState(chainId, isTradePage, {
    marketsInfoData: marketsInfo.marketsInfoData,
    marketsData: markets.marketsData,
    tokensData: marketsInfo.tokensData,
    positionsInfoData,
    ordersInfoData: ordersInfo.ordersInfoData,
  });

  const orderEditor = useOrderEditorState(ordersInfo.ordersInfoData);

  const timePerios = useMemo(() => getTimePeriodsInSeconds(), []);

  const isLargeAccount = useIsLargeAccountTracker(walletAccount);

  const { data: lastWeekAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: timePerios.week[0],
    to: timePerios.week[1],
    enabled: pageType === "trade",
  });

  const { data: lastMonthAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: timePerios.month[0],
    to: timePerios.month[1],
    enabled: pageType === "trade",
  });

  const { data: accountStats } = useAccountStats(chainId, {
    account,
    enabled: pageType === "trade",
  });

  // Request block timestamp data with World Chain support
  const blockTimestampResult = useBlockTimestampRequest(chainId, { skip: !["trade", "pools"].includes(pageType) });
  
  // Provide fallback for block timestamp data when using World Chain in development mode
  const blockTimestampData = useMemo(() => {
    if (blockTimestampResult.blockTimestampData) {
      return blockTimestampResult.blockTimestampData;
    }
    
    // Provide mock data for World Chain in development mode
    if (isWorldChain(chainId) && isChainInDevelopment(chainId)) {
      const mockData = getMulticallMockData<{ timestamp: number }>("useBlockTimestamp");
      const currentTimestamp = mockData?.timestamp || Math.floor(Date.now() / 1000);
      
      console.debug(`[World Chain Dev] Using ${mockData ? 'mock' : 'current'} timestamp: ${currentTimestamp}`);
      
      // Create properly typed BlockTimestampData object
      const mockBlockTimestampData: BlockTimestampData = {
        blockTimestamp: BigInt(currentTimestamp),
        localTimestamp: BigInt(Math.floor(Date.now() / 1000))
      };
      
      return mockBlockTimestampData;
    }
    
    return undefined;
  }, [chainId, blockTimestampResult.blockTimestampData]);

  // TODO move closingPositionKey to positionSellerState
  const positionSellerState = usePositionSellerState(chainId, positionsInfoData?.[closingPositionKey ?? ""]);
  const positionEditorState = usePositionEditorState(chainId);
  const confirmationBoxState = useConfirmationBoxState();

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);

  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  useCollectSyntheticsMetrics({
    marketsInfo,
    isPositionsInfoLoading: isLoading,
    positionsInfoData,
    positionsInfoError,
    isCandlesLoaded,
    pageType,
  });

  const externalSwapState = useInitExternalSwapState();

  const state = useMemo(() => {
    const s: SyntheticsState = {
      pageType,
      globals: {
        chainId,
        account,
        markets,
        marketsInfo,
        ordersInfo,
        positionsConstants,
        glvInfo,
        positionsInfo: {
          isLoading,
          positionsInfoData,
        },
        uiFeeFactor,
        userReferralInfo,
        depositMarketTokensData,

        closingPositionKey,
        setClosingPositionKey,

        missedCoinsModalPlace,
        setMissedCoinsModalPlace,

        gasLimits,
        gasPrice,

        keepLeverage,
        setKeepLeverage,
        lastWeekAccountStats,
        lastMonthAccountStats,
        accountStats,
        isCandlesLoaded,
        setIsCandlesLoaded,
        isLargeAccount,
        isFirstOrder,
        blockTimestampData,
      },
      claims: { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees },
      leaderboard,
      settings,
      tradebox: tradeboxState,
      externalSwap: externalSwapState,
      orderEditor,
      positionSeller: positionSellerState,
      positionEditor: positionEditorState,
      confirmationBox: confirmationBoxState,
    };

    return s;
  }, [
    pageType,
    chainId,
    account,
    markets,
    marketsInfo,
    ordersInfo,
    positionsConstants,
    glvInfo,
    isLoading,
    positionsInfoData,
    uiFeeFactor,
    userReferralInfo,
    depositMarketTokensData,
    closingPositionKey,
    missedCoinsModalPlace,
    gasLimits,
    gasPrice,
    keepLeverage,
    setKeepLeverage,
    lastWeekAccountStats,
    lastMonthAccountStats,
    accountStats,
    isCandlesLoaded,
    isLargeAccount,
    isFirstOrder,
    blockTimestampData,
    accruedPositionPriceImpactFees,
    claimablePositionPriceImpactFees,
    leaderboard,
    settings,
    tradeboxState,
    externalSwapState,
    orderEditor,
    positionSellerState,
    positionEditorState,
    confirmationBoxState,
  ]);

  latestState = state;

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}

export function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsState) => Selected) {
  const value = useContext(StateCtx);
  if (!value) {
    throw new Error("Used useSyntheticsStateSelector outside of SyntheticsStateContextProvider");
  }
  return useContextSelector(StateCtx as Context<SyntheticsState>, selector) as Selected;
}

export function useCalcSelector() {
  return useCallback(function useCalcSelector<Selected>(selector: (state: SyntheticsState) => Selected) {
    if (!latestState) throw new Error("Used calcSelector outside of SyntheticsStateContextProvider");
    return selector(latestState);
  }, []);
}
