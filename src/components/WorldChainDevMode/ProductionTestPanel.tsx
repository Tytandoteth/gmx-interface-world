import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { useWorldChain } from 'context/WorldChainContext/WorldChainProvider';
import { useSigner } from 'lib/wallet';
import { testIntegration, validateProductionReadiness } from 'lib/redstone/testUtility';
import { useChainId } from 'lib/chains';

const PanelContainer = styled.div`
  background-color: #18191a;
  border: 1px solid #303234;
  border-radius: 4px;
  padding: 16px;
  margin: 16px;
  width: 100%;
  max-width: 800px;
  color: white;
  
  @media (max-width: 900px) {
    margin: 16px 8px;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PanelTitle = styled.h2`
  font-size: 18px;
  margin: 0;
`;

const TestButton = styled.button`
  background-color: #3d74ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #2c5cd7;
  }
  
  &:disabled {
    background-color: #303234;
    cursor: not-allowed;
  }
`;

const ResultsContainer = styled.div`
  background-color: #222;
  border-radius: 4px;
  padding: 12px;
  overflow: auto;
  max-height: 400px;
  margin-top: 16px;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #303234;
`;

const StatusBadge = styled.span<{ status: 'success' | 'error' | 'warning' }>`
  background-color: ${({ status }) => 
    status === 'success' 
      ? '#4caf50' 
      : status === 'warning' 
        ? '#ff9800' 
        : '#f44336'};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
`;

const Timestamp = styled.span`
  color: #999;
  font-size: 12px;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid #303234;
`;

const Tab = styled.button<{ active: boolean }>`
  background-color: transparent;
  color: ${({ active }) => (active ? 'white' : '#999')};
  border: none;
  border-bottom: ${({ active }) => (active ? '2px solid #3d74ff' : 'none')};
  padding: 8px 16px;
  cursor: pointer;
  font-weight: ${({ active }) => (active ? 'bold' : 'normal')};
  transition: color 0.2s;
  
  &:hover {
    color: white;
  }
`;

const IssuesList = styled.ul`
  margin: 0;
  padding: 0 0 0 20px;
  
  li {
    margin-bottom: 4px;
    color: #f44336;
  }
`;

const PriceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  
  th, td {
    text-align: left;
    padding: 8px;
    border-bottom: 1px solid #303234;
  }
  
  th {
    color: #999;
    font-weight: normal;
  }
`;

const ConfigStatus = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #303234;
  
  &:last-child {
    border-bottom: none;
  }
