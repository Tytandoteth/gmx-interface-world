import React, { useEffect, useState } from 'react';

import { useOraclePrices } from 'context/OraclePricesContext';

import './PriceValidator.css';

/**
 * Component for validating that Oracle Keeper price integration is working properly
 * Shows real-time prices and connection status to help debug any issues
 */
interface PriceValidatorProps {
  pollInterval?: number;
}

const PriceValidator: React.FC<PriceValidatorProps> = ({ pollInterval: _pollInterval }) => {
  // We can't directly pass pollInterval to useOraclePrices as it doesn't accept arguments
  // But we can use the global context value which is configured in App.tsx
  const { prices, loading, error, lastUpdated, refresh } = useOraclePrices();
  
  // Note: pollInterval is passed from parent but used at the OraclePricesProvider level
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // Check connection status whenever price data changes
  useEffect(() => {
    if (error) {
      setConnectionStatus('error');
    } else if (Object.keys(prices).length > 0) {
      setConnectionStatus('connected');
    } else if (!loading) {
      setConnectionStatus('disconnected');
    }
  }, [prices, loading, error]);

  const handleManualRefresh = () => {
    void refresh();
  };

  // Format timestamp to readable format
  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="price-validator">
      <div className="validator-header">
        <h3>Oracle Keeper Price Validator</h3>
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? '✅ Connected' : 
           connectionStatus === 'error' ? '❌ Error' : '❓ Disconnected'}
        </div>
      </div>

      <div className="validator-actions">
        <button 
          onClick={handleManualRefresh} 
          disabled={loading}
          className="refresh-button"
        >
          {loading ? 'Refreshing...' : 'Refresh Prices'}
        </button>
        <div className="last-updated">
          Last updated: {formatTimestamp(lastUpdated)}
        </div>
      </div>

      {error && (
        <div className="validator-error">
          Error: {error.message}
        </div>
      )}

      <div className="price-table">
        <div className="table-header">
          <div className="token-column">Token</div>
          <div className="price-column">Price</div>
          <div className="source-column">Source</div>
        </div>
        {Object.entries(prices).map(([symbol, price]) => (
          <div key={symbol} className="price-row">
            <div className="token-column">{symbol}</div>
            <div className="price-column">${price.reference.toFixed(4)}</div>
            <div className="source-column">{price.source || 'Unknown'}</div>
          </div>
        ))}
        {Object.keys(prices).length === 0 && !loading && (
          <div className="empty-state">
            No price data available
          </div>
        )}
        {loading && Object.keys(prices).length === 0 && (
          <div className="loading-state">
            Loading prices...
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceValidator;
