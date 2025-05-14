/**
 * Transaction Test Panel
 * 
 * Development-only component for testing smart contract interactions
 * and monitoring transaction lifecycle.
 */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import useWallet from '../../lib/wallets/useWallet';
import { formatAmount } from '../../lib/numbers';
import { Logger } from '../../lib/logger';
import { isProductionEnvironment, getWorldChainRpcUrl } from '../../lib/worldchain/environmentUtils';
import { useWorldChainTrading } from '../../context/WorldChainTradingContext/WorldChainTradingContext';
import useTransactionMonitor, { TxStatus, TxDetails } from '../../lib/transactions/useTransactionMonitor';
import TransactionStatusIndicator from '../common/TransactionStatusIndicator';
import './TransactionTestPanel.css';

// Define token options
type TokenOption = {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
};

const TOKEN_OPTIONS: TokenOption[] = [
  { symbol: 'WLD', name: 'World', address: null, decimals: 18 },
  { symbol: 'ETH', name: 'Ethereum', address: null, decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: null, decimals: 6 },
];

/**
 * Transaction test types
 */
enum TestType {
  SWAP = 'swap',
  INCREASE_POSITION = 'increasePosition',
  DECREASE_POSITION = 'decreasePosition',
  TRANSFER = 'transfer'
}

/**
 * Development component for testing smart contract interactions
 */
