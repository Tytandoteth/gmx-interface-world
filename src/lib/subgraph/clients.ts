import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET, WORLD } from "config/chains";

import { createClient } from "./utils";

export const chainlinkClient = createClient(ETH_MAINNET, "chainLink");

export const arbitrumGraphClient = createClient(ARBITRUM, "stats");
export const arbitrumReferralsGraphClient = createClient(ARBITRUM, "referrals");
export const nissohGraphClient = createClient(ARBITRUM, "nissohVault");

export const avalancheGraphClient = createClient(AVALANCHE, "stats");
export const avalancheReferralsGraphClient = createClient(AVALANCHE, "referrals");
export const avalancheFujiReferralsGraphClient = createClient(AVALANCHE_FUJI, "referrals");

export const arbitrumSyntheticsStatsClient = createClient(ARBITRUM, "syntheticsStats");
export const avalancheSyntheticsStatsClient = createClient(AVALANCHE, "syntheticsStats");
export const avalancheFujiSyntheticsStatsClient = createClient(AVALANCHE_FUJI, "syntheticsStats");
export const worldSyntheticsStatsClient = createClient(WORLD, "syntheticsStats");

export const arbitrumSubsquidClient = createClient(ARBITRUM, "subsquid");
export const avalancheSubsquidClient = createClient(AVALANCHE, "subsquid");
export const avalancheFujiSubsquidClient = createClient(AVALANCHE_FUJI, "subsquid");
export const worldSubsquidClient = createClient(WORLD, "subsquid");

export function getSyntheticsGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumSyntheticsStatsClient;
  }

  if (chainId === AVALANCHE) {
    return avalancheSyntheticsStatsClient;
  }

  if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiSyntheticsStatsClient;
  }

  if (chainId === WORLD) {
    return worldSyntheticsStatsClient;
  }

  return null;
}

export function getSubsquidGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumSubsquidClient;
  }

  if (chainId === AVALANCHE) {
    return avalancheSubsquidClient;
  }

  if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiSubsquidClient;
  }

  if (chainId === WORLD) {
    return worldSubsquidClient;
  }

  return null;
}

export function getGmxGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return null;
  } else if (chainId === WORLD) {
    return null; // No GMX graph client for World chain yet
  }

  throw new Error(`Unsupported chain ${chainId}`);
}

export function getReferralsGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiReferralsGraphClient;
  } else if (chainId === WORLD) {
    return null; // No referrals graph client for World chain yet
  }
  throw new Error(`Unsupported chain ${chainId}`);
}
