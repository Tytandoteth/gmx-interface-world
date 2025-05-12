import { getDefaultConfig, WalletList } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  coreWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  safeWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import once from "lodash/once";
import { http } from "viem";
import { arbitrum, avalanche, avalancheFuji, type Chain } from "viem/chains";
import { defineChain } from "viem";

import { WORLD } from "sdk/configs/chains";

import { isDevelopment } from "config/env";

import binanceWallet from "./connecters/binanceW3W/binanceWallet";

// Define World Chain for network switching
const worldChain = defineChain({
  id: WORLD,
  name: 'World Chain',
  network: 'world',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        'https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/'
      ],
    },
    public: {
      http: [
        'https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/'
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'World Explorer',
      url: 'https://explorer.world-chain.com',
    },
  },
});

const WALLET_CONNECT_PROJECT_ID = "de24cddbaf2a68f027eae30d9bb5df58";
const APP_NAME = "GMX";

const popularWalletList: WalletList = [
  {
    // Group name with standard name is localized by rainbow kit
    groupName: "Popular",
    wallets: [
      rabbyWallet,
      metaMaskWallet,
      walletConnectWallet,
      // This wallet will automatically hide itself from the list when the fallback is not necessary or if there is no injected wallet available.
      injectedWallet,
      // The Safe option will only appear in the Safe Wallet browser environment.
      safeWallet,
    ],
  },
];

const othersWalletList: WalletList = [
  {
    groupName: "Others",
    wallets: [binanceWallet, coinbaseWallet, trustWallet, coreWallet, okxWallet],
  },
];

export const getRainbowKitConfig = once(() =>
  getDefaultConfig({
    appName: APP_NAME,
    projectId: WALLET_CONNECT_PROJECT_ID,
    chains: [arbitrum, avalanche, worldChain, ...(isDevelopment() ? [avalancheFuji] : [])],
    transports: {
      [arbitrum.id]: http(),
      [avalanche.id]: http(),
      [avalancheFuji.id]: http(),
      [WORLD]: http(),
    },
    wallets: [...popularWalletList, ...othersWalletList],
  })
);
