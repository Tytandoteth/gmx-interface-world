import { Token } from "sdk/types/tokens";

import { MarketInfo } from "../markets";

export enum ClaimType {
  ClaimPriceImpact = "ClaimPriceImpact",
  ClaimFunding = "ClaimFunding",
  SettleFundingFeeCreated = "SettleFundingFeeCreated",
  SettleFundingFeeExecuted = "SettleFundingFeeExecuted",
  SettleFundingFeeCancelled = "SettleFundingFeeCancelled",
}

export type ClaimMarketItem = {
  marketInfo: MarketInfo;
  longTokenAmount: bigint;
  longTokenAmountUsd: bigint;
  shortTokenAmount: bigint;
  shortTokenAmountUsd: bigint;
};

export type ClaimCollateralAction = {
  id: string;
  type: "collateral";
  eventName: ClaimType.ClaimFunding | ClaimType.ClaimPriceImpact;
  account: string;
  amounts: bigint[];
  tokenPrices: bigint[];
  claimItems: ClaimMarketItem[];
  timestamp: number;
  transaction: {
    hash: string;
  };
  tokens: Token[];
};

export type ClaimFundingFeeAction = {
  id: string;
  type: "fundingFee";
  eventName:
    | ClaimType.SettleFundingFeeCancelled
    | ClaimType.SettleFundingFeeCreated
    | ClaimType.SettleFundingFeeExecuted;
  account: string;
  amounts: bigint[];
  tokenPrices: bigint[];
  markets: MarketInfo[];
  tokens: Token[];
  isLongOrders: boolean[];
  timestamp: number;
  transaction: {
    hash: string;
  };
  claimItems: ClaimMarketItem[];
};

export type ClaimAction = ClaimCollateralAction | ClaimFundingFeeAction;
