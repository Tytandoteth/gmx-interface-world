import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to access the current signer
 * @returns An object containing the current signer and loading state
 */
export function useSigner() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSigner = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if window.ethereum is available
      if (window.ethereum) {
        // Use a direct approach with ethers - compatible with v5
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        try {
          // Get the signer
          const signerInstance = await provider.getSigner();
          setSigner(signerInstance);
        } catch (signerError) {
          // Fall back to read-only mode if signer isn't available
          setSigner(null);
        }
      } else {
        // If no ethereum provider is available, use null signer (read-only mode)
        setSigner(null);
      }
    } catch (err) {
      // Only log in development mode using import.meta instead of process.env
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('Wallet connection unavailable:', err);
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSigner();
  }, [loadSigner]);

  return { signer, isLoading, error, reload: loadSigner };
}

/**
 * Declare window.ethereum type for TypeScript
 */
declare global {
  interface Window {
    ethereum?: any;
  }
}
