/**
 * Network Error Codes
 * Standardized error codes for network-related issues
 */
export enum NetworkErrorCode {
  // Network connection errors
  WRONG_NETWORK = 'WRONG_NETWORK',
  NO_WALLET = 'NO_WALLET',
  DISCONNECTED = 'DISCONNECTED',
  
  // Contract errors
  CONTRACT_UNAVAILABLE = 'CONTRACT_UNAVAILABLE',
  METHOD_NOT_SUPPORTED = 'METHOD_NOT_SUPPORTED',
  
  // Transaction errors
  TX_REJECTED = 'TX_REJECTED',
  TX_FAILED = 'TX_FAILED',
  TX_OUT_OF_GAS = 'TX_OUT_OF_GAS',
  
  // Execution errors
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  EXECUTION_REVERTED = 'EXECUTION_REVERTED',
  
  // Unknown error
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Network Error Class
 * Extended Error class with network-specific properties
 */
export class NetworkError extends Error {
  code: NetworkErrorCode;
  
  constructor(message: string, code: NetworkErrorCode = NetworkErrorCode.UNKNOWN_ERROR) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    
    // This is needed for instanceof to work correctly when extending built-in classes
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
  
  /**
   * Returns true if this error is related to wrong network connection
   */
  isNetworkMismatch(): boolean {
    return this.code === NetworkErrorCode.WRONG_NETWORK;
  }
  
  /**
   * Returns true if this error is related to wallet connection
   */
  isWalletError(): boolean {
    return this.code === NetworkErrorCode.NO_WALLET || 
           this.code === NetworkErrorCode.DISCONNECTED;
  }
  
  /**
   * Returns true if this error is related to contracts
   */
  isContractError(): boolean {
    return this.code === NetworkErrorCode.CONTRACT_UNAVAILABLE || 
           this.code === NetworkErrorCode.METHOD_NOT_SUPPORTED;
  }
  
  /**
   * Returns true if this error is related to transaction execution
   */
  isTransactionError(): boolean {
    return this.code === NetworkErrorCode.TX_REJECTED || 
           this.code === NetworkErrorCode.TX_FAILED ||
           this.code === NetworkErrorCode.TX_OUT_OF_GAS;
  }
  
  /**
   * Returns a user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case NetworkErrorCode.WRONG_NETWORK:
        return 'Please connect to World Chain network to continue.';
      case NetworkErrorCode.NO_WALLET:
        return 'Please connect your wallet to continue.';
      case NetworkErrorCode.DISCONNECTED:
        return 'Your wallet is disconnected. Please reconnect to continue.';
      case NetworkErrorCode.CONTRACT_UNAVAILABLE:
        return 'Contract not available. Please try again later.';
      case NetworkErrorCode.METHOD_NOT_SUPPORTED:
        return 'This operation is not supported.';
      case NetworkErrorCode.TX_REJECTED:
        return 'Transaction was rejected. Please try again.';
      case NetworkErrorCode.TX_FAILED:
        return 'Transaction failed. Please try again later.';
      case NetworkErrorCode.TX_OUT_OF_GAS:
        return 'Transaction ran out of gas. Please try with higher gas limit.';
      case NetworkErrorCode.EXECUTION_ERROR:
      case NetworkErrorCode.EXECUTION_REVERTED:
        return 'Transaction execution failed. Please try again later.';
      default:
        return this.message || 'An unknown error occurred.';
    }
  }
}
