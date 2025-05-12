import React, { useMemo } from 'react';
import styled from 'styled-components';

import { useOraclePrices } from 'context/OraclePricesContext';
import { formatAmount } from 'lib/numbers';

const USD_DECIMALS = 30;

// Main container for the price card
const PriceCardContainer = styled.div`
  background: rgba(38, 43, 55, 0.5);
  border-radius: 6px;
  padding: 15px;
  border: 1px solid rgba(58, 63, 75, 0.5);
  margin-bottom: 15px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TokenHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TokenName = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #FFFFFF;
`;

const PriceValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  font-family: 'Relative', monospace;
  color: #FFFFFF;
`;

const TokenDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 5px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
`;

const DetailLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
`;

const DetailValue = styled.div`
  color: white;
`;

const SourceBadge = styled.div<{ source: string }>`
  font-size: 0.8rem;
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
  align-self: flex-start;
`;

interface TokenPriceCardProps {
  token: string;
  className?: string;
  showDetails?: boolean;
}

/**
 * A detailed card component to display token price information from Oracle Keeper
 */
const TokenPriceCard: React.FC<TokenPriceCardProps> = ({
  token,
  className,
  showDetails = true,
}) => {
  const { prices, loading, lastUpdated, refresh } = useOraclePrices();
  const tokenPrice = prices[token];

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return 'Unknown';
    return new Date(lastUpdated).toLocaleString();
  }, [lastUpdated]);
  
  if (loading && !tokenPrice) {
    return (
      <PriceCardContainer className={className}>
        <TokenHeader>
          <TokenName>{token}</TokenName>
          <div>Loading...</div>
        </TokenHeader>
      </PriceCardContainer>
    );
  }

  if (!tokenPrice) {
    return (
      <PriceCardContainer className={className}>
        <TokenHeader>
          <TokenName>{token}</TokenName>
          <div>Price unavailable</div>
        </TokenHeader>
        {showDetails && (
          <TokenDetails>
            <DetailRow>
              <DetailLabel>Status:</DetailLabel>
              <DetailValue>No data available</DetailValue>
            </DetailRow>
            <DetailRow>
              <button 
                onClick={() => refresh()} 
                className="btn-primary btn-sm"
              >
                Refresh
              </button>
            </DetailRow>
          </TokenDetails>
        )}
      </PriceCardContainer>
    );
  }

  return (
    <PriceCardContainer className={className}>
      <TokenHeader>
        <TokenName>{token}</TokenName>
        <PriceValue>
          ${formatAmount(tokenPrice.reference, USD_DECIMALS, 4, true)}
        </PriceValue>
      </TokenHeader>
      
      {tokenPrice.source && (
        <SourceBadge source={tokenPrice.source}>
          {tokenPrice.source}
        </SourceBadge>
      )}
      
      {showDetails && (
        <TokenDetails>
          <DetailRow>
            <DetailLabel>Last Updated:</DetailLabel>
            <DetailValue>{formattedLastUpdated}</DetailValue>
          </DetailRow>
          {tokenPrice.lastUpdated && (
            <DetailRow>
              <DetailLabel>Price Updated:</DetailLabel>
              <DetailValue>{new Date(tokenPrice.lastUpdated).toLocaleString()}</DetailValue>
            </DetailRow>
          )}
          <DetailRow>
            <button 
              onClick={() => refresh()} 
              className="btn-primary btn-sm"
            >
              Refresh
            </button>
          </DetailRow>
        </TokenDetails>
      )}
    </PriceCardContainer>
  );
};

export default TokenPriceCard;
