import React, { useState } from 'react';
import { ethers } from 'ethers';
import { TEST_TOKENS } from '../config/testTokens';
import { useChainId } from 'lib/chains';
import { WORLD } from 'sdk/configs/chains';

const TokenABI = [
  // Simplified ERC20 ABI with mint function
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Check if test mode is enabled
const USE_TEST_TOKENS = process.env.VITE_USE_TEST_TOKENS === 'true';

export const TestTokenMinter: React.FC = () => {
  const { chainId } = useChainId();
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Only show in test mode and on World Chain
  const isWorldChain = chainId === WORLD;
  if (!USE_TEST_TOKENS || !isWorldChain) return null;
  
  const handleMint = async () => {
    if (!selectedToken || !amount) return;
    
    try {
      setStatus('pending');
      setError(null);
      
      // Connect to wallet
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      // Get token info
      const token = TEST_TOKENS[selectedToken];
      if (!token) {
        throw new Error(`Token ${selectedToken} not found`);
      }
      
      console.log(`Minting ${amount} ${token.name} to ${address}`);
      
      // Create contract instance
      const tokenContract = new ethers.Contract(token.address, TokenABI, signer);
      
      // Format amount with proper decimals
      const decimals = token.decimals;
      const parsedAmount = ethers.utils.parseUnits(amount, decimals);
      
      // Execute mint transaction
      const tx = await tokenContract.mint(address, parsedAmount);
      console.log(`Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      await tx.wait();
      console.log(`Transaction confirmed`);
      
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error minting tokens:', error);
      setError(error.message || 'Failed to mint tokens');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };
  
  return (
    <div className="test-token-minter">
      <div className="card">
        <h3>Test Token Minter</h3>
        <p className="info">Mint test tokens for World Chain development</p>
        
        <div className="form-group">
          <label>Token</label>
          <select 
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            disabled={status === 'pending'}
          >
            <option value="">Select Token</option>
            {Object.keys(TEST_TOKENS).map((symbol) => (
              <option key={symbol} value={symbol}>{TEST_TOKENS[symbol].name} ({symbol})</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Amount</label>
          <input 
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount to mint"
            disabled={status === 'pending'}
          />
        </div>
        
        <button 
          className="App-button-option App-card-option"
          onClick={handleMint}
          disabled={!selectedToken || !amount || status === 'pending'}
        >
          {status === 'pending' ? 'Minting...' : 'Mint Tokens'}
        </button>
        
        {status === 'success' && <div className="success-message">Tokens minted successfully!</div>}
        {status === 'error' && <div className="error-message">Error: {error}</div>}
      </div>
    </div>
  );
};

export default TestTokenMinter;
