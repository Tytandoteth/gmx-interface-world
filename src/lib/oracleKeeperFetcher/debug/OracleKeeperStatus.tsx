import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';

import { LogCategory, LogLevel, DiagnosticLogger } from '../debug/diagnostics';
import { EnhancedOracleKeeperFetcher } from '../oracleKeeperEnhanced';

const logger = new DiagnosticLogger();

// Styled components for the status indicator
const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 16px;
  background-color: #f8f9fa;
`;

const StatusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const StatusTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const StatusIndicator = styled.div<{ status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
  background-color: ${(props) => {
    switch (props.status) {
      case 'healthy':
        return '#d4edda';
      case 'degraded':
        return '#fff3cd';
      case 'unhealthy':
        return '#f8d7da';
      default:
        return '#e2e3e5';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'healthy':
        return '#155724';
      case 'degraded':
        return '#856404';
      case 'unhealthy':
        return '#721c24';
      default:
        return '#383d41';
    }
  }};
`;

const StatusDetails = styled.div`
  font-size: 14px;
  margin-bottom: 10px;
`;

const StatusEntry = styled.div`
  margin-bottom: 6px;
  display: flex;
  align-items: center;
`;

const StatusLabel = styled.span`
  font-weight: 500;
  margin-right: 8px;
  width: 120px;
`;

const StatusValue = styled.span`
  font-family: monospace;
`;

const ErrorStatusValue = styled(StatusValue)`
  color: #dc3545;
`;

const RefreshButton = styled.button`
  padding: 6px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: #0069d9;
  }
  
  &:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
`;

interface OracleKeeperStatusProps {
  chainId: number;
  url?: string;
}

export const OracleKeeperStatus: React.FC<OracleKeeperStatusProps> = ({ chainId, url }) => {
  const [status, setStatus] = useState<'healthy' | 'degraded' | 'unhealthy' | 'unknown'>('unknown');
  const [lastChecked, setLastChecked] = useState<string>('Never');
  const [latency, setLatency] = useState<number | null>(null);
  const [oracleUrl, setOracleUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsRefreshing(true);
    setErrorDetails(null);
    
    const startTime = performance.now();
    const keeper = new EnhancedOracleKeeperFetcher(chainId);
    
    if (url) {
      keeper.setUrl(url);
    }
    
    setOracleUrl(keeper.url);
    
    try {
      logger.log(LogCategory.DEBUG, LogLevel.INFO, `Checking Oracle Keeper health at ${keeper.url}`);
      const isHealthy = await keeper.checkHealth();
      const endTime = performance.now();
      const latencyValue = Math.round(endTime - startTime);
      
      setLatency(latencyValue);
      
      if (isHealthy) {
        // Further determine if the service might be degraded based on latency
        if (latencyValue > 1000) {
          setStatus('degraded');
        } else {
          setStatus('healthy');
        }
      } else {
        setStatus('unhealthy');
        setErrorDetails('Health check failed');
      }
    } catch (error) {
      logger.log(LogCategory.ERROR, LogLevel.ERROR, `Oracle Keeper health check failed`, { error });
      setStatus('unhealthy');
      setErrorDetails(error instanceof Error ? error.message : String(error));
      setLatency(null);
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }
  }, [chainId, url]);

  useEffect(() => {
    checkStatus();
    
    // Set up a periodic health check
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [chainId, url, checkStatus]);

  return (
    <StatusContainer>
      <StatusHeader>
        <div>
          <StatusTitle>Oracle Keeper Status</StatusTitle>
          <StatusIndicator status={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </StatusIndicator>
        </div>
        <RefreshButton 
          onClick={checkStatus} 
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Checking...' : 'Refresh'}
        </RefreshButton>
      </StatusHeader>
      
      <StatusDetails>
        <StatusEntry>
          <StatusLabel>URL:</StatusLabel>
          <StatusValue>{oracleUrl}</StatusValue>
        </StatusEntry>
        <StatusEntry>
          <StatusLabel>Last Checked:</StatusLabel>
          <StatusValue>{lastChecked}</StatusValue>
        </StatusEntry>
        <StatusEntry>
          <StatusLabel>Latency:</StatusLabel>
          <StatusValue>{latency !== null ? `${latency}ms` : 'N/A'}</StatusValue>
        </StatusEntry>
        {errorDetails && (
          <StatusEntry>
            <StatusLabel>Error:</StatusLabel>
            <ErrorStatusValue>{errorDetails}</ErrorStatusValue>
          </StatusEntry>
        )}
      </StatusDetails>
    </StatusContainer>
  );
};
