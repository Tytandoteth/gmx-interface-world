/**
 * Transaction Context
 * 
 * Provides access to transaction monitoring functionality throughout the application.
 * This allows any component to track and display the status of blockchain transactions.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import useTransactionMonitor, { TxDetails, TxStatus } from '../../lib/transactions/useTransactionMonitor';

// Define the context properties
interface TransactionContextType {
  // Transaction monitoring functions
  trackTransaction: ReturnType<typeof useTransactionMonitor>['trackTransaction'];
  getTransaction: ReturnType<typeof useTransactionMonitor>['getTransaction'];
  getAllTransactions: ReturnType<typeof useTransactionMonitor>['getAllTransactions'];
  getRecentTransactions: ReturnType<typeof useTransactionMonitor>['getRecentTransactions'];
  clearTransactions: ReturnType<typeof useTransactionMonitor>['clearTransactions'];
  addTransaction: ReturnType<typeof useTransactionMonitor>['addTransaction'];
  transactions: Record<string, TxDetails>;
}

// Create the context with default values
const TransactionContext = createContext<TransactionContextType>({
  trackTransaction: async () => ({ 
    hash: '', 
    status: TxStatus.INITIAL, 
    error: new Error('Context not initialized') 
  }),
  getTransaction: () => undefined,
  getAllTransactions: () => ({}),
  getRecentTransactions: () => [],
  clearTransactions: () => {},
  addTransaction: () => {},
  transactions: {}
});

// Props for the provider component
interface TransactionProviderProps {
  children: ReactNode;
}

/**
 * Provider component for transaction monitoring functionality
 */
export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const {
    trackTransaction,
    getTransaction,
    getAllTransactions,
    getRecentTransactions,
    clearTransactions,
    addTransaction,
    transactions
  } = useTransactionMonitor();
  
  // Create the context value
  const contextValue: TransactionContextType = {
    trackTransaction,
    getTransaction,
    getAllTransactions,
    getRecentTransactions,
    clearTransactions,
    addTransaction,
    transactions
  };
  
  return (
    <TransactionContext.Provider value={contextValue}>
      {children}
    </TransactionContext.Provider>
  );
};

/**
 * Hook to use the transaction context
 */
export const useTransaction = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  
  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  
  return context;
};

export default TransactionContext;
