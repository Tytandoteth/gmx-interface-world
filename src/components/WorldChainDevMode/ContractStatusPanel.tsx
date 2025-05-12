import React from 'react';
import { TEST_CONTRACTS } from '../../config/testTokens';

/**
 * Component to display contract status information
 * Shows test or production contract addresses and their connection status
 */
const ContractStatusPanel: React.FC = () => {
  return (
    <div className="contract-status-panel">
      <h3>Contract Status</h3>
      
      <div className="contracts-table">
        <div className="table-header">
          <div className="name-column">Contract</div>
          <div className="address-column">Address</div>
          <div className="status-column">Status</div>
        </div>
        
        {Object.entries(TEST_CONTRACTS).map(([name, address]) => (
          <div key={name} className="contract-row">
            <div className="name-column">{name}</div>
            <div className="address-column">
              <code>{address}</code>
            </div>
            <div className="status-column">
              <span className="status-badge available">Available</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContractStatusPanel;
