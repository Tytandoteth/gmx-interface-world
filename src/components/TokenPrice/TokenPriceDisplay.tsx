import React from 'react';
import styled from 'styled-components';

import { useOraclePrices } from 'context/OraclePricesContext';
import { formatAmount } from 'lib/numbers';

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
}

/**
 * Component to display token prices from Oracle Keeper
 */
const TokenPriceDisplay: React.FC<TokenPriceDisplayProps> = ({
  token,
  label,
  showSource = false,
  precision = 4,
  className,
}) => {
  const { prices, loading } = useOraclePrices();
  const tokenPrice = prices[token];

  if (loading && !tokenPrice) {
    return <LoadingPrice className={className}>Loading price...</LoadingPrice>;
  }

  if (!tokenPrice) {
    return <LoadingPrice className={className}>Price unavailable</LoadingPrice>;
  }

  return (
    <span className={className}>
      {label && <PriceLabel>{label}</PriceLabel>}
      <TokenPrice>
        ${formatAmount(tokenPrice.reference, USD_DECIMALS, precision, true)}
      </TokenPrice>
      {showSource && tokenPrice.source && (
        <SourceBadge source={tokenPrice.source}>
          {tokenPrice.source}
        </SourceBadge>
      )}
    </span>
  );
};

export default TokenPriceDisplay;
