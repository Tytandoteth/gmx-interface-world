import React from 'react';
import { useTokenPrice, usePriceContext } from '../context/PriceContext';

interface TokenPriceDisplayProps {
  symbol: string;
  useTestToken?: boolean;
  className?: string;
  showChange?: boolean;
}

/**
 * Component to display token prices from the Oracle Keeper
 * Pulls data from whatever source the Oracle Keeper is using (CoinGecko, etc.)
 */
export const TokenPriceDisplay: React.FC<TokenPriceDisplayProps> = ({
  symbol,
  useTestToken = false,
  className = '',
  showChange = false
}) => {
  // Get price data from context
  const price = useTokenPrice(symbol, useTestToken);
  const { loading, error, priceSource } = usePriceContext();
  
  // Format price with appropriate precision
  const formattedPrice = React.useMemo(() => {
    if (price === null) return 'N/A';
    
    // Use more decimal places for lower-valued tokens
    if (price < 0.001) return `$${price.toFixed(6)}`;
    if (price < 0.1) return `$${price.toFixed(4)}`;
    if (price < 1) return `$${price.toFixed(3)}`;
    if (price < 1000) return `$${price.toFixed(2)}`;
    
    // Add commas for thousands
    return `$${price.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }, [price]);
  
  return (
    <div className={`token-price-display ${className} ${loading ? 'loading' : ''}`}>
      <div className="token-symbol">{symbol}</div>
      <div className="price-value">{formattedPrice}</div>
      
      {/* Show optional price change */}
      {showChange && (
        <div className="price-change positive">+2.4%</div> // Mock data, would be real in full implementation
      )}
      
      {/* Error message if applicable */}
      {error && (
        <div className="price-error">Error loading price</div>
      )}
      
      {/* Show source information if debugging */}
      {import.meta.env.DEV && (
        <div className="price-source">Source: {priceSource}</div>
      )}
    </div>
  );
};

/**
 * A grid of token prices for the dashboard
 */
export const TokenPriceGrid: React.FC = () => {
  const { loading, priceSource } = usePriceContext();
  
  // Real tokens supported by the Oracle Keeper
  const realTokens = ['WLD', 'WETH', 'MAG'];
  
  return (
    <div className="token-price-grid">
      <div className="grid-header">
        <h3>Market Prices</h3>
        <div className="source-indicator">
          Source: <span className="source-name">{priceSource}</span>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-skeleton">
          <div className="skeleton-item" />
          <div className="skeleton-item" />
          <div className="skeleton-item" />
        </div>
      ) : (
        <div className="token-grid">
          {realTokens.map(symbol => (
            <TokenPriceDisplay 
              key={symbol} 
              symbol={symbol} 
              showChange={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Small indicator that shows the current price data source (CoinGecko, etc.)
 */
export const PriceSourceBadge: React.FC = () => {
  const { priceSource, loading } = usePriceContext();
  
  return (
    <div className="price-source-badge">
      <span className="badge-label">Data:</span>
      <span className={`badge-value ${loading ? 'loading' : ''}`}>
        {priceSource}
      </span>
    </div>
  );
};
