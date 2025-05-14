import React from 'react';
import styled from 'styled-components';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import Button from '../Button/Button';

interface NetworkSwitcherProps {
  className?: string;
}

/**
 * Network Switcher Component
 * Displays a warning and button to switch to World Chain when on the wrong network
 */
const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ className }) => {
  const { isCorrectNetwork, switchToWorldChain } = useWorldChainTrading();

  // If on the correct network, don't render anything
  if (isCorrectNetwork) {
    return null;
  }

  return (
    <StyledNetworkError className={className}>
      <div className="network-error-card">
        <h3>Wrong Network</h3>
        <p>Please connect to World Chain to use this feature</p>
        <Button
          variant="primary"
          onClick={switchToWorldChain}
        >
          Switch to World Chain
        </Button>
      </div>
    </StyledNetworkError>
  );
};

const StyledNetworkError = styled.div`
  margin: 1rem 0;
  
  .network-error-card {
    background-color: rgba(255, 100, 100, 0.1);
    border: 1px solid rgba(255, 100, 100, 0.5);
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    
    h3 {
      color: #ff6464;
      margin-top: 0;
      margin-bottom: 0.5rem;
    }
    
    p {
      margin-bottom: 1rem;
    }
    
    button {
      margin-top: 0.5rem;
    }
  }
`;

export default NetworkSwitcher;