const TransactionTestPanel: React.FC = () => {
  // Access wallet
  const { active, account, signer, connectWallet } = useWallet();
  
  // Access trading functions
  const { 
    executeSwap, 
    increasePosition, 
    decreasePosition,
    getMinExecutionFee,
    prices
  } = useWorldChainTrading();
  
  // Transaction monitoring
  const { 
    trackTransaction, 
    getRecentTransactions, 
    clearTransactions 
  } = useTransactionMonitor();
  
  // Test form state
  const [fromToken, setFromToken] = useState<string>('ETH');
  const [toToken, setToToken] = useState<string>('USDC');
  const [amount, setAmount] = useState<string>('0.01');
  const [slippage, setSlippage] = useState<string>('0.5');
  const [leverage, setLeverage] = useState<string>('2');
  const [isLong, setIsLong] = useState<boolean>(true);
  const [testType, setTestType] = useState<TestType>(TestType.SWAP);
  
  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [minExecutionFee, setMinExecutionFee] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [recentTransactions, setRecentTransactions] = useState<TxDetails[]>([]);
  
  // Network info
  const [networkInfo, setNetworkInfo] = useState({
    chainId: 0,
    rpcUrl: '',
    blockNumber: 0
  });
  
  // Fetch min execution fee
  useEffect(() => {
    const fetchExecutionFee = async (): Promise<void> => {
      if (active && signer) {
        try {
          const fee = await getMinExecutionFee();
          setMinExecutionFee(fee);
        } catch (error) {
          Logger.error('Error getting min execution fee:', error);
        }
      }
    };
    
    fetchExecutionFee().catch(console.error);
  }, [active, signer, getMinExecutionFee]);
  
  // Update network info
  useEffect(() => {
    const fetchNetworkInfo = async (): Promise<void> => {
      if (active && signer) {
        try {
          const network = await signer.provider.getNetwork();
          const blockNumber = await signer.provider.getBlockNumber();
          
          setNetworkInfo({
            chainId: network.chainId,
            rpcUrl: getWorldChainRpcUrl(),
            blockNumber
          });
        } catch (error) {
          Logger.error('Error getting network info:', error);
        }
      }
    };
    
    // Initial fetch
    fetchNetworkInfo().catch(console.error);
    
    // Set up interval for updates
    const intervalId = setInterval(() => {
      fetchNetworkInfo().catch(console.error);
    }, 10000); // Every 10 seconds
    
    // Clean up
    return () => clearInterval(intervalId);
  }, [active, signer]);
  
  // Update recent transactions
  useEffect(() => {
    setRecentTransactions(getRecentTransactions(10));
  }, [getRecentTransactions]);
  
  // Find token by symbol
  const getTokenBySymbol = (symbol: string): TokenOption | undefined => {
    return TOKEN_OPTIONS.find(token => token.symbol === symbol);
  };
  
  // Execute test transaction
  const executeTestTransaction = async (): Promise<void> => {
    if (!active || !account || !signer) {
      alert('Please connect your wallet first');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const fromTokenObj = getTokenBySymbol(fromToken);
      const toTokenObj = getTokenBySymbol(toToken);
      
      if (!fromTokenObj || !toTokenObj) {
        throw new Error('Invalid token selection');
      }
      
      // Parse amount to wei
      const parsedAmount = ethers.utils.parseUnits(
        amount, 
        fromTokenObj.decimals
      );
      
      // Parse slippage
      const parsedSlippage = parseFloat(slippage);
      
      let txResponse;
      
      switch (testType) {
        case TestType.SWAP:
          txResponse = await executeSwap({
            fromToken: fromTokenObj,
            toToken: toTokenObj,
            amount: parsedAmount,
            slippage: parsedSlippage
          });
          break;
          
        case TestType.INCREASE_POSITION:
          txResponse = await increasePosition({
            collateralToken: fromTokenObj,
            indexToken: toTokenObj,
            amount: parsedAmount,
            leverage: parseFloat(leverage),
            isLong,
            slippage: parsedSlippage,
            executionFee: minExecutionFee
          });
          break;
          
        case TestType.DECREASE_POSITION:
          txResponse = await decreasePosition({
            collateralToken: fromTokenObj,
            indexToken: toTokenObj,
            amount: parsedAmount,
            leverage: parseFloat(leverage),
            isLong,
            slippage: parsedSlippage
          });
          break;
          
        case TestType.TRANSFER:
          // Simple ETH transfer example
          txResponse = await signer.sendTransaction({
            to: account,
            value: parsedAmount
          });
          break;
          
        default:
          throw new Error('Unsupported test type');
      }
      
      // Track the transaction
      await trackTransaction(txResponse, {
        type: testType,
        fromToken: fromToken,
        toToken: toToken,
        amount,
        leverage: testType !== TestType.SWAP ? leverage : undefined,
        isLong: testType !== TestType.SWAP ? isLong : undefined
      });
      
      // Update recent transactions
      setRecentTransactions(getRecentTransactions(10));
    } catch (error) {
      Logger.error('Failed to execute test transaction', error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // In production, we may want to hide this panel
  if (isProductionEnvironment()) {
    return null;
  }
  
  return (
    <div className="transaction-test-panel">
      <div className="panel-header">
        <h2>Smart Contract Transaction Testing</h2>
        <div className="connection-status">
          {active ? (
            <span className="connected">
              Connected: {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : ''}
            </span>
          ) : (
            <button onClick={connectWallet} className="connect-button">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
      
      <div className="panel-content">
        <div className="test-controls">
          <div className="control-group">
            <label>Test Type:</label>
            <select 
              value={testType} 
              onChange={(e) => setTestType(e.target.value as TestType)}
              disabled={isSubmitting}
            >
              <option value={TestType.SWAP}>Swap</option>
              <option value={TestType.INCREASE_POSITION}>Increase Position</option>
              <option value={TestType.DECREASE_POSITION}>Decrease Position</option>
              <option value={TestType.TRANSFER}>Simple Transfer</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>From Token:</label>
            <select 
              value={fromToken} 
              onChange={(e) => setFromToken(e.target.value)}
              disabled={isSubmitting}
            >
              {TOKEN_OPTIONS.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} ({token.name})
                </option>
              ))}
            </select>
          </div>
          
          {testType !== TestType.TRANSFER && (
            <div className="control-group">
              <label>To Token:</label>
              <select 
                value={toToken} 
                onChange={(e) => setToToken(e.target.value)}
                disabled={isSubmitting}
              >
                {TOKEN_OPTIONS.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol} ({token.name})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="control-group">
            <label>Amount:</label>
            <input 
              type="text" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          {testType !== TestType.TRANSFER && (
            <div className="control-group">
              <label>Slippage (%):</label>
              <input 
                type="text" 
                value={slippage} 
                onChange={(e) => setSlippage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}
          
          {(testType === TestType.INCREASE_POSITION || testType === TestType.DECREASE_POSITION) && (
            <>
              <div className="control-group">
                <label>Leverage:</label>
                <input 
                  type="text" 
                  value={leverage} 
                  onChange={(e) => setLeverage(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="control-group">
                <label>Position:</label>
                <div className="radio-buttons">
                  <label>
                    <input 
                      type="radio" 
                      checked={isLong} 
                      onChange={() => setIsLong(true)}
                      disabled={isSubmitting}
                    />
                    Long
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      checked={!isLong} 
                      onChange={() => setIsLong(false)}
                      disabled={isSubmitting}
                    />
                    Short
                  </label>
                </div>
              </div>
            </>
          )}
          
          <div className="control-group actions">
            <button 
              onClick={executeTestTransaction} 
              disabled={!active || isSubmitting}
              className="execute-button"
            >
              {isSubmitting ? 'Submitting...' : 'Execute Transaction'}
            </button>
            
            {minExecutionFee.gt(0) && (
              <div className="execution-fee">
                Min Execution Fee: {formatAmount(minExecutionFee, 18, 6)} ETH
              </div>
            )}
          </div>
        </div>
        
        <div className="transactions-list">
          <div className="list-header">
            <h3>Recent Transactions</h3>
            <button 
              onClick={() => clearTransactions()}
              className="clear-button"
              disabled={recentTransactions.length === 0}
            >
              Clear All
            </button>
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="no-transactions">
              No transactions yet. Try executing a test transaction.
            </div>
          ) : (
            <ul>
              {recentTransactions.map((tx) => (
                <li key={tx.hash} className="transaction-item">
                  <div className="tx-header">
                    <TransactionStatusIndicator 
                      status={tx.status} 
                      hash={tx.hash} 
                      blockExplorerUrl={`https://explorer.worldchain.co`}
                    />
                    
                    <div className="tx-time">
                      {tx.confirmedAt 
                        ? new Date(tx.confirmedAt).toLocaleTimeString() 
                        : 'Pending'}
                    </div>
                  </div>
                  
                  {tx.metadata && (
                    <div className="tx-metadata">
                      <div className="metadata-row">
                        <span className="label">Type:</span>
                        <span className="value">{tx.metadata.type}</span>
                      </div>
                      
                      {tx.metadata.fromToken && (
                        <div className="metadata-row">
                          <span className="label">From:</span>
                          <span className="value">{tx.metadata.fromToken}</span>
                        </div>
                      )}
                      
                      {tx.metadata.toToken && (
                        <div className="metadata-row">
                          <span className="label">To:</span>
                          <span className="value">{tx.metadata.toToken}</span>
                        </div>
                      )}
                      
                      {tx.metadata.amount && (
                        <div className="metadata-row">
                          <span className="label">Amount:</span>
                          <span className="value">{tx.metadata.amount}</span>
                        </div>
                      )}
                      
                      {tx.metadata.leverage && (
                        <div className="metadata-row">
                          <span className="label">Leverage:</span>
                          <span className="value">{tx.metadata.leverage}x</span>
                        </div>
                      )}
                      
                      {tx.metadata.isLong !== undefined && (
                        <div className="metadata-row">
                          <span className="label">Direction:</span>
                          <span className="value">{tx.metadata.isLong ? 'Long' : 'Short'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {tx.status === TxStatus.SUCCESS && tx.receipt && (
                    <div className="tx-details collapsible">
                      <div className="details-header">
                        <span className="icon">📋</span>
                        <span className="title">Transaction Details</span>
                      </div>
                      <div className="details-content">
                        <div className="details-row">
                          <span className="label">Block:</span>
                          <span className="value">{tx.receipt.blockNumber}</span>
                        </div>
                        <div className="details-row">
                          <span className="label">Gas Used:</span>
                          <span className="value">{formatAmount(tx.receipt.gasUsed.toString(), 0)}</span>
                        </div>
                        <div className="details-row">
                          <span className="label">Gas Price:</span>
                          <span className="value">
                            {formatAmount(tx.receipt.effectiveGasPrice.toString(), 9)} Gwei
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {tx.status === TxStatus.FAILURE && tx.error && (
                    <div className="tx-error">
                      <div className="error-header">
                        <span className="icon">⚠️</span>
                        <span className="title">Error Details</span>
                      </div>
                      <div className="error-message">
                        {tx.error.message}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="network-info">
        <h3>Network Information</h3>
        <div className="info-grid">
          <div className="info-row">
            <span className="label">Chain ID:</span>
            <span className="value">{networkInfo.chainId}</span>
          </div>
          <div className="info-row">
            <span className="label">RPC URL:</span>
            <span className="value truncate" title={networkInfo.rpcUrl}>
              {networkInfo.rpcUrl}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Current Block:</span>
            <span className="value">{networkInfo.blockNumber}</span>
          </div>
          <div className="info-row">
            <span className="label">Min Execution Fee:</span>
            <span className="value">
              {formatAmount(minExecutionFee, 18, 6)} ETH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionTestPanel;
