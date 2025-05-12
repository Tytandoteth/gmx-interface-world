import React, { useState } from 'react';

import { useWorldChain } from 'context/WorldChainContext';
import './WorldChainDevMode.css';

/**
 * Banner component that displays when using World Chain in development mode.
 * Provides relevant information about available functionality and development status.
 */
export function WorldChainDevBanner(): JSX.Element | null {
  const { isWorldChain, isDevMode, mockDataAvailable, oracleData } = useWorldChain();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Only show the banner when on World Chain in development mode
  if (!isWorldChain || !isDevMode) {
    return null;
  }
  
  // Handle minimize/maximize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsExpanded(false); // Always collapse details when minimizing
  };
  
  // Handle expand/collapse details
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className={`world-chain-dev-banner ${isMinimized ? 'minimized' : ''}`}>
      <div className="world-chain-dev-banner-controls">
        <button onClick={toggleMinimize} className="banner-control-button">
          {isMinimized ? '🔽' : '🔼'}
        </button>
      </div>
      
      <div className="world-chain-dev-banner-content">
        <div className="banner-header">
          <h3>World Chain Development Mode</h3>
          <div className={`status-pill ${mockDataAvailable ? 'status-success' : 'status-error'}`}>
            Oracle: {mockDataAvailable ? 'Online' : 'Offline'}
          </div>
          {!isMinimized && (
            <button onClick={toggleExpand} className="details-toggle">
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          )}
        </div>
        
        {!isMinimized && (
          <>
            {isExpanded && (
              <>
                <div className="world-chain-dev-status">
                  {mockDataAvailable && oracleData.prices && (
                    <div className="price-data">
                      <p>Current prices:</p>
                      <div className="price-grid">
                        {Object.entries(oracleData.prices).map(([token, price]) => (
                          <div key={token} className="price-item">
                            {token}: ${typeof price === 'number' ? price.toFixed(2) : 'N/A'}
                          </div>
                        ))}
                      </div>
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
