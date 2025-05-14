/**
 * Transaction Monitoring System
 * 
 * This hook allows tracking of transaction lifecycle and status for better testing 
 * and debugging of smart contract interactions.
 */
import { useState } from 'react';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { Logger } from '../logger';

/**
 * Transaction status enum for better typing
 */
export enum TxStatus {
  INITIAL = 'INITIAL',
  PENDING = 'PENDING',
  MINING = 'MINING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  REJECTED = 'REJECTED'
}

/**
 * Transaction details interface
 */
export interface TxDetails {
  hash: string;
  status: TxStatus;
  receipt?: TransactionReceipt;
  error?: Error;
  confirmedAt?: number;
  metadata?: Record<string, any>;
  events?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}

/**
 * Parse transaction events from receipt and ABI
 * @param receipt Transaction receipt
 * @param contractInterface Contract interface with ABI
 */
export const parseTransactionEvents = (
  receipt?: TransactionReceipt,
  contractInterface?: any
): Array<{ name: string; args: Record<string, any> }> => {
  if (!receipt || !receipt.logs || !contractInterface) {
    return [];
  }

  try {
    const events = receipt.logs
      .map((log) => {
        try {
          const parsedLog = contractInterface.parseLog(log);
          if (parsedLog) {
            // Convert args to a regular object
            const args: Record<string, any> = {};
            for (const key in parsedLog.args) {
              if (isNaN(Number(key))) {
                args[key] = parsedLog.args[key];
              }
            }
            
            return {
              name: parsedLog.name,
              args
            };
          }
          return null;
        } catch (e) {
          // Skip logs that can't be parsed
          return null;
        }
      })
      .filter(Boolean);
      
    return events as Array<{ name: string; args: Record<string, any> }>;
  } catch (error) {
    Logger.error('Error parsing transaction events', error);
    return [];
  }
};

/**
 * Hook to monitor and manage transaction lifecycle
 */
export function useTransactionMonitor() {
  const [transactions, setTransactions] = useState<Record<string, TxDetails>>({});

  /**
   * Track a new transaction and its lifecycle
   */
  const trackTransaction = async (
    txResponse: TransactionResponse, 
    metadata?: Record<string, any>,
    contractInterface?: any
  ): Promise<{
    hash: string;
    status: TxStatus;
    receipt?: TransactionReceipt;
    events?: Array<{ name: string; args: Record<string, any> }>;
    error?: Error;
  }> => {
    // Create initial transaction details
    const txDetails: TxDetails = {
      hash: txResponse.hash,
      status: TxStatus.PENDING,
      metadata
    };
    
    // Update state with pending transaction
    setTransactions(prev => ({
      ...prev,
      [txResponse.hash]: txDetails
    }));
    
    try {
      // Update to mining status
      setTransactions(prev => ({
        ...prev,
        [txResponse.hash]: {
          ...prev[txResponse.hash],
          status: TxStatus.MINING
        }
      }));
      
      // Wait for transaction to be mined
      const receipt = await txResponse.wait();
      
      // Parse events if possible
      const events = parseTransactionEvents(receipt, contractInterface);
      
      // Update with success/failure
      setTransactions(prev => ({
        ...prev,
        [txResponse.hash]: {
          ...prev[txResponse.hash],
          status: receipt.status === 1 ? TxStatus.SUCCESS : TxStatus.FAILURE,
          receipt,
          events,
          confirmedAt: Date.now()
        }
      }));
      
      return {
        hash: txResponse.hash,
        status: receipt.status === 1 ? TxStatus.SUCCESS : TxStatus.FAILURE,
        receipt,
        events
      };
    } catch (error) {
      const errorObj = error as Error;
      
      // Handle user rejection
      if (errorObj.message?.includes('user rejected') || errorObj.message?.includes('user denied')) {
        setTransactions(prev => ({
          ...prev,
          [txResponse.hash]: {
            ...prev[txResponse.hash],
            status: TxStatus.REJECTED,
            error: errorObj
          }
        }));
        return { 
          hash: txResponse.hash, 
          status: TxStatus.REJECTED, 
          error: errorObj 
        };
      }
      
      // Handle other errors
      setTransactions(prev => ({
        ...prev,
        [txResponse.hash]: {
          ...prev[txResponse.hash],
          status: TxStatus.FAILURE,
          error: errorObj
        }
      }));
      
      Logger.error('Transaction failed', {
        hash: txResponse.hash,
        error: errorObj.message
      });
      
      return { 
        hash: txResponse.hash, 
        status: TxStatus.FAILURE, 
        error: errorObj 
      };
    }
  };
  
  /**
   * Get transaction details by hash
   */
  const getTransaction = (hash: string): TxDetails | undefined => {
    return transactions[hash];
  };
  
  /**
   * Get all transactions
   */
  const getAllTransactions = (): Record<string, TxDetails> => {
    return transactions;
  };
  
  /**
   * Get recent transactions, sorted by time
   */
  const getRecentTransactions = (limit = 5): TxDetails[] => {
    return Object.values(transactions)
      .sort((a, b) => {
        const timeA = a.confirmedAt || 0;
        const timeB = b.confirmedAt || 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  };
  
  /**
   * Clear transaction history
   */
  const clearTransactions = (): void => {
    setTransactions({});
  };
  
  /**
   * Add a manually created transaction
   */
  const addTransaction = (txDetails: TxDetails): void => {
    setTransactions(prev => ({
      ...prev,
      [txDetails.hash]: txDetails
    }));
  };
  
  return {
    trackTransaction,
    getTransaction,
    getAllTransactions,
    getRecentTransactions,
    clearTransactions,
    addTransaction,
    transactions
  };
}

export default useTransactionMonitor;
