import { ethers } from 'ethers';
import React, { useState, useEffect } from 'react';

import { WORLD } from 'config/chains';
import { useChainId } from 'lib/chains';

import { debugWorldChainEnvironment } from './debugUtils';
import styles from './DiagnosticsPanel.module.css';
import { getWorldChainProvider } from './providers';
import { useRobustOracleKeeper } from './useRobustOracleKeeper';

/**
 * Diagnostics Panel Component
 * 
 * This component provides a comprehensive debugging panel for World Chain integration.
 * It displays real-time information about:
 * - Network configuration
 * - Chain ID mismatches
 * - Token loading status
 * - Price data fetching
 * 
 * This is essential for identifying issues with the World Chain integration.
 */
export const DiagnosticsPanel: React.FC = () => {
  const { chainId } = useChainId();
  const isWorldChain = chainId === WORLD;
  const { tickers, loading, error, lastUpdated, refetch } = useRobustOracleKeeper();
  const [collapsed, setCollapsed] = useState(false);
  const [rpcInfo, setRpcInfo] = useState<{
    connected: boolean;
    chainId?: number;
    providerChainId?: number;
    error?: string;
  }>({ connected: false });

  // Check RPC connection
  useEffect(() => {
    const checkRpcConnection = async () => {
      try {
        if (window.ethereum) {
          // Updated to use ethers v6 BrowserProvider
          const provider = new ethers.BrowserProvider(window.ethereum);
          // Network info is retrieved but not used directly
          const _network = await provider.getNetwork();
          
          // Use our standardized provider utility
          const worldProvider = getWorldChainProvider();
          // Test connection by getting network info
          const worldNetwork = await worldProvider.getNetwork();
          
          setRpcInfo({
            connected: true,
            chainId: chainId,
            providerChainId: Number(worldNetwork.chainId),
            error: undefined
          });
        } else {
          setRpcInfo({
            connected: false,
            error: 'MetaMask not installed'
          });
        }
      } catch (error) {
        setRpcInfo({
          connected: false,
          error: error.message || 'Failed to connect to RPC'
        });
      }
    };
    
    checkRpcConnection();
  }, [chainId]);

  // Skip if not on World Chain or in production
  if (!isWorldChain || import.meta.env.PROD) {
    return null;
  }
  
  // All styles moved to CSS module in DiagnosticsPanel.module.css

  // Track important diagnostic information with TypeScript interface for better type safety
  interface DiagnosticData {
    network: {
      currentChainId: number;
      expectedChainId: number;
      rpcConnection: string;
      rpcError?: string;
      chainIdMismatch?: string;
    };
    prices: {
      loading: boolean;
      error?: string;
      lastUpdated: string;
      availableTokens: number;
      tokens: Array<{
        symbol: string;
        price: number;
      }>;
    };
    config: {
      useTestTokens: boolean;
      trackedTokens: string[];
      defaultPriceSource: string;
    };
  }

  const diagnosticData: DiagnosticData = {
    network: {
      currentChainId: chainId,
      expectedChainId: WORLD,
      rpcConnection: rpcInfo.connected ? 'Connected' : 'Failed',
      rpcError: rpcInfo.error,
      chainIdMismatch: rpcInfo.providerChainId !== WORLD ? 
        `Mismatch: Expected ${WORLD}, RPC returned ${rpcInfo.providerChainId}` : undefined
    },
    prices: {
      loading,
      error: error?.message,
      lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never',
      availableTokens: tickers ? tickers.length : 0,
      tokens: tickers ? tickers.map(token => ({
        symbol: token.tokenSymbol,
        price: parseFloat(token.maxPrice) || 0
      })) : []
    },
    config: {
      useTestTokens: import.meta.env.VITE_USE_TEST_TOKENS === 'true',
      trackedTokens: ['WLD', 'WETH', 'MAG'],
      defaultPriceSource: import.meta.env.VITE_USE_PRODUCTION_MODE === 'true' ? 'witnet' : 'coingecko'
    }
  };

  // Component render using CSS modules instead of inline styles
  return (
    <div className={`${styles.panel} ${collapsed ? styles.collapsed : styles.expanded}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {!collapsed && 'World Chain Diagnostics'}
        </h3>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={styles.collapseButton}
        >
          {collapsed ? '📊' : '⬅️'}
        </button>
      </div>
      
      {!collapsed && (
        <>
          {/* Network Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Network Status</h4>
            <div className={styles.networkInfo}>Chain ID: {diagnosticData.network.currentChainId}</div>
            <div className={styles.networkInfo}>
              RPC: {rpcInfo.connected ? 
                <span className={`${styles.statusContainer} ${styles.statusConnected}`}>Connected</span> : 
                <span className={`${styles.statusContainer} ${styles.statusError}`}>Failed</span>}
            </div>
            {diagnosticData.network.chainIdMismatch && (
              <div className={styles.errorText}>
                {diagnosticData.network.chainIdMismatch}
              </div>
            )}
            {diagnosticData.network.rpcError && (
              <div className={styles.errorText}>
                {diagnosticData.network.rpcError}
              </div>
            )}
          </div>
          
          {/* Price Data Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Price Data</h4>
            <div className={styles.networkInfo}>
              Status: {loading ? 
                <span className={`${styles.statusContainer} ${styles.statusLoading}`}>Loading...</span> : 
                <span className={`${styles.statusContainer} ${styles.statusConnected}`}>Ready</span>}
            </div>
            <div className={styles.networkInfo}>Last Updated: {diagnosticData.prices.lastUpdated}</div>
            <div className={styles.networkInfo}>Token Count: {diagnosticData.prices.availableTokens}</div>
            
            {diagnosticData.prices.error && (
              <div className={styles.priceError}>Error: {diagnosticData.prices.error}</div>
            )}
            
            {diagnosticData.prices.tokens.length > 0 && (
              <div className={styles.marginTop}>
                <div className={styles.networkInfo}>Token Prices:</div>
                <div className={styles.tokenGrid}>
                  {diagnosticData.prices.tokens.map(token => (
                    <div key={token.symbol} className={styles.tokenPrice}>
                      {token.symbol}: ${token.price.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Config Section */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Configuration</h4>
            <div className={styles.configItem}>
              Test Mode: {diagnosticData.config.useTestTokens ? 'Enabled' : 'Disabled'}
            </div>
            <div className={styles.configItem}>
              Tracked Tokens: {diagnosticData.config.trackedTokens.join(', ')}
            </div>
            <div className={styles.configItem}>
              Price Source: {diagnosticData.config.defaultPriceSource}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className={styles.actionsContainer}>
            <button 
              onClick={refetch}
              className={styles.actionButton}
            >
              Refresh Prices
            </button>
            <button 
              onClick={() => {
                debugWorldChainEnvironment();
                // We intentionally use console.log here for debugging purposes
                // eslint-disable-next-line no-console
                console.log('Full diagnostics:', diagnosticData);
              }}
              className={styles.logButton}
            >
              Log Debug Info
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DiagnosticsPanel;
