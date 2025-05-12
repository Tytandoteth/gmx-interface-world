import { switchChain } from "@wagmi/core";

import { ChainId } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";

import { getRainbowKitConfig } from "./rainbowKitConfig";
import { appLogger } from "../debug/logger";

export type NetworkMetadata = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

export async function switchNetwork(chainId: number, active: boolean): Promise<void> {
  // Special handling for World Chain (ID: 480)
  if (chainId === 480) {
    try {
      if (active && window.ethereum) {
        // Manual network add for World Chain
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x1E0', // 480 in hex
            chainName: 'World Chain',
            nativeCurrency: {
              name: 'World',
              symbol: 'WLD',
              decimals: 18
            },
            rpcUrls: ['https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/'],
            blockExplorerUrls: ['https://explorer.world-chain.com']
          }]
        });
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
      } else {
        // No active wallet, just store chainId in localStorage
        localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
        document.location.reload();
      }
    } catch (error) {
      // Log error using appLogger
      appLogger.error('Failed to switch to World Chain', 
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  } else if (active) {
    // Standard network switching for other chains
    await switchChain(getRainbowKitConfig(), {
      chainId: chainId as ChainId,
    });
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
  } else {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
    document.location.reload();
    return;
  }
}

export function shortenAddressOrEns(address: string, length: number) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10 || address.length < length) {
    return address;
  }
  let left = address.includes(".") ? address.split(".")[1].length : Math.floor((length - 3) / 2) + 1;
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}
