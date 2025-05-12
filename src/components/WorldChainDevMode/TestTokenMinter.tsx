import React, { useState, useCallback } from 'react';

import { TEST_TOKENS } from '../../config/testTokens';

import './TestTokenMinter.css';

// Interface for the component's mint status tracking
interface MintStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  txHash?: string;
}

/**
 * Component for minting test tokens in the development environment
 * Only displays when test tokens are enabled via environment variables
 */
const TestTokenMinter: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [mintStatus, setMintStatus] = useState<MintStatus>({ status: 'idle' });
  
  const handleMint = useCallback(async (): Promise<void> => {
    if (!selectedToken || !amount) return;
    
    try {
      setMintStatus({ status: 'pending' });
      
      // Connect to the wallet
      if (!window.ethereum) {
        throw new Error('No ethereum provider found. Please install a Web3 wallet.');
      }
      
      // Get the selected token
      const token = TEST_TOKENS[selectedToken];
      
      // Mock transaction flow - in production this would interact with the actual token contract
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update status with success
      setMintStatus({ 
        status: 'success', 
        message: `Successfully minted ${amount} ${token.symbol}`,
        txHash: '0x' + Array(64).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      });
      
      // Reset status after 5 seconds
      setTimeout(() => setMintStatus({ status: 'idle' }), 5000);
      
      // Reset input fields
      setAmount('');
      setSelectedToken('');
      
    } catch (error) {
      // Log error only in development mode
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Error minting tokens:', error);
      }
      // Handle error
      setMintStatus({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error minting tokens'
      });
      
      // Reset status after 5 seconds
      setTimeout(() => setMintStatus({ status: 'idle' }), 5000);
    }
  }, [selectedToken, amount]);
  
  return (
    <div className="test-token-minter">
      <div className="minter-header">
        <h3>Test Token Minter</h3>
        <div className="minter-subtitle">
          Mint tokens for testing the GMX interface
        </div>
      </div>
      
      <div className="minter-form">
        <div className="form-group">
          <label htmlFor="token-select">Token</label>
          <select 
            id="token-select"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            disabled={mintStatus.status === 'pending'}
          >
            <option value="">Select Token</option>
            {Object.keys(TEST_TOKENS).map((symbol) => (
              <option key={symbol} value={symbol}>
                {TEST_TOKENS[symbol].name} ({symbol})
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="amount-input">Amount</label>
          <input 
            id="amount-input"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount to mint"
            disabled={mintStatus.status === 'pending'}
          />
        </div>
        
        <button 
          className="mint-button"
          onClick={handleMint}
          disabled={!selectedToken || !amount || mintStatus.status === 'pending'}
        >
          {mintStatus.status === 'pending' ? 'Minting...' : 'Mint Tokens'}
        </button>
      </div>
      
      {mintStatus.status === 'success' && (
        <div className="minter-status success">
          <div className="status-icon">✅</div>
          <div className="status-message">{mintStatus.message}</div>
          {mintStatus.txHash && (
            <a 
              href={`https://explorer.world-chain.com/tx/${mintStatus.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View Transaction
            </a>
          )}
        </div>
      )}
      
      {mintStatus.status === 'error' && (
        <div className="minter-status error">
          <div className="status-icon">❌</div>
          <div className="status-message">{mintStatus.message}</div>
        </div>
      )}
    </div>
  );
};

export default TestTokenMinter;
