import React, { useState } from 'react';
import { getDeploymentType, toggleDeploymentType } from 'lib/worldchain/customDeployment';

import './DeploymentToggle.css';

/**
 * Component to toggle between original and custom deployments
 * This allows switching between the original GMX deployment and our custom
 * deployment with the RedStone price feed integration
 */
const DeploymentToggle: React.FC = () => {
  const [deploymentType, setDeploymentType] = useState<'original' | 'custom'>(
    getDeploymentType()
  );
  
  const handleToggle = (): void => {
    const newType = toggleDeploymentType();
    setDeploymentType(newType);
    
    // Reload the page to apply new contract addresses
    window.location.reload();
  };
  
  return (
    <div className="DeploymentToggle">
      <div className="card">
        <div className="deployment-info">
          <h3>World Chain Deployment</h3>
          <div className="deployment-status">
            <span className="deployment-label">Active:</span>
            <span className={`deployment-value ${deploymentType}`}>
              {deploymentType === 'original' ? 'Original' : 'Custom (RedStone)'}
            </span>
          </div>
        </div>
        <button
          className="toggle-button"
          onClick={handleToggle}
        >
          Switch to {deploymentType === 'original' ? 'Custom' : 'Original'} Deployment
        </button>
      </div>
    </div>
  );
};

export default DeploymentToggle;
