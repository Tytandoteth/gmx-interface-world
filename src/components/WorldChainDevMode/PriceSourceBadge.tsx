import React from 'react';
import styled from 'styled-components';
import { useOraclePrices } from 'context/OraclePricesContext';

const Badge = styled.span<{ source: string }>`
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
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

/**
 * Component to display the current price data source
 */
const PriceSourceBadge: React.FC = () => {
  const { prices } = useOraclePrices();
  
  // Get the first token with a source
  const firstToken = Object.values(prices)[0];
  const source = firstToken?.source || 'Unknown';
  
  return (
    <Badge source={source}>
      Source: {source}
    </Badge>
  );
};

export default PriceSourceBadge;
