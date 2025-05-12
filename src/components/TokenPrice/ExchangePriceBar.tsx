import React from 'react';
import styled from 'styled-components';

import { useOraclePrices } from 'context/OraclePricesContext';
import { useChainId } from 'lib/chains';
import { isWorldChain } from 'lib/worldchain';

import TokenPriceDisplay from './TokenPriceDisplay';

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  background: rgba(38, 43, 55, 0.5);
  border-radius: 4px;
  border: 1px solid rgba(58, 63, 75, 0.5);
  padding: 10px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 500;
  margin-right: 8px;
  white-space: nowrap;
`;

const PriceWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
`;

const PriceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(31, 36, 46, 0.5);
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
`;

const TokenSymbol = styled.span`
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
`;

const RefreshButton = styled.button`
  background: rgba(59, 130, 246, 0.2);
  color: rgb(59, 130, 246);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: rgba(59, 130, 246, 0.3);
  }
`;

interface ExchangePriceBarProps {
  className?: string;
}

/**
 * A horizontal bar displaying Oracle Keeper prices
 * Suitable for exchange/trading pages
 */
const ExchangePriceBar: React.FC<ExchangePriceBarProps> = ({
  className,
}) => {
  const { prices, loading, refresh } = useOraclePrices();
  const { chainId } = useChainId();
  
  // Don't show on non-World Chain networks
  if (!isWorldChain(chainId)) {
    return null;
  }

  // Define priority tokens - these are important for the Exchange
  const priorityTokens = ["WLD", "WETH", "MAG"];
  
  // Filter for tokens that have prices
  const availableTokens = priorityTokens.filter(token => prices[token]);
  
  if (availableTokens.length === 0 && !loading) {
    return null;
  }

  return (
    <Container className={className}>
      <Title>Oracle Prices:</Title>
      <PriceWrapper>
        {loading && availableTokens.length === 0 ? (
          <div>Loading prices...</div>
        ) : (
          availableTokens.map(token => (
            <PriceItem key={token}>
              <TokenSymbol>{token}</TokenSymbol>
              <TokenPriceDisplay 
                token={token} 
                showSource={false}
                precision={4}
              />
            </PriceItem>
          ))
        )}
      </PriceWrapper>
      <RefreshButton onClick={refresh}>
        Refresh
      </RefreshButton>
    </Container>
  );
};

export default ExchangePriceBar;
