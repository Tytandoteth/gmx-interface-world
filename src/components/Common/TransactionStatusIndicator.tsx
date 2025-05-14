/**
 * Transaction Status Indicator Component
 * 
 * Displays the current status of a transaction with appropriate styling and options
 * to view more details or explore the transaction on a block explorer.
 */
import React from 'react';
import { TxStatus } from '../../lib/transactions/useTransactionMonitor';
import './TransactionStatusIndicator.css';

interface TransactionStatusIndicatorProps {
  status: TxStatus;
  hash: string;
  blockExplorerUrl?: string;
  compact?: boolean;
  showHash?: boolean;
  className?: string;
}

type StatusDetails = {
  icon: string;
  message: string;
  className: string;
};

/**
 * Get status details based on transaction status
 */
const getStatusDetails = (status: TxStatus): StatusDetails => {
  switch (status) {
    case TxStatus.INITIAL:
      return {
        icon: '🔄',
        message: 'Initializing',
        className: 'tx-initial'
      };
    case TxStatus.PENDING:
      return {
        icon: '⏳',
        message: 'Pending',
        className: 'tx-pending'
      };
    case TxStatus.MINING:
      return {
        icon: '⛏️',
        message: 'Mining',
        className: 'tx-mining'
      };
    case TxStatus.SUCCESS:
      return {
        icon: '✅',
        message: 'Successful',
        className: 'tx-success'
      };
    case TxStatus.FAILURE:
      return {
        icon: '❌',
        message: 'Failed',
        className: 'tx-failure'
      };
    case TxStatus.REJECTED:
      return {
        icon: '🚫',
        message: 'Rejected',
        className: 'tx-rejected'
      };
    default:
      return {
        icon: '❓',
        message: 'Unknown',
        className: 'tx-unknown'
      };
  }
};

/**
 * Format a transaction hash for display
 */
const formatHash = (hash: string): string => {
  if (!hash) return '';
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

/**
 * Component to display transaction status with visual indicators
 */
export const TransactionStatusIndicator: React.FC<TransactionStatusIndicatorProps> = ({
  status,
  hash,
  blockExplorerUrl,
  compact = false,
  showHash = true,
  className = ''
}) => {
  const { icon, message, className: statusClassName } = getStatusDetails(status);
  
  return (
    <div className={`transaction-status ${statusClassName} ${compact ? 'compact' : ''} ${className}`}>
      <span className="status-icon" title={message}>{icon}</span>
      
      {!compact && (
        <>
          <span className="status-message">Transaction {message}</span>
          
          {showHash && (
            <span className="tx-hash" title={hash}>
              {formatHash(hash)}
            </span>
          )}
          
          {blockExplorerUrl && (
            <a
              href={`${blockExplorerUrl}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-explorer-link"
              title="View on Block Explorer"
            >
              View on Explorer
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionStatusIndicator;
