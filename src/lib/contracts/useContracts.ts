import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

import { useChainId } from 'lib/chains';
import { useSigner } from 'lib/wallet';
import { getDeploymentConfig } from 'lib/worldchain/customDeployment';
import { createWorldChainProvider } from 'lib/worldchain/providers';

// Define minimal ABIs using strings - this is more reliable with ethers.js v6
// Only including the functions we need for basic interaction
const VAULT_ABI = [
  'function getMinPrice(address _token) external view returns (uint256)',
  'function getMaxPrice(address _token) external view returns (uint256)',
  'function isLeverageEnabled() external view returns (bool)',
  'function whitelistedTokens(address _token) external view returns (bool)'
];

const ROUTER_ABI = [
  'function getSwapFeeBasisPoints(address _tokenIn, address _tokenOut) external view returns (uint256)',
  'function getDepositFee(address _token, uint256 _amount) external view returns (uint256)',
  'function getWithdrawalFee(address _token, uint256 _amount) external view returns (uint256)'
];

const VAULT_PRICE_FEED_ABI = [
  'function getPrice(address _token, bool _maximise, bool _includeAmmPrice) external view returns (uint256)',
  'function priceDecimals() external view returns (uint256)'
];

const WITNET_PRICE_ROUTER_ABI = [
  'function getPriceFeedInfo(string memory _pairId) external view returns (bool, int256, uint256)',
  'function valueFor(string memory _pairId) external view returns (int256)'
];

// Create ethers Interfaces from string ABIs
const VAULT_INTERFACE = new ethers.Interface(VAULT_ABI);
const ROUTER_INTERFACE = new ethers.Interface(ROUTER_ABI);
const VAULT_PRICE_FEED_INTERFACE = new ethers.Interface(VAULT_PRICE_FEED_ABI);
const WITNET_PRICE_ROUTER_INTERFACE = new ethers.Interface(WITNET_PRICE_ROUTER_ABI);

type ContractHookResult = {
  contract: ethers.Contract | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Hook to load the Vault contract
 * @returns Contract loading state
 */
export function useVaultContract(): ContractHookResult {
  const { chainId } = useChainId();
  const { signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);

        const deployConfig = getDeploymentConfig(chainId);
        if (!deployConfig || !deployConfig.vault) {
          setLoading(false);
          return;
        }

        // In ethers v6, we need to ensure we have a valid ContractRunner
        let runner: ethers.Signer | ethers.Provider;

        // Try to use signer if available, otherwise use provider
        if (signer) {
          runner = signer;
        } else {
          // Create a provider as fallback
          runner = await createWorldChainProvider();
        }
        
        // Create contract using the Interface and the appropriate runner
        const vaultContract = new ethers.Contract(
          deployConfig.vault,
          VAULT_INTERFACE,
          runner
        );

        setContract(vaultContract);
      } catch (e) {
        // Log error only in development
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('Error loading Vault contract:', e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    loadContract();
  }, [chainId, signer]);

  return { contract, loading, error };
}

/**
 * Hook to load the Router contract
 * @returns Contract loading state
 */
export function useRouterContract(): ContractHookResult {
  const { chainId } = useChainId();
  const { signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);

        const deployConfig = getDeploymentConfig(chainId);
        if (!deployConfig || !deployConfig.router) {
          setLoading(false);
          return;
        }

        // In ethers v6, we need to ensure we have a valid ContractRunner
        let runner: ethers.Signer | ethers.Provider;

        // Try to use signer if available, otherwise use provider
        if (signer) {
          runner = signer;
        } else {
          // Create a provider as fallback
          runner = await createWorldChainProvider();
        }
        
        // Create contract using the Interface and the appropriate runner
        const routerContract = new ethers.Contract(
          deployConfig.router,
          ROUTER_INTERFACE,
          runner
        );

        setContract(routerContract);
      } catch (e) {
        // Log error only in development
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('Error loading Router contract:', e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    loadContract();
  }, [chainId, signer]);

  return { contract, loading, error };
}

/**
 * Hook to load the VaultPriceFeed contract
 * @returns Contract loading state
 */
export function usePriceFeedContract(): ContractHookResult {
  const { chainId } = useChainId();
  const { signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);

        const deployConfig = getDeploymentConfig(chainId);
        if (!deployConfig || !deployConfig.vaultPriceFeed) {
          setLoading(false);
          return;
        }

        // In ethers v6, we need to ensure we have a valid ContractRunner
        let runner: ethers.Signer | ethers.Provider;

        // Try to use signer if available, otherwise use provider
        if (signer) {
          runner = signer;
        } else {
          // Create a provider as fallback
          runner = await createWorldChainProvider();
        }
        
        // Create contract using the Interface and the appropriate runner
        const priceFeedContract = new ethers.Contract(
          deployConfig.vaultPriceFeed,
          VAULT_PRICE_FEED_INTERFACE,
          runner
        );

        setContract(priceFeedContract);
      } catch (e) {
        // Log error only in development
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('Error loading VaultPriceFeed contract:', e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    loadContract();
  }, [chainId, signer]);

  return { contract, loading, error };
}

/**
 * Hook to load the Witnet Price Router contract
 * @returns Contract loading state
 */
export function useWitnetPriceRouterContract(): ContractHookResult {
  const { chainId } = useChainId();
  const { signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);

        const deployConfig = getDeploymentConfig(chainId);
        if (!deployConfig || !deployConfig.witnetPriceRouter) {
          setLoading(false);
          return;
        }

        // In ethers v6, we need to ensure we have a valid ContractRunner
        let runner: ethers.Signer | ethers.Provider;

        // Try to use signer if available, otherwise use provider
        if (signer) {
          runner = signer;
        } else {
          // Create a provider as fallback
          runner = await createWorldChainProvider();
        }
        
        // Create contract using the Interface and the appropriate runner
        const witnetPriceRouterContract = new ethers.Contract(
          deployConfig.witnetPriceRouter,
          WITNET_PRICE_ROUTER_INTERFACE,
          runner
        );

        setContract(witnetPriceRouterContract);
      } catch (e) {
        // Log error only in development
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('Error loading Witnet Price Router contract:', e);
        }
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    loadContract();
  }, [chainId, signer]);

  return { contract, loading, error };
}
