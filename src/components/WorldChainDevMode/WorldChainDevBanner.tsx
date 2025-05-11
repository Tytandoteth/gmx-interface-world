import React from 'react';
import { useWorldChain } from 'context/WorldChainContext';
import { WORLD } from 'sdk/configs/chains';
import { useChainId } from 'lib/chains';
import './WorldChainDevMode.css';

/**
 * Banner component that displays when using World Chain in development mode.
 * Provides relevant information about available functionality and development status.
 */
export function WorldChainDevBanner(): JSX.Element | null {
  const { isWorldChain, isDevMode, mockDataAvailable, oracleData } = useWorldChain();
  
  // Only show the banner when on World Chain in development mode
  if (!isWorldChain || !isDevMode) {
    return null;
  }
  
  return (
    <div className="world-chain-dev-banner">
      <div className="world-chain-dev-banner-content">
        <h3>World Chain Development Mode</h3>
        <p>You are using World Chain (ID: {WORLD}) in development mode. Some features may be limited.</p>
        
        <div className="world-chain-dev-status">
          <div className={`status-indicator ${mockDataAvailable ? 'status-success' : 'status-error'}`}>
            Oracle Status: {mockDataAvailable ? 'Online' : 'Offline'}
          </div>
          
          {mockDataAvailable && oracleData.prices && (
            <div className="price-data">
              <p>Current prices:</p>
              <ul>
                {Object.entries(oracleData.prices).map(([token, price]) => (
                  <li key={token}>
                    {token}: ${typeof price === 'number' ? price.toFixed(2) : 'N/A'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {!mockDataAvailable && (
            <div className="error-message">
              <p>Oracle Keeper is offline. Please ensure the service is running at: <code>https://oracle-keeper.kevin8396.workers.dev</code></p>
              <p>Error: {oracleData.error?.message || 'Connection error'}</p>
            </div>
          )}
        </div>
        
        <div className="world-chain-dev-notice">
          <h4>Development Notes:</h4>
          <ul>
            <li>Market data is provided by a local Oracle Keeper</li>
            <li>Contract interactions may not be fully functional</li>
            <li>Use this mode for UI testing and development only</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