`;

/**
 * Component for testing production readiness of the GMX World Chain integration
 * Allows running tests for both development and production modes
 */
export const ProductionTestPanel: React.FC = () => {
  const { chainId } = useChainId();
  const { signer } = useSigner();
  const { 
    isWorldChain, 
    isProductionMode, 
    oracleData, 
    getTokenPrice 
  } = useWorldChain();
  
  const [activeTab, setActiveTab] = useState<'test' | 'validation'>('test');
  const [testResults, setTestResults] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<{
    ready: boolean;
    issues: string[];
  } | null>(null);
  
  // Run integration test
  const runTest = useCallback(async (): Promise<void> => {
    if (!isWorldChain) return;
    
    setIsLoading(true);
    try {
      const results = await testIntegration(
        signer as ethers.Signer,
        chainId,
        getTokenPrice,
        oracleData.prices,
      );
      setTestResults(results);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Test failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isWorldChain, signer, chainId, getTokenPrice, oracleData.prices]);
  
  // Run production validation
  const runValidation = useCallback((): void => {
    const results = validateProductionReadiness();
    setValidationResults(results);
  }, []);
  
  if (!isWorldChain) {
    return null;
  }
  
  return (
    <PanelContainer>
      <PanelHeader>
        <PanelTitle>
          World Chain Production Testing
        </PanelTitle>
        <TestButton 
          onClick={activeTab === 'test' ? runTest : runValidation} 
          disabled={isLoading}
        >
          {isLoading 
            ? 'Running Test...' 
            : activeTab === 'test' 
              ? 'Run Integration Test' 
              : 'Validate Config'
          }
        </TestButton>
      </PanelHeader>
      
      <TabContainer>
        <Tab 
          active={activeTab === 'test'} 
          onClick={() => setActiveTab('test')}
        >
          Integration Test
        </Tab>
        <Tab 
          active={activeTab === 'validation'} 
          onClick={() => {
            setActiveTab('validation');
            // Run validation automatically when switching to tab
            runValidation();
          }}
        >
          Production Readiness
        </Tab>
      </TabContainer>
      
      {activeTab === 'test' && testResults && (
        <ResultsContainer>
          <ResultsHeader>
            <div>
              <StatusBadge 
                status={
                  testResults.overallStatus === 'success' 
                    ? 'success' 
                    : testResults.overallStatus === 'partial' 
                      ? 'warning' 
                      : 'error'
                }
              >
                {testResults.overallStatus.toUpperCase()}
              </StatusBadge>
              &nbsp;
              <span>
                Mode: {testResults.mode.toUpperCase()}
              </span>
            </div>
            <Timestamp>
              {new Date(testResults.timestamp).toLocaleString()}
            </Timestamp>
          </ResultsHeader>
          
          <ConfigStatus>
            <span>Oracle Keeper</span>
            <StatusBadge 
              status={testResults.oracleKeeperStatus === 'active' ? 'success' : 'error'}
            >
              {testResults.oracleKeeperStatus.toUpperCase()}
            </StatusBadge>
          </ConfigStatus>
          
          <ConfigStatus>
            <span>Contracts</span>
            <StatusBadge 
              status={
                testResults.contractsStatus === 'active' 
                  ? 'success' 
                  : testResults.mode === 'development' && testResults.contractsStatus === 'loading' 
                    ? 'warning' 
                    : 'error'
              }
            >
              {testResults.contractsStatus === 'loading' && testResults.mode === 'development'
                ? 'MOCK'
                : testResults.contractsStatus.toUpperCase()
              }
            </StatusBadge>
          </ConfigStatus>
          
          <h3>Price Feeds</h3>
          <PriceTable>
            <thead>
              <tr>
                <th>Token</th>
                <th>Status</th>
                <th>Source</th>
                <th>Mock Price</th>
                <th>Live Price</th>
              </tr>
            </thead>
            <tbody>
              {testResults.priceFeeds.map((feed: any) => (
                <tr key={feed.token}>
                  <td>{feed.token}</td>
                  <td>
                    <StatusBadge status={feed.status === 'success' ? 'success' : 'error'}>
                      {feed.status.toUpperCase()}
                    </StatusBadge>
                  </td>
                  <td>{feed.source.toUpperCase()}</td>
                  <td>{feed.mockPrice !== null ? `$${feed.mockPrice.toFixed(2)}` : 'N/A'}</td>
                  <td>{feed.livePrice !== null ? `$${feed.livePrice.toFixed(2)}` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </PriceTable>
        </ResultsContainer>
      )}
      
      {activeTab === 'validation' && validationResults && (
        <ResultsContainer>
          <ResultsHeader>
            <div>
              <StatusBadge status={validationResults.ready ? 'success' : 'error'}>
                {validationResults.ready ? 'READY' : 'NOT READY'}
              </StatusBadge>
              &nbsp;
              <span>
                Production Readiness Validation
              </span>
            </div>
          </ResultsHeader>
          
          {validationResults.issues.length > 0 ? (
            <>
              <p>The following issues need to be resolved before going to production:</p>
              <IssuesList>
                {validationResults.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </IssuesList>
            </>
          ) : (
            <p>All configuration checks passed. The system is ready for production deployment.</p>
          )}
        </ResultsContainer>
      )}
      
      {activeTab === 'test' && !testResults && (
        <p>Click the button above to run an integration test in the current mode ({isProductionMode ? 'production' : 'development'}).</p>
      )}
    </PanelContainer>
  );
};

export default ProductionTestPanel;
