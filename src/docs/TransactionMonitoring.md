# Transaction Monitoring System

This document provides an overview of the transaction monitoring system implemented in the GMX Interface for World Chain. The system allows for robust tracking of blockchain transactions, providing clear feedback on transaction success or failure.

## Overview

The transaction monitoring system consists of several key components:

1. **Transaction Monitor Hook (`useTransactionMonitor`)**: Core hook that tracks transaction lifecycle and status
2. **Transaction Status Indicator**: Visual component to display transaction status
3. **Transaction Context**: Provider that makes transaction monitoring available throughout the app
4. **Transaction Test Panel**: Development tool for testing and visualizing transactions

## How to Use

### Basic Transaction Tracking

To track a transaction in any component:

```tsx
import { useTransaction } from 'src/context/TransactionContext/TransactionContext';
import { ethers } from 'ethers';

function MyComponent() {
  const { trackTransaction } = useTransaction();
  
  const handleSomeAction = async (): Promise<void> => {
    // Execute your transaction
    const tx = await someContract.someMethod();
    
    // Track the transaction lifecycle
    const result = await trackTransaction(tx);
    
    // result contains final status, receipt, and any errors
    if (result.status === 'SUCCESS') {
      // Handle success
    } else {
      // Handle failure
    }
  };
  
  return (
    // Your component JSX
  );
}
```

### Displaying Transaction Status

Use the TransactionStatusIndicator component to show transaction status:

```tsx
import TransactionStatusIndicator from 'src/components/common/TransactionStatusIndicator';
import { useTransaction } from 'src/context/TransactionContext/TransactionContext';
import { TxStatus } from 'src/lib/transactions/useTransactionMonitor';

interface TransactionStatusProps {
  txHash: string;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({ txHash }) => {
  const { getTransaction } = useTransaction();
  const tx = getTransaction(txHash);
  
  if (!tx) {
    return <div>Transaction not found</div>;
  }
  
  return (
    <TransactionStatusIndicator 
      status={tx.status} 
      hash={tx.hash} 
      blockExplorerUrl="https://worldscan.org" 
    />
  );
}
```

### Transaction Test Panel

During development, you can use the TransactionTestPanel to test smart contract interactions:

1. Import and add to your app:
```tsx
import DevelopmentTools from 'src/components/development/DevelopmentTools';

const App: React.FC = () => {
  return (
    <div>
      {/* Your app content */}
      <DevelopmentTools />
    </div>
  );
}
```

2. The panel will only appear in development mode and allows testing of:
   - Token swaps
   - Position management
   - Simple transfers
   - Transaction monitoring

## Implementation Details

### Transaction Status Enum

Transactions can have the following statuses:

- `INITIAL`: Transaction is being prepared
- `PENDING`: Transaction has been submitted but not yet mined
- `MINING`: Transaction is being mined
- `SUCCESS`: Transaction was successfully mined
- `FAILURE`: Transaction failed during execution
- `REJECTED`: Transaction was rejected by the user

### Transaction Metadata

Each transaction can store metadata to provide context about what the transaction is doing:

```tsx
await trackTransaction(tx, {
  type: 'swap',
  fromToken: 'ETH',
  toToken: 'USDC',
  amount: '0.1'
});
```

### Event Parsing

The system can parse events from transaction receipts if a contract interface is provided:

```tsx
await trackTransaction(tx, metadata, contractInterface);
```

## Integration with Environment Variables

The transaction monitoring system integrates with the environment utilities:

- In production mode (when `VITE_USE_PRODUCTION_MODE` is true), development tools are hidden
- Block explorer URLs are derived from chain configuration
- RPC URLs are obtained through the environment utilities

## Security Considerations

- The system never exposes private keys or sensitive information
- All transactions require user confirmation via their wallet
- Error handling is comprehensive to prevent uncaught exceptions

## Type Safety

The transaction monitoring system is fully type-safe and follows these principles:

- All function return types are explicitly defined
- Strict null checks are enforced
- No use of `any` types
- Exhaustive checks in switch/case statements
