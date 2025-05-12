import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { usePublicClient } from 'wagmi';

import { getTokenPriceBySymbol, isSimplePriceFeedAvailable } from 'lib/worldchain/simplePriceFeed';
import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';
import { WorldChainProductionConfig } from 'lib/worldchain/worldChainProduction';

/**
 * Test component for SimplePriceFeed contract integration
 * Displays prices from the SimplePriceFeed contract for test tokens
 */
const SimplePriceFeedTest: React.FC = () => {
  const publicClient = usePublicClient();
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Test tokens to fetch prices for
  const testTokens = ['TUSD', 'TBTC', 'TETH'];

  // Fetch prices from SimplePriceFeed contract
  useEffect(() => {
    const fetchPrices = async () => {
      if (!publicClient) {
        setError('Provider not available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Convert publicClient to ethers provider
        const provider = new ethers.BrowserProvider(publicClient.transport as any);

        // Check if SimplePriceFeed contract is available
        const available = await isSimplePriceFeedAvailable(provider);
        setIsAvailable(available);

        if (!available) {
          setError('SimplePriceFeed contract is not available');
          setIsLoading(false);
          return;
        }

        // Fetch prices for test tokens
        const priceResults: Record<string, number | null> = {};
        
        for (const token of testTokens) {
          try {
            const price = await getTokenPriceBySymbol(
              token,
              WorldChainProductionConfig.tokens,
              provider
            );
            priceResults[token] = price;
          } catch (err) {
            logger.error(`Error fetching price for ${token}:`, err);
            priceResults[token] = null;
          }
        }

        setPrices(priceResults);
        setIsLoading(false);
      } catch (err) {
        logger.error('Error fetching prices:', err);
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    };

    void fetchPrices();
  }, [publicClient]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">SimplePriceFeed Test</h2>
        <div className="text-center py-6">
          <p>Loading prices from SimplePriceFeed contract...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">SimplePriceFeed Test</h2>
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-md">
          <p className="text-red-700 dark:text-red-200">Error: {error}</p>
        </div>
      </div>
    );
  }

  // Render price data
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">SimplePriceFeed Test</h2>
      
      {/* Contract status */}
      <div className="mb-4">
        <p>
          Contract Status: 
          <span className={`ml-2 font-semibold ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isAvailable ? 'Available' : 'Not Available'}
          </span>
        </p>
      </div>
      
      {/* Prices table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-4 py-2 border-b text-left">Token</th>
              <th className="px-4 py-2 border-b text-left">Address</th>
              <th className="px-4 py-2 border-b text-right">Price (USD)</th>
              <th className="px-4 py-2 border-b text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {testTokens.map(token => {
              const price = prices[token];
              const address = WorldChainProductionConfig.tokens[token] || 'Not configured';
              
              return (
                <tr key={token} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{token}</td>
                  <td className="px-4 py-2 text-xs break-all">{address}</td>
                  <td className="px-4 py-2 text-right">
                    {price !== null ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block w-3 h-3 rounded-full ${price !== null ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Add this component to any page to test SimplePriceFeed integration.</p>
        <p className="mt-1">Expected prices: TUSD ($1.00), TBTC ($60,000.00), TETH ($3,000.00)</p>
      </div>
    </div>
  );
};

export default SimplePriceFeedTest;
