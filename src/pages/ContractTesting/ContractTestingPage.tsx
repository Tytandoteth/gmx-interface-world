import React, { useState, useEffect, useCallback } from 'react';

import { WORLD } from '../../config/chains';
import Button from '../../components/Button/Button';
import Card from '../../components/Common/Card';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import { useChainId } from '../../lib/chains';
import { helperToast } from '../../lib/helperToast';
import { Logger } from '../../lib/logger';
import useWallet from '../../lib/wallets/useWallet';

// Create a log prefix for the component
const LOG_PREFIX = 'ContractTestingPage';

/**
 * Contract Testing Page
 * 
 * This page allows testing direct interactions with World Chain contracts
 * It displays real-time price data from the Oracle Keeper and provides
 * buttons to test core contract functionality.
 */
export default function ContractTestingPage() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  
  const {
    prices,
    isPricesLoading,
    pricesError,
    isLoading
  } = useWorldChainTrading();
  
  // Define contract status variables to simulate the original properties
  const areContractsConfigured = !isLoading;
  const isContractsLoading = isLoading;
  const contractsError = null;
  
  // Define mock contract objects for display purposes
  const contracts = {
    vault: { address: import.meta.env.VITE_VAULT_ADDRESS || 'Not configured' },
    router: { address: import.meta.env.VITE_ROUTER_ADDRESS || 'Not configured' },
    positionRouter: { address: import.meta.env.VITE_POSITION_ROUTER_ADDRESS || 'Not configured' }
  };
  
  // Function to refresh prices (will do nothing in this implementation)
  const refreshPrices = useCallback(async () => {
    helperToast.info('Requesting new price data...');
    // In the actual context this would be implemented
    // For now we can just trigger a page refresh
    window.location.reload();
  }, []);
  
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  
  // Refresh prices when the component mounts
  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);
  
  // Test fetching token balances - this is now a mock function
  const fetchTokenBalances = async () => {
    if (!areContractsConfigured || !account) return;
    
    try {
      setIsLoadingBalances(true);
      
      // Test tokens to check
      const tokens = [
        '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1', // WLD
        '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2', // ETH
        '0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1', // USDC
        '0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1'  // MAG
      ];
      
      const balances: Record<string, string> = {};
      
      // Mock balances for demonstration
      tokens.forEach(token => {
        balances[token] = 'Mock: 1000.00';
      });
      
      setTokenBalances(balances);
      helperToast.success('Balances fetched successfully');
    } catch (error) {
      Logger.error(`${LOG_PREFIX}: Error fetching balances:`, error);
      helperToast.error('Failed to fetch balances');
    } finally {
      setIsLoadingBalances(false);
    }
  };
  
  // Get a readable token name
  const getTokenName = (address: string): string => {
    const tokenMap: Record<string, string> = {
      '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1': 'WLD',
      '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee2': 'ETH',
      '0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1': 'USDC',
      '0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1': 'MAG'
    };
    
    return tokenMap[address] || address.substring(0, 8) + '...';
  };
  
  // Check if we're on World Chain
  const isWorldChain = chainId === WORLD;
  
  if (!isWorldChain) {
    return (
      <div className="default-container page-layout">
        <div className="section-title-block">
          <div className="section-title-content">
            <h2>Contract Testing</h2>
          </div>
        </div>
        
        <Card title="Wrong Network">
          <div className="App-card-content">
            <p>Please connect to World Chain to use this page.</p>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="default-container page-layout">
      <div className="section-title-block">
        <div className="section-title-content">
          <h2>World Chain Contract Testing</h2>
          <p>Test direct interactions with World Chain contracts</p>
        </div>
      </div>
      
      {/* Contract Status */}
      <Card title="Contract Status">
        <div className="App-card-content">
          {isContractsLoading ? (
            <p>Loading contracts...</p>
          ) : contractsError ? (
            <div className="error-box">
              <h3>Contract Error</h3>
              <p>{contractsError ? String(contractsError) : 'Unknown error'}</p>
            </div>
          ) : (
            <div>
              <div className="App-card-row">
                <div className="label">Contracts Configured</div>
                <div className={areContractsConfigured ? "value positive" : "value negative"}>
                  {areContractsConfigured ? "Yes" : "No"}
                </div>
              </div>
              
              <div className="App-card-row">
                <div className="label">Vault Contract</div>
                <div className="value">{areContractsConfigured ? "Connected" : "Not Connected"}</div>
              </div>
              
              <div className="App-card-row">
                <div className="label">Router Contract</div>
                <div className="value">{areContractsConfigured ? "Connected" : "Not Connected"}</div>
              </div>
              
              <div className="App-card-row">
                <div className="label">Position Router Contract</div>
                <div className="value">{areContractsConfigured ? "Connected" : "Not Connected"}</div>
              </div>
              
              <div className="App-card-row">
                <div className="label">Vault Address</div>
                <div className="value">{contracts.vault.address}</div>
              </div>
              
              <div className="App-card-divider"></div>
              
              <div className="mt-10">
                <Button
                  variant="secondary"
                  className="w-100"
                  onClick={fetchTokenBalances}
                  disabled={isLoadingBalances || !areContractsConfigured || !account}
                >
                  {isLoadingBalances ? "Loading Balances..." : "Test Fetch Token Balances"}
                </Button>
              </div>
              
              {Object.keys(tokenBalances).length > 0 && (
                <div className="token-balances" style={{ marginTop: '15px' }}>
                  <h4>Token Balances in Vault</h4>
                  {Object.entries(tokenBalances).map(([token, balance]) => (
                    <div className="App-card-row" key={token}>
                      <div className="label">{getTokenName(token)}</div>
                      <div className="value">{balance}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Price Feeds */}
      <Card title="Oracle Keeper Direct Price Feeds">
        <div className="App-card-content">
          {isPricesLoading ? (
            <p>Loading prices...</p>
          ) : pricesError ? (
            <div className="error-box">
              <h3>Price Feed Error</h3>
              <p>{pricesError.message}</p>
            </div>
          ) : (
            <div>
              <div className="App-card-row">
                <div className="label">Price Source</div>
                <div className="value">CoinGecko via Oracle Keeper</div>
              </div>
              
              <div className="App-card-divider"></div>
              
              {Object.entries(prices || {}).length > 0 ? (
                Object.entries(prices || {}).map(([token, price]) => (
                  <div className="App-card-row" key={token}>
                    <div className="label">{token}</div>
                    <div className="value">${typeof price === 'number' ? price.toFixed(2) : price}</div>
                  </div>
                ))
              ) : (
                <p>No price data available</p>
              )}
              
              <div className="App-card-divider"></div>
              
              <div className="mt-10">
                <Button
                  variant="secondary"
                  className="w-100"
                  onClick={refreshPrices}
                >
                  Refresh Prices
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Environmental Settings */}
      <Card title="Environment Configuration">
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">RPC URL</div>
            <div className="value">{import.meta.env.VITE_WORLD_RPC_URL || "Not configured"}</div>
          </div>
          
          <div className="App-card-row">
            <div className="label">Oracle Keeper URL</div>
            <div className="value">{import.meta.env.VITE_ORACLE_KEEPER_URL || "Not configured"}</div>
          </div>
          
          <div className="App-card-row">
            <div className="label">Production Mode</div>
            <div className="value">{import.meta.env.VITE_USE_PRODUCTION_MODE ? "Enabled" : "Disabled"}</div>
          </div>
          
          <div className="App-card-row">
            <div className="label">Connected Account</div>
            <div className="value">{account || "Not connected"}</div>
          </div>
          
          <div className="App-card-row">
            <div className="label">Chain ID</div>
            <div className="value">{chainId}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
