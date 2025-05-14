import React from 'react';
import styled from 'styled-components';

// Domain and lib imports
import { formatAmount } from 'lib/numbers';
import { isProductionEnvironment } from 'lib/worldchain/environmentUtils';
import { getSafeTokenSymbol } from 'lib/worldchain/tokenUtils';

// Services
import { useFormattedTokenPrice, useTokenPrice, useTokenPriceWithTrend } from 'services/TokenPriceService';

const USD_DECIMALS = 30;

// Styled components for various price display modes
const TokenPrice = styled.span<{ trend?: 'up' | 'down' | 'neutral' }>`
  font-family: 'Relative', monospace;
  color: ${(props) => {
    if (props.trend === 'up') return '#16c784';
    if (props.trend === 'down') return '#ea3943';
    return 'white';
  }};
  font-weight: 500;
`;

const LoadingPrice = styled.span`
  opacity: 0.7;
  font-style: italic;
`;

const PriceLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  margin-right: 5px;
`;

const SourceBadge = styled.span<{ source: string }>`
  font-size: 0.7rem;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 5px;
  background-color: ${(props) => {
    if (props.source.includes('CoinGecko')) return 'rgba(22, 199, 132, 0.2)';
    if (props.source.includes('Witnet')) return 'rgba(59, 130, 246, 0.2)';
    if (props.source.includes('Emergency')) return 'rgba(239, 68, 68, 0.2)';
    if (props.source.includes('Mock')) return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(107, 114, 128, 0.2)';
  }};
  color: ${(props) => {
    if (props.source.includes('CoinGecko')) return 'rgb(22, 199, 132)';
    if (props.source.includes('Witnet')) return 'rgb(59, 130, 246)';
    if (props.source.includes('Emergency')) return 'rgb(239, 68, 68)';
    if (props.source.includes('Mock')) return 'rgb(245, 158, 11)';
    return 'rgb(107, 114, 128)';
  }};
`;

interface TokenPriceDisplayProps {
  token: string;
  label?: string;
  showSource?: boolean;
  precision?: number;
  className?: string;
  fallbackPrice?: number; // Optional fallback price if token price is unavailable
  hideUnavailable?: boolean; // Optional flag to hide component if price is unavailable
}

/**
 * Component to display token prices from Oracle Keeper with enhanced safety features
 */
const TokenPriceDisplay: React.FC<TokenPriceDisplayProps> = ({
  token,
  label,
  showSource = false,
  precision = 4,
  className,
  fallbackPrice,
  hideUnavailable = false
}) => {
  // Use our enhanced token price hooks which handle safety and fallbacks internally
  const { price, isLoading, source } = useEnhancedTokenPrice(token, fallbackPrice);
  
  // Skip rendering if no price is available and hideUnavailable is true
  if (!price && hideUnavailable) {
    return null;
  }
  
  // Show loading state if loading and no fallback
  if (isLoading && !price) {
    return <LoadingPrice className={className}>Loading price...</LoadingPrice>;
  }
  
  // If no price available after all fallbacks, show unavailable message
  if (!price) {
    const safeSymbol = getSafeTokenSymbol(null, token);
    return <LoadingPrice className={className}>Price unavailable for {safeSymbol}</LoadingPrice>;
  }
  
  // Format the price display based on precision
  const formattedPrice = formatAmount(price, USD_DECIMALS, precision, true);
  
  return (
    <span className={className}>
      {label && <PriceLabel>{label}</PriceLabel>}
      <TokenPrice>
        ${formattedPrice}
      </TokenPrice>
      {showSource && source && (
        <SourceBadge source={source}>
          {source}
        </SourceBadge>
      )}
    </span>
  );
};

/**
 * Hook to get enhanced token price information including loading state and data source
 */
function useEnhancedTokenPrice(tokenSymbol: string, fallbackPrice?: number): {
  price: number | undefined;
  isLoading: boolean;
  source: string;
} {
  // Get price with fallback handling
  const price = useTokenPrice(tokenSymbol, fallbackPrice);
  
  // Get the data source from the token price context
  // This implementation doesn't expose source directly through useTokenPrice,
  // so we'll determine it based on price availability
  let source = 'Unknown';
  
  if (price) {
    if (price === fallbackPrice) {
      source = 'Fallback';
    } else {
      // In production we'd get this from the Oracle API response
      source = isProductionEnvironment() ? 'CoinGecko' : 'Development';
    }
  }
  
  // Determine loading state based on price availability
  const isLoading = false; // We no longer have loading state since our hooks handle this internally
  
  return {
    price,
    isLoading,
    source
  };
}

export default TokenPriceDisplay;

/**
 * TokenPriceCard component that shows price with trend information
 */
export const TokenPriceCard: React.FC<{
  symbol: string;
  label?: string;
  className?: string;
  showChange?: boolean;
}> = ({ symbol, label, className, showChange = true }) => {
  const { formattedPrice, trend, formattedChange, isLoading } = useTokenPriceWithTrend(symbol);
  
  if (isLoading) {
    return <LoadingPrice className={className}>Loading price...</LoadingPrice>;
  }
  
  return (
    <div className={`${className} flex flex-col`}>
      {label && <PriceLabel>{label}</PriceLabel>}
      <TokenPrice trend={trend}>{formattedPrice}</TokenPrice>
      {showChange && (
        <span className="text-xs mt-1" style={{ color: trend === 'up' ? '#16c784' : trend === 'down' ? '#ea3943' : 'inherit' }}>
          {formattedChange}
        </span>
      )}
    </div>
  );
};
