import React from 'react';

import styled from 'styled-components';

import { useDirectPrices } from 'domain/prices/useDirectPrices';
import { formatAmount } from 'lib/numbers';

const Container = styled.div`
  margin-bottom: 1.5rem;
  width: 100%;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: white;
`;

const PriceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  background-color: rgba(30, 34, 61, 0.5);
  border-radius: 4px;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;

const TableCell = styled.td`
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const SourceBadge = styled.span<{ source: string }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-left: 5px;
  background-color: ${(props) => {
    // Different background colors based on the source
    if (props.source.includes('CoinGecko')) return 'rgba(22, 199, 132, 0.2)';
    if (props.source.includes('Witnet')) return 'rgba(59, 130, 246, 0.2)';
    if (props.source.includes('Emergency')) return 'rgba(239, 68, 68, 0.2)';
    if (props.source.includes('Mock')) return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(107, 114, 128, 0.2)';
  }};
  color: ${(props) => {
    // Different text colors based on the source
    if (props.source.includes('CoinGecko')) return 'rgb(22, 199, 132)';
    if (props.source.includes('Witnet')) return 'rgb(59, 130, 246)';
    if (props.source.includes('Emergency')) return 'rgb(239, 68, 68)';
    if (props.source.includes('Mock')) return 'rgb(245, 158, 11)';
    return 'rgb(107, 114, 128)';
  }};
`;

const RefreshButton = styled.button`
  background-color: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

type LivePriceDisplayProps = {
  title?: string;
  pollInterval?: number;
  tokens?: string[];
};

/**
 * Component to display real-time prices from the Oracle Keeper
 */
const LivePriceDisplay: React.FC<LivePriceDisplayProps> = ({ 
  title = "Live Oracle Prices", 
  pollInterval = 15000,
  tokens = ["WLD", "WETH", "MAG"]
}) => {
  const { prices, loading, lastUpdated, refresh } = useDirectPrices({
    pollInterval,
    tokens
  });

  return (
    <Container>
      <Title>{title}</Title>
      
      <PriceTable>
        <thead>
          <tr>
            <TableHeader>Token</TableHeader>
            <TableHeader>Price (USD)</TableHeader>
            <TableHeader>Source</TableHeader>
            <TableHeader>Last Updated</TableHeader>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const price = prices[token];
            return (
              <tr key={token}>
                <TableCell>{token}</TableCell>
                <TableCell>
                  {price ? formatAmount(price.reference, USD_DECIMALS, 4, true) : 'Loading...'}
                </TableCell>
                <TableCell>
                  {price?.source ? (
                    <SourceBadge source={price.source}>{price.source}</SourceBadge>
                  ) : 'Unknown'}
                </TableCell>
                <TableCell>
                  {price?.lastUpdated ? new Date(price.lastUpdated).toLocaleString() : '-'}
                </TableCell>
              </tr>
            );
          })}
        </tbody>
      </PriceTable>
      
      <StatusRow>
        <span>
          Status: {loading ? 'Updating...' : 'Ready'}
          {lastUpdated && ` • Last refresh: ${new Date(lastUpdated).toLocaleString()}`}
        </span>
        <RefreshButton onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </RefreshButton>
      </StatusRow>
    </Container>
  );
};

export default LivePriceDisplay;

// USD_DECIMALS is 30, but we need to define it here to avoid circular dependencies
const USD_DECIMALS = 30;
