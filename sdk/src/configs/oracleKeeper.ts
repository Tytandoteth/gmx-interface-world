import random from "lodash/random";
import sample from "lodash/sample";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, WORLD } from "./chains";

const ORACLE_KEEPER_URLS: Record<number, string[]> = {
  [ARBITRUM]: ["https://arbitrum-api.gmxinfra.io", "https://arbitrum-api.gmxinfra2.io"],

  [AVALANCHE]: ["https://avalanche-api.gmxinfra.io", "https://avalanche-api.gmxinfra2.io"],

  [AVALANCHE_FUJI]: ["https://synthetics-api-avax-fuji-upovm.ondigitalocean.app"],
  
  // Custom Oracle Keeper for World chain using the deployed Cloudflare Worker
  [WORLD]: ["https://oracle-keeper.kevin8396.workers.dev"],
};

// Special handling for World chain to ensure it always has a valid Oracle Keeper URL
// First check for environment variable, then fall back to default URL
const WORLD_ORACLE_KEEPER_URL = (
  // First priority: VITE_ORACLE_KEEPER_URL environment variable (most specific)
  typeof import.meta.env !== 'undefined' && import.meta.env.VITE_ORACLE_KEEPER_URL ? 
    import.meta.env.VITE_ORACLE_KEEPER_URL as string : 
  // Second priority: Generic APP version of the environment variable
  typeof import.meta.env !== 'undefined' && import.meta.env.VITE_APP_ORACLE_KEEPER_URL ? 
    import.meta.env.VITE_APP_ORACLE_KEEPER_URL as string : 
  // Default fallback
  "https://oracle-keeper.kevin8396.workers.dev"
);

export function getOracleKeeperUrl(chainId: number, index: number) {
  // Special case for World chain - always use the local Oracle Keeper
  if (chainId === WORLD) {
    return WORLD_ORACLE_KEEPER_URL;
  }
  
  const urls = ORACLE_KEEPER_URLS[chainId];

  if (!urls || !urls.length) {
    console.warn(`No oracle keeper urls for chain ${chainId}, using fallback`);
    // If we're requesting a URL for World chain but it's not in the config, return the default
    if (chainId === WORLD) {
      return WORLD_ORACLE_KEEPER_URL;
    }
    throw new Error(`No oracle keeper urls for chain ${chainId}`);
  }

  return urls[index] || urls[0];
}

export function getOracleKeeperNextIndex(chainId: number, currentIndex: number) {
  const urls = ORACLE_KEEPER_URLS[chainId];

  if (!urls.length) {
    throw new Error(`No oracle keeper urls for chain ${chainId}`);
  }

  return urls[currentIndex + 1] ? currentIndex + 1 : 0;
}

export function getOracleKeeperRandomIndex(chainId: number, bannedIndexes?: number[]): number {
  const urls = ORACLE_KEEPER_URLS[chainId];

  if (bannedIndexes?.length) {
    const filteredUrls = urls.filter((url, i) => !bannedIndexes.includes(i));

    if (filteredUrls.length) {
      const url = sample(filteredUrls);

      if (!url) {
        throw new Error(`No oracle keeper urls for chain ${chainId}`);
      }

      return urls.indexOf(url);
    }
  }

  return random(0, urls.length - 1);
}
