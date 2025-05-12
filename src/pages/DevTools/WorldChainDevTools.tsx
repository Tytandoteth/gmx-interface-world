import React from 'react';
import styled from 'styled-components';

import { useWorldChain } from 'context/WorldChainContext/WorldChainProvider';
import { getPageTitle } from 'lib/legacy';

import Card from 'components/Common/Card';
import SEO from 'components/Common/SEO';
import Footer from 'components/Footer/Footer';
import { 
  ProductionTestPanel, 
  ProductionModeToggle, 
  LivePriceDisplay 
} from 'components/WorldChainDevMode';

const StyledCard = styled(Card)`
  max-width: 900px;
  margin: 0 auto 0.8rem auto;
`;

const Container = styled.div`
  margin: 0 auto;
  max-width: 900px;
  padding: 4.6rem 0 1.5rem;
  
  @media (max-width: 900px) {
    padding: 4.6rem 1rem 1.5rem;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: white;
`;



const Description = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
  padding: 0 1rem;
`;

const CardContent = styled.div`
  padding: 1.5rem 1rem;
`;

const Divider = styled.div`
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 2rem 0;
`;

const StatusItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const StatusLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
`;

const StatusValue = styled.div<{ status?: 'success' | 'error' | 'warning' }>`
  color: ${({ status }) => 
    status === 'success' 
      ? '#4caf50' 
      : status === 'warning' 
        ? '#ff9800' 
        : status === 'error'
          ? '#f44336'
          : 'white'};
  font-weight: ${({ status }) => (status ? 'bold' : 'normal')};
`;

function WorldChainDevTools(): JSX.Element {
  const { 
    isWorldChain, 
    isDevMode, 
    isProductionMode, 
    oracleData,
    contracts
  } = useWorldChain();

  return (
    <div className="default-container page-layout">
      <SEO
        title={getPageTitle("World Chain Developer Tools")}
        description="Developer tools for World Chain GMX integration"
      />
      
      <Container>
        <Title>World Chain Developer Tools</Title>
        
        <Description>
          These tools are designed to help test and validate the World Chain GMX integration
          as it transitions from development to production mode.
        </Description>
        
        <StyledCard title="Environment Status">
          <CardContent>
            <Description>
              Current system configuration and runtime status.
            </Description>
            
            <StatusItem>
              <StatusLabel>Chain</StatusLabel>
              <StatusValue status={isWorldChain ? 'success' : 'error'}>
                {isWorldChain ? 'World Chain' : 'Not World Chain'}
              </StatusValue>
            </StatusItem>
            
            <StatusItem>
              <StatusLabel>Mode</StatusLabel>
              <StatusValue status={isProductionMode ? 'success' : 'warning'}>
                {isProductionMode ? 'Production' : 'Development'}
              </StatusValue>
            </StatusItem>
            
            <StatusItem>
              <StatusLabel>Development Features</StatusLabel>
              <StatusValue status={isDevMode ? 'warning' : 'success'}>
                {isDevMode ? 'Enabled' : 'Disabled'}
              </StatusValue>
            </StatusItem>
            
            <StatusItem>
              <StatusLabel>Oracle Data</StatusLabel>
              <StatusValue 
                status={
                  oracleData.error 
                    ? 'error' 
                    : oracleData.isLoading 
                      ? 'warning' 
                      : 'success'
                }
              >
                {oracleData.error 
                  ? 'Error' 
                  : oracleData.isLoading 
                    ? 'Loading' 
                    : `Available (${Object.keys(oracleData.prices || {}).length} prices)`}
              </StatusValue>
            </StatusItem>
            
            <StatusItem>
              <StatusLabel>Witnet Price Router</StatusLabel>
              <StatusValue 
                status={
                  isProductionMode
                    ? contracts.vault && contracts.router && contracts.witnetPriceRouter
                      ? 'success'
                      : 'error'
                    : 'warning'
                }
              >
                {isProductionMode
                  ? contracts.vault && contracts.router && contracts.priceFeed
                    ? 'Connected'
                    : 'Not Connected'
                  : 'Using Mock Data (Development Mode)'}
              </StatusValue>
            </StatusItem>
            
            <Divider />
            
            <ProductionModeToggle />
          </CardContent>
        </StyledCard>
        
        <StyledCard title="Live Oracle Price Feed">
          <CardContent>
            <Description>
              Real-time price data from the Oracle Keeper service.
            </Description>
            <LivePriceDisplay pollInterval={10000} />
          </CardContent>
        </StyledCard>

        <StyledCard title="Production Readiness Testing">
          <CardContent>
            <Description>
              Tools to verify that the World Chain GMX integration is ready for production.
              Run tests in both development and production modes to validate functionality.
            </Description>
            
            <ProductionTestPanel />
          </CardContent>
        </StyledCard>
      </Container>
      
      <Footer />
    </div>
  );
}

export default WorldChainDevTools;
