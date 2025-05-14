import React from 'react';
import styled from 'styled-components';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import NetworkSwitcher from '../../components/NetworkSwitcher';
import Footer from '../../components/Footer/Footer';
import { useChainId } from 'wagmi';

/**
 * World Chain Exchange Page
 * Main interface for trading on the World Chain
 */
const WorldChainExchange: React.FC = () => {
  const chainId = useChainId();
  const { 
    isCorrectNetwork, 
    switchToWorldChain,
    prices, 
    isPricesLoading,
    isLoading 
  } = useWorldChainTrading();

  return (
    <StyledExchangePage className="page-layout">
      <div className="Exchange-content">
        <div className="Exchange-left">
          <div className="Exchange-chart-header">
            <h2>World Chain Trading</h2>
            <div className="network-status">
              {isCorrectNetwork ? (
                <div className="network-correct">Connected to World Chain</div>
              ) : (
                <div className="network-wrong">Wrong Network</div>
              )}
            </div>
          </div>
          <div className="Exchange-chart-area">
            {/* Implement chart here when available */}
            <div className="chart-placeholder">
              <h3>Price Chart</h3>
              {!isPricesLoading ? (
                <div className="price-info">
                  <div className="price-row">
                    <span className="token">ETH:</span>
                    <span className="value">${prices?.ETH || prices?.WETH || '0.00'}</span>
                  </div>
                  <div className="price-row">
                    <span className="token">WLD:</span>
                    <span className="value">${prices?.WLD || '0.00'}</span>
                  </div>
                  <div className="price-row">
                    <span className="token">USDC:</span>
                    <span className="value">${prices?.USDC || '1.00'}</span>
                  </div>
                </div>
              ) : (
                <div className="loading">Loading prices...</div>
              )}
            </div>
          </div>
        </div>
        <div className="Exchange-right">
          <NetworkSwitcher className="network-switcher-container" />
          <div className="swap-box-container">
            {isCorrectNetwork ? (
              <div className="swap-box-placeholder">
                {/* Will integrate real swap box once we implement the component */}
                <h3>World Chain Trading</h3>
                <p>This is where the trading interface will be displayed.</p>
                <p>Currently implementing network switching functionality.</p>
              </div>
            ) : (
              <div className="swap-box-blocked">
                <h3>Connect to World Chain</h3>
                <p>Please connect to World Chain network to access trading features.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </StyledExchangePage>
  );
};

const StyledExchangePage = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  .Exchange-content {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    flex: 1;
    padding: 24px;
    gap: 20px;
  }

  .Exchange-left {
    flex: 1;
    min-width: 400px;
    max-width: 800px;
    
    .Exchange-chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      
      h2 {
        margin: 0;
      }
      
      .network-status {
        font-size: 14px;
        font-weight: 500;
        
        .network-correct {
          color: #22c761;
        }
        
        .network-wrong {
          color: #fa3c58;
        }
      }
    }
    
    .Exchange-chart-area {
      background-color: #101124;
      border-radius: 8px;
      padding: 20px;
      height: 400px;
      
      .chart-placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        
        h3 {
          margin-top: 0;
          margin-bottom: 20px;
        }
        
        .price-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
          
          .price-row {
            display: flex;
            gap: 10px;
            
            .token {
              font-weight: 500;
              min-width: 60px;
            }
            
            .value {
              font-family: monospace;
            }
          }
        }
        
        .loading {
          color: #808aff;
        }
      }
    }
  }

  .Exchange-right {
    width: 400px;
    
    .network-switcher-container {
      margin-bottom: 20px;
    }
    
    .swap-box-container {
      background-color: #101124;
      border-radius: 8px;
      padding: 20px;
      
      .swap-box-placeholder, .swap-box-blocked {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        
        h3 {
          margin-top: 0;
        }
      }
      
      .swap-box-blocked {
        color: #fa3c58;
      }
    }
    
    @media (max-width: 900px) {
      width: 100%;
    }
  }
`;

export default WorldChainExchange;
