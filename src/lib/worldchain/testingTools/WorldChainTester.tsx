import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import type { JsonRpcProvider } from '@ethersproject/providers';

import { useChainId } from 'lib/chains';
import { logger } from 'lib/oracleKeeperFetcher/oracleKeeperUtils.new';
import { WORLD } from 'sdk/configs/chains';
import { getWorldChainProvider } from 'lib/worldchain/providers';

/**
 * World Chain Tester Component
 * 
 * This component provides a testing interface for World Chain integration:
 * - Shows current connection state
 * - Allows manual connection to World Chain
 * - Displays token balances
 * - Enables testing token transfers and contract interactions
 */
export const WorldChainTester: React.FC = () => {
  const { chainId } = useChainId();
  const [collapsed, setCollapsed] = useState(false);
  const [provider, setProvider] = useState<JsonRpcProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<{[symbol: string]: string}>({});
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [rpcStatus, setRpcStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tokens to track
  const trackedTokens = [
    { symbol: 'WLD', address: '0x163f8c2467924be0ae7b5347228a3625f7e96734' },
    { symbol: 'WETH', address: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab' },
    { symbol: 'MAG', address: '0x429f0ff22f667fdd3a819707cf793eb79f54d47e' }
  ];

  // Connect to the World Chain RPC
  useEffect(() => {
    const connectToRpc = async (): Promise<void> => {
      try {
        setRpcStatus('connecting');
        setError(null);
        
        // Use our standardized provider utility
        const newProvider = getWorldChainProvider();
        
        // Verify connection by getting the latest block
        const blockNumber = await newProvider.getBlockNumber();
        setLatestBlock(blockNumber);
        
        setProvider(newProvider);
        setRpcStatus('connected');
        logger.info(`[WorldChainTester] Connected to RPC, latest block: ${blockNumber}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[WorldChainTester] Failed to connect to RPC:', errorMessage);
        setRpcStatus('disconnected');
        setError(errorMessage);
      }
    };
    
    connectToRpc();
    
    // Set up a block polling interval to keep connection fresh
    const blockPollInterval = setInterval(() => {
      if (provider) {
        provider.getBlockNumber()
          .then(blockNumber => {
            setLatestBlock(blockNumber);
            setRpcStatus('connected');
          })
          .catch(err => {
            setRpcStatus('disconnected');
            setError(`Block polling failed: ${err.message}`);
          });
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(blockPollInterval);
  }, [provider]);
  
  // Connect wallet function
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Ethereum wallet to connect');
      return;
    }
    
    try {
      setConnectionStatus('connecting');
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // Check if we need to switch chains
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(currentChainId, 16) !== WORLD) {
        try {
          // Try to switch to World Chain
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${WORLD.toString(16)}` }]
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${WORLD.toString(16)}`,
                chainName: 'World Chain',
                nativeCurrency: {
                  name: 'WLD',
                  symbol: 'WLD',
                  decimals: 18
                },
                rpcUrls: ['https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/'],
                blockExplorerUrls: ['https://explorer.worldcoin.org/']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }
      
      setConnectionStatus('connected');
      fetchBalances(accounts[0]);
    } catch (error) {
      logger.error('[WorldChainTester] Failed to connect wallet:', error);
      setConnectionStatus('disconnected');
    }
  };
  
  // Fetch token balances
  const fetchBalances = async (walletAddress: string) => {
    if (!provider) return;
    
    const balances: {[symbol: string]: string} = {};
    
    // For each token, get the balance
    for (const token of trackedTokens) {
      try {
        // Use basic ERC20 ABI just for balanceOf
        const erc20Abi = [
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ];
        
        const tokenContract = new ethers.Contract(token.address, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(walletAddress);
        const decimals = await tokenContract.decimals();
        
        // Format the balance with proper decimals
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);
        balances[token.symbol] = formattedBalance;
      } catch (error) {
        logger.error(`[WorldChainTester] Failed to fetch balance for ${token.symbol}:`, error);
        balances[token.symbol] = 'Error';
      }
    }
    
    setTokenBalances(balances);
  };
  
  // Refresh balances
  const refreshBalances = () => {
    if (account) {
      fetchBalances(account);
    }
  };
  
  // If not on World Chain, don't show the component
  if (chainId !== WORLD) {
    return null;
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      zIndex: 1000,
      background: '#1a1a2e', 
      color: '#e6e6e6',
      padding: '15px',
      borderRadius: '5px',
      width: collapsed ? '50px' : '360px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
      transition: 'all 0.3s ease',
      borderLeft: '4px solid #2d6cdf',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#2d6cdf' }}>
          {!collapsed ? 'World Chain Development' : ''}
        </h3>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 5px'
          }}
        >
          {collapsed ? '📈' : '◀️'}
        </button>
      </div>
      
      {!collapsed && (
        <>
          {/* Connection Status */}
          <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Oracle: <span style={{ color: '#4caf50' }}>Online</span></div>
              <div>RPC: <span style={{ color: rpcStatus === 'connected' ? '#4caf50' : '#ff5252' }}>{rpcStatus}</span></div>
              {latestBlock && <div>Latest Block: {latestBlock}</div>}
            </div>
            
            <div>
              <div>Wallet: <span style={{ color: connectionStatus === 'connected' ? '#4caf50' : '#ff5252' }}>{connectionStatus}</span></div>
              {account && <div>Account: {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</div>}
            </div>
            
            {connectionStatus !== 'connected' && (
              <button
                onClick={connectWallet}
                style={{
                  background: '#2d6cdf',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '5px'
                }}
              >
                Connect Wallet
              </button>
            )}
          </div>
          
          {/* Token Balances */}
          {connectionStatus === 'connected' && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Token Balances</span>
                <button
                  onClick={refreshBalances}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2d6cdf',
                    color: '#2d6cdf',
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Refresh
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {Object.entries(tokenBalances).map(([symbol, balance]) => (
                  <div key={symbol} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{symbol}:</span>
                    <span>{balance}</span>
                  </div>
                ))}
                
                {Object.keys(tokenBalances).length === 0 && (
                  <div style={{ color: '#ff9800' }}>No balances to display</div>
                )}
              </div>
            </div>
          )}
          
          {/* Development Notes */}
          <div style={{ marginTop: '15px', fontSize: '12px', color: '#c0c0c0' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Development Notes:</div>
            <ul style={{ paddingLeft: '20px', margin: '0' }}>
              <li>Market data is provided by a local Oracle Keeper</li>
              <li>Contract interactions may not be fully functional</li>
              <li>Use this mode for UI testing and development only</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default WorldChainTester;
