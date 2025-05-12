import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import { useWorldChain } from 'context/WorldChainContext/WorldChainProvider';

// Status bar colors
const STATUS_COLORS = {
  production: '#4caf50', // Green
  development: '#ff9800', // Orange
  error: '#f44336', // Red
  loading: '#2196f3', // Blue
};

interface StatusItemProps {
  label: string;
  status: 'production' | 'development' | 'error' | 'loading';
  detail?: string;
}

const ProductionStatusContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  font-size: 0.75rem;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #333;
`;

const StatusBadge = styled.div<{ color: string }>`
  display: inline-block;
  padding: 2px 6px;
  margin: 0 5px;
  border-radius: 4px;
  background-color: ${(props) => props.color};
  color: white;
  font-weight: bold;
  font-size: 0.7rem;
`;

const StatusGroup = styled.div`
  display: flex;
  align-items: center;
`;

const StatusLabel = styled.span`
  margin-right: 4px;
`;

const DetailButton = styled.button`
  background: none;
  border: none;
  color: #2196f3;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0;
  margin-left: 5px;
`;

const StatusDetail = styled.div`
  position: absolute;
  bottom: 40px;
  left: 10px;
  background-color: #424242;
  border-radius: 4px;
  padding: 10px;
  max-width: 400px;
  font-size: 0.75rem;
  z-index: 1001;
  border: 1px solid #555;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: monospace;
    max-height: 200px;
    overflow-y: auto;
  }
`;

const CloseDetailButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
`;

/**
 * Status item component showing a specific system status
 */
const StatusItem: React.FC<StatusItemProps> = ({ label, status, detail }) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <StatusGroup>
      <StatusLabel>{label}:</StatusLabel>
      <StatusBadge color={STATUS_COLORS[status]}>
        {status.toUpperCase()}
      </StatusBadge>
      {detail && (
        <>
          <DetailButton onClick={() => setShowDetail(true)}>info</DetailButton>
          {showDetail && (
            <StatusDetail>
              <CloseDetailButton onClick={() => setShowDetail(false)}>
                ✕
              </CloseDetailButton>
              <pre>{detail}</pre>
            </StatusDetail>
          )}
        </>
      )}
    </StatusGroup>
  );
};

/**
 * Displays the production/development status of the World Chain GMX interface
 * Shows status of contracts, price feeds, and Oracle Keeper integration
 */
const ProductionStatusIndicator: React.FC = () => {
  const {
    isWorldChain,
    isDevMode,
    isProductionMode,
    oracleData,
    contracts,
  } = useWorldChain();

  const [allPrices, setAllPrices] = useState<Record<string, string>>({});
  
  // Combine mock and live prices for display
  useEffect(() => {
    const combined: Record<string, string> = {};
    
    // Add oracle prices
    if (oracleData.prices) {
      Object.entries(oracleData.prices).forEach(([token, price]) => {
        combined[token] = `$${price.toFixed(2)} (Oracle)`;
      });
    }
    
    // Add contract prices if available
    setAllPrices(combined);
  }, [oracleData.prices]);
  
  // Only render the component if we're on World Chain
  if (!isWorldChain) {
    return null;
  }

  // Determine overall system status
  const systemStatus = isProductionMode ? 'production' : 'development';
  
  // Determine contract status
  const contractStatus = isProductionMode
    ? contracts.vault && contracts.router && contracts.priceFeed
      ? 'production'
      : contracts.vaultError || contracts.routerError || contracts.priceFeedError
        ? 'error'
        : 'loading'
    : 'development';

  // Determine oracle status
  const oracleStatus = oracleData.error
    ? 'error'
    : oracleData.isLoading
    ? 'loading'
    : oracleData.prices
    ? isProductionMode
      ? 'production'
      : 'development'
    : 'error';

  // Format price detail data
  const priceDetail = Object.entries(allPrices)
    .map(([token, price]) => `${token}: ${price}`)
    .join('\n');

  // Format contract detail data
  const contractDetail = isProductionMode
    ? `Vault: ${contracts.vault ? 'Connected' : contracts.vaultError ? 'Error' : 'Loading...'}\n` +
      `Router: ${contracts.router ? 'Connected' : contracts.routerError ? 'Error' : 'Loading...'}\n` +
      `PriceFeed: ${contracts.priceFeed ? 'Connected' : contracts.priceFeedError ? 'Error' : 'Loading...'}`
    : 'Using development mode with mock contracts';

  // Format oracle detail
  const oracleDetail = oracleData.error
    ? `Error: ${oracleData.error.message}`
    : oracleData.lastUpdated
    ? `Last Updated: ${new Date(oracleData.lastUpdated).toLocaleTimeString()}\n` +
      `Price Count: ${Object.keys(oracleData.prices || {}).length}`
    : 'Loading oracle data...';

  return (
    <ProductionStatusContainer>
      <StatusGroup>
        <StatusItem 
          label="System" 
          status={systemStatus} 
          detail={`Mode: ${isProductionMode ? 'Production' : 'Development'}\nDev Features: ${isDevMode ? 'Enabled' : 'Disabled'}`} 
        />
      </StatusGroup>
      
      <StatusGroup>
        <StatusItem 
          label="Contracts" 
          status={contractStatus} 
          detail={contractDetail} 
        />
        
        <StatusItem 
          label="Oracle" 
          status={oracleStatus} 
          detail={oracleDetail} 
        />
        
        <StatusItem 
          label="Prices" 
          status={oracleStatus} 
          detail={priceDetail} 
        />
      </StatusGroup>
    </ProductionStatusContainer>
  );
};

export default ProductionStatusIndicator;
