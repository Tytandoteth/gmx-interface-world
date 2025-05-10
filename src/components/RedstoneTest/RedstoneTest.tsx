import React, { useEffect, useState, useCallback } from 'react';
import { getActiveDeployment } from 'lib/worldchain/customDeployment';
import { getOracleKeeperService } from 'lib/redstone/OracleKeeperService';
import DeploymentToggle from 'components/DeploymentToggle';

import './RedstoneTest.css';

interface PriceData {
  symbol: string;
  price: number | null;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

const TEST_TOKENS = ['WLD', 'ETH', 'BTC', 'WWORLD'];

/**
 * Component to test the RedStone integration
 */
const RedstoneTest: React.FC = () => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [activeDeployment, setActiveDeployment] = useState<ReturnType<typeof getActiveDeployment> | undefined>(undefined);

  // Initialize price data
  useEffect(() => {
    const initialPrices: Record<string, PriceData> = {};
    TEST_TOKENS.forEach(symbol => {
      initialPrices[symbol] = {
        symbol,
        price: null,
        status: 'loading'
      };
    });
    setPrices(initialPrices);
    setActiveDeployment(getActiveDeployment());
  }, []);

  // Fetch prices from Oracle Keeper
  const fetchPrices = useCallback(async (): Promise<void> => {
    try {
      // Get the Oracle Keeper service
      const oracleKeeper = getOracleKeeperService();
      
      // First check if Oracle Keeper service is healthy
      const isHealthy = await oracleKeeper.isHealthy();
      if (!isHealthy) {
        console.error('Oracle Keeper service is not healthy');
        throw new Error('Oracle Keeper service is not healthy');
      }
      
      try {
        // Fetch all prices at once
        const pricesResponse = await oracleKeeper.getPrices();
        
        // Update state with all retrieved prices
        for (const symbol of TEST_TOKENS) {
          const price = pricesResponse.prices[symbol];
          setPrices(prev => ({
            ...prev,
            [symbol]: {
              symbol,
              price: price || null,
              status: price ? 'success' : 'error',
              error: price ? undefined : 'Price not available'
            }
          }));
        }
      } catch (error) {
        // If batch fetch fails, try individual fetches
        console.warn('Batch price fetch failed, trying individual fetches');
        
        // Update prices one by one to show progress
        for (const symbol of TEST_TOKENS) {
          try {
            const priceResponse = await oracleKeeper.getPrice(symbol);
            setPrices(prev => ({
              ...prev,
              [symbol]: {
                symbol,
                price: priceResponse.price,
                status: 'success',
                error: undefined
              }
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error fetching ${symbol} price:`, error);
            setPrices(prev => ({
              ...prev,
              [symbol]: {
                symbol,
                price: null,
                status: 'error',
                error: errorMessage
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return (
    <div className="RedstoneTest">
      <h2>RedStone Integration Test</h2>
      
      <DeploymentToggle />
      
      <div className="deployment-details">
        <h3>Active Deployment Details</h3>
        {activeDeployment ? (
          <div className="details-grid">
            <div className="detail-row">
              <div className="detail-label">RedStone Price Feed:</div>
              <div className="detail-value">
                <a
                  href={`https://explorer.world.computer/address/${activeDeployment.redStonePriceFeed}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activeDeployment.redStonePriceFeed}
                </a>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Vault Price Feed:</div>
              <div className="detail-value">
                <a
                  href={`https://explorer.world.computer/address/${activeDeployment.vaultPriceFeed}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activeDeployment.vaultPriceFeed}
                </a>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Vault:</div>
              <div className="detail-value">
                <a
                  href={`https://explorer.world.computer/address/${activeDeployment.vault}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {activeDeployment.vault}
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading">Loading deployment details...</div>
        )}
      </div>
      
      <div className="price-table">
        <h3>Live RedStone Prices</h3>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price (USD)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(prices).map((data) => (
              <tr key={data.symbol} className={`price-row ${data.status}`}>
                <td>{data.symbol}</td>
                <td>
                  {data.price !== null
                    ? `$${data.price.toFixed(2)}`
                    : 'N/A'}
                </td>
                <td className="status-cell">
                  {data.status === 'loading' && 'Loading...'}
                  {data.status === 'success' && '✅'}
                  {data.status === 'error' && (
                    <div className="error-message">{data.error || 'Error'}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="info-box">
        <h3>Integration Notes</h3>
        <ul>
          <li>The custom deployment uses RedStone price feeds for accurate on-chain data</li>
          <li>RedStone uses a unique approach where price data is delivered in transaction calldata</li>
          <li>This requires using the RedStone EVM Connector to wrap contract calls</li>
          <li>Toggle between original and custom deployments to compare behavior</li>
        </ul>
      </div>
    </div>
  );
};

export default RedstoneTest;
