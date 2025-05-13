import { ethers } from "ethers";
import sample from "lodash/sample";

import type { NetworkMetadata } from "lib/wallets";
import { WORLD } from "./static/chains";

export * from "./static/chains";

// Only support World Chain
export const SUPPORTED_CHAIN_IDS = [WORLD];

const { parseEther } = ethers;

export const ENV_WORLD_RPC_URLS = import.meta.env.VITE_APP_WORLD_RPC_URLS;

// World Chain is the only supported chain
export const DEFAULT_CHAIN_ID = WORLD;
export const CHAIN_ID = DEFAULT_CHAIN_ID;

export const IS_NETWORK_DISABLED = {
  [WORLD]: false,
};

export const CHAIN_NAMES_MAP = {
  [WORLD]: "World",
};

export const NETWORK_EXECUTION_TO_CREATE_FEE_FACTOR = {
  [WORLD]: 10n ** 29n * 5n,
} as const;

const constants = {
  [WORLD]: {
    nativeTokenSymbol: "WLD",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 8,
    v2: false, // Set to false to use V1 contracts
    
    // V1-specific execution fees
    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther("0.005"),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.005"),
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther("0.0050001"),
  },
};

export const RPC_PROVIDERS = {
  [WORLD]: [
    // PRIMARY ENDPOINT: QuikNode endpoint specifically for World Chain
    "https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/",
    // No other endpoints needed for this World Chain-only application
  ],
};

export const FALLBACK_PROVIDERS = {
  [WORLD]: ["https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/"],
};

export const NETWORK_METADATA: { [chainId: number]: NetworkMetadata } = {
  [WORLD]: {
    chainId: "0x" + WORLD.toString(16),
    chainName: "World",
    nativeCurrency: {
      name: "World",
      symbol: "WLD",
      decimals: 18,
    },
    rpcUrls: RPC_PROVIDERS[WORLD],
    blockExplorerUrls: ["https://wld.explorers.guru"],
  },
};

export const getConstant = (chainId: number, key: string) => {
  if (!constants[chainId]) {
    throw new Error(`Unsupported chainId ${chainId}`);
  }

  if (!(key in constants[chainId])) {
    throw new Error(`Key ${key} does not exist for chainId ${chainId}`);
  }

  return constants[chainId][key];
};

export function getChainName(chainId: number) {
  return CHAIN_NAMES_MAP[chainId];
}

export function getFallbackRpcUrl(chainId: number): string {
  return sample(FALLBACK_PROVIDERS[chainId]) || "";
}

export function getExplorerUrl(chainId) {
  if (chainId === WORLD) {
    return "https://wld.explorers.guru";
  }
  return "";
}

export function getTokenExplorerUrl(chainId: number, tokenAddress: string) {
  return `${getExplorerUrl(chainId)}token/${tokenAddress}`;
}
