import React, { useState } from 'react';

// Local components
import ConfigDiagnostics from './ConfigDiagnostics';
import ContractStatusPanel from './ContractStatusPanel';
import PriceSourceBadge from './PriceSourceBadge';
import PriceValidator from './PriceValidator';
import TestTokenMinter from './TestTokenMinter';
import V1Diagnostics from './V1Diagnostics';
// Styles
import './TestingPanel.css';

// Project imports
import { isTestMode } from '../../config/testTokens';

/**
 * Comprehensive testing panel that combines price validation and test token minting
 * Provides a central interface for testing the GMX integration
 */
const TestingPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prices' | 'tokens' | 'contracts' | 'diagnostics'>('prices');
  const isInTestMode = isTestMode();

  return (
    <div className="testing-panel">
      <div className="panel-header">
        <h2>World Chain GMX Testing Panel</h2>
        <div className="environment-badge">
          {isInTestMode ? (
            <span className="test-mode">Test Mode</span>
          ) : (
            <span className="prod-mode">Production Mode</span>
          )}
        </div>
        <PriceSourceBadge />
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-button ${activeTab === 'prices' ? 'active' : ''}`}
          onClick={() => setActiveTab('prices')}
        >
          Price Validation
        </button>
        <button
          className={`tab-button ${activeTab === 'tokens' ? 'active' : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          Test Tokens
        </button>
        <button
          className={`tab-button ${activeTab === 'contracts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          Contracts
        </button>
        <button
          className={`tab-button ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          Diagnostics
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'prices' && (
          <div className="price-tab">
            <PriceSourceBadge />
            <PriceValidator pollInterval={15000} />
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="tokens-tab">
            <p className="tab-description">
              Mint test tokens for trading and view current token balances.
            </p>
            {isInTestMode ? (
              <TestTokenMinter />
            ) : (
              <div className="test-mode-notice">
                <div className="notice-icon">⚠️</div>
                <div className="notice-content">
                  <h4>Test Mode Not Enabled</h4>
                  <p>
                    To use the Test Token Minter, you need to enable test mode by setting 
                    <code>VITE_USE_TEST_TOKENS=true</code> in your <code>.env.local</code> file.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="tab-content">
            <p className="tab-description">
              Check contract connectivity and view current contract addresses.
            </p>
            <ContractStatusPanel />
          </div>
        )}
        
        {activeTab === 'diagnostics' && (
          <div className="tab-content">
            <p className="tab-description">
              System diagnostics and configuration status information.
            </p>
            <ConfigDiagnostics />
            <div className="mt-4"></div>
            <V1Diagnostics />
          </div>
        )}
      </div>
    </div>
  );
};


export default TestingPanel;
