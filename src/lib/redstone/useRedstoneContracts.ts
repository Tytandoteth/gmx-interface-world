/**
 * RedStone Contract Hooks
 * 
 * React hooks for accessing GMX contracts wrapped with RedStone pricing data.
 * These hooks ensure that all contract interactions include the necessary
 * price feed data from RedStone oracles.
 */

import { useCallback, useEffect, useState } from 'react';

import { ethers } from 'ethers';
import { useAccount } from 'wagmi';

import { WORLD } from 'sdk/configs/chains';
import { useChainId } from 'lib/chains';
import { useSigner } from 'lib/wallet';
import { getWrappedGmxContract, getPriceFeedContract } from './RedstoneContractWrapper';

/**
 * Hook to get the wrapped Vault contract
 * @returns The Vault contract wrapped with RedStone
 */
export function useVaultContract(): { 
  contract: ethers.Contract | null; 
  isLoading: boolean; 
  error: Error | null 
} {
  const { chainId } = useChainId();
  const { data: signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initContract = async (): Promise<void> => {
      if (!signer || chainId !== WORLD) {
        setContract(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const vaultContract = await getWrappedGmxContract('Vault', signer, chainId);
        setContract(vaultContract);
        setError(null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error initializing vault contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContract().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize vault contract:', err);
    });
  }, [chainId, signer]);

  return { contract, isLoading, error };
}

/**
 * Hook to get the wrapped Router contract
 * @returns The Router contract wrapped with RedStone
 */
export function useRouterContract(): { 
  contract: ethers.Contract | null; 
  isLoading: boolean; 
  error: Error | null 
} {
  const { chainId } = useChainId();
  const { data: signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initContract = async (): Promise<void> => {
      if (!signer || chainId !== WORLD) {
        setContract(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const routerContract = await getWrappedGmxContract('Router', signer, chainId);
        setContract(routerContract);
        setError(null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error initializing router contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContract().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize router contract:', err);
    });
  }, [chainId, signer]);

  return { contract, isLoading, error };
}

/**
 * Hook to get the RedStone price feed contract
 * @returns The price feed contract with RedStone
 */
export function usePriceFeedContract(): { 
  contract: ethers.Contract | null; 
  isLoading: boolean; 
  error: Error | null 
} {
  const { chainId } = useChainId();
  const { data: signer } = useSigner();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initContract = async (): Promise<void> => {
      if (!signer || chainId !== WORLD) {
        setContract(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const priceFeedContract = await getPriceFeedContract(signer, chainId);
        setContract(priceFeedContract);
        setError(null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error initializing price feed contract:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContract().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize price feed contract:', err);
    });
  }, [chainId, signer]);

  return { contract, isLoading, error };
}

/**
 * Helper hook to get the token price from the RedStone oracle
 * @param symbol Token symbol (e.g., 'WLD', 'WETH')
 * @returns Token price in USD with 8 decimals
 */
export function useTokenPrice(symbol: string): { 
  price: number | null; 
  isLoading: boolean; 
  error: Error | null; 
  refresh: () => Promise<void> 
} {
  const { contract, isLoading: contractLoading, error: contractError } = usePriceFeedContract();
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrice = useCallback(async (): Promise<void> => {
    if (!contract || contractLoading || contractError || !symbol) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [priceValue, decimals] = await contract.getPriceWithDecimals(symbol);
      
      // Convert price to decimal format based on returned decimals
      const priceInUsd = parseFloat(ethers.formatUnits(priceValue, decimals));
      setPrice(priceInUsd);
      setError(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching price for ${symbol}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, [contract, contractLoading, contractError, symbol]);

  useEffect(() => {
    fetchPrice().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch price for ${symbol}:`, err);
    });
    
    // Refresh price every 15 seconds
    const intervalId = setInterval(() => {
      fetchPrice().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to refresh price for ${symbol}:`, err);
      });
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [fetchPrice, symbol]);

  return { price, isLoading: isLoading || contractLoading, error: error || contractError, refresh: fetchPrice };
}
