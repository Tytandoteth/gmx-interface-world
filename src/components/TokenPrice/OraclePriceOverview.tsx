import React from 'react';
import styled from 'styled-components';

import { useOraclePrices } from 'context/OraclePricesContext';
import { useChainId } from 'lib/chains';
import { isWorldChain } from 'lib/worldchain';

import TokenPriceDisplay from './TokenPriceDisplay';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(38, 43, 55, 0.5);
  border-radius: 4px;
  border: 1px solid rgba(58, 63, 75, 0.5);
  padding: 16px;
  margin-top: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 500;
`;

const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
`;

const PriceItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TokenLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const LastUpdatedText = styled.div`
  font-size: 12px;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.7);
`;

interface OraclePriceOverviewProps {
  tokens?: string[];
  showSources?: boolean;
  title?: string;
  className?: string;
}

/**
 * A component to display Oracle Keeper prices in an overview format
 * Suitable for dashboard display
 */
const OraclePriceOverview: React.FC<OraclePriceOverviewProps> = ({
  tokens = ['WLD', 'WETH', 'MAG'],
  showSources = true,
  title = 'Oracle Prices',
  className,
}) => {
  const { prices, loading, lastUpdated, refresh } = useOraclePrices();
  const { chainId } = useChainId();
  
  // Don't show on non-World Chain networks
  if (!isWorldChain(chainId)) {
    return null;
  }

  // Display loading state if no prices are available yet
  if (loading && Object.keys(prices).length === 0) {
    return (
      <Container className={className}>
        <Header>
          <Title>{title}</Title>
        </Header>
        <div>Loading price data...</div>
      </Container>
    );
  }

  // Only show tokens that have prices available
  const availableTokens = tokens.filter(token => prices[token]);
  
  if (availableTokens.length === 0) {
    return (
      <Container className={className}>
        <Header>
          <Title>{title}</Title>
          <button className="btn-primary btn-sm" onClick={refresh}>
            Refresh
          </button>
        </Header>
        <div>No price data available</div>
      </Container>
    );
  }

  return (
    <Container className={className}>
      <Header>
        <Title>{title}</Title>
        <button className="btn-primary btn-sm" onClick={refresh}>
          Refresh
        </button>
      </Header>
      <PriceGrid>
        {availableTokens.map(token => (
          <PriceItem key={token}>
            <TokenLabel>{token}</TokenLabel>
            <TokenPriceDisplay 
              token={token} 
              showSource={showSources}
              precision={4}
            />
          </PriceItem>
        ))}
      </PriceGrid>
      {lastUpdated && (
        <LastUpdatedText>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </LastUpdatedText>
      )}
    </Container>
  );
};

export default OraclePriceOverview;
