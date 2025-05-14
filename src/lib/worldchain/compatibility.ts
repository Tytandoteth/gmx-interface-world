/**
 * World Chain Compatibility Layer
 * Provides shims and compatibility fixes for missing or incompatible modules
 */

import { ethers } from 'ethers';
import { WorldLogger } from '../debug';

/**
 * Ethers compatibility layer
 * Provides utilities that may be missing in ethers v6
 */
export const ethersUtils = {
  /**
   * Parse units - Compatibility function for ethers v6
   * @param value Value to parse
   * @param decimals Number of decimals
   * @returns BigInt representation of the value
   */
  parseUnits: (value: string, decimals: number): bigint => {
    // Check for ethers v6 or v5 format
    if (typeof ethers.parseUnits === 'function') {
      // Ethers v6
      return ethers.parseUnits(value, decimals);
    } else if (typeof ethers.utils?.parseUnits === 'function') {
      // Ethers v5
      return BigInt(ethers.utils.parseUnits(value, decimals).toString());
    } else {
      // Fallback implementation
      WorldLogger.warn('Using fallback parseUnits implementation - ethers utilities not found');
      const [whole, fraction = ''] = value.split('.');
      const paddedFraction = fraction.padEnd(decimals, '0');
      const truncatedFraction = paddedFraction.slice(0, decimals);
      return BigInt(whole + truncatedFraction);
    }
  },
  
  /**
   * Format units - Compatibility function for ethers v6
   * @param value BigInt value to format
   * @param decimals Number of decimals
   * @returns Formatted string representation
   */
  formatUnits: (value: bigint | string, decimals: number): string => {
    // Check for ethers v6 or v5 format
    if (typeof ethers.formatUnits === 'function') {
      // Ethers v6
      return ethers.formatUnits(value, decimals);
    } else if (typeof ethers.utils?.formatUnits === 'function') {
      // Ethers v5
      return ethers.utils.formatUnits(value.toString(), decimals);
    } else {
      // Fallback implementation
      WorldLogger.warn('Using fallback formatUnits implementation - ethers utilities not found');
      const valueStr = value.toString();
      
      if (valueStr.length <= decimals) {
        return `0.${'0'.repeat(decimals - valueStr.length)}${valueStr}`;
      }
      
      const wholePart = valueStr.slice(0, valueStr.length - decimals);
      const fractionPart = valueStr.slice(valueStr.length - decimals);
      return `${wholePart}.${fractionPart}`;
    }
  }
};

/**
 * A compatibility layer for the helperToast utility
 * Provides a fallback if the original is not available
 */
export const compatHelperToast = {
  success: (content: string | JSX.Element): void => {
    try {
      // Try to import the real helperToast
      const realHelperToast = require('../../lib/legacy').helperToast;
      if (realHelperToast && typeof realHelperToast.success === 'function') {
        realHelperToast.success(content);
        return;
      }
    } catch (error) {
      WorldLogger.debug('Original helperToast not available, using fallback');
    }
    
    // Fallback implementation
    console.log('%c✅ Success: ', 'color: green; font-weight: bold;', content);
    
    // If react-toastify is available, use it
    try {
      const { toast } = require('react-toastify');
      if (typeof toast?.success === 'function') {
        toast.success(content);
      }
    } catch (error) {
      // toast not available, just use console
    }
  },
  
  error: (content: string | JSX.Element): void => {
    try {
      // Try to import the real helperToast
      const realHelperToast = require('../../lib/legacy').helperToast;
      if (realHelperToast && typeof realHelperToast.error === 'function') {
        realHelperToast.error(content);
        return;
      }
    } catch (error) {
      WorldLogger.debug('Original helperToast not available, using fallback');
    }
    
    // Fallback implementation
    console.error('%c❌ Error: ', 'color: red; font-weight: bold;', content);
    
    // If react-toastify is available, use it
    try {
      const { toast } = require('react-toastify');
      if (typeof toast?.error === 'function') {
        toast.error(content);
      }
    } catch (error) {
      // toast not available, just use console
    }
  }
};

/**
 * Formatting utilities for numeric values and amounts
 */
export const formatUtils = {
  /**
   * Format amount with specified precision
   * @param amount Amount to format
   * @param decimals Decimal places to display
   * @param displayDecimals Number of decimals to display
   * @param useCommas Whether to use commas as thousands separators
   * @returns Formatted string
   */
  formatAmount: (
    amount: number | undefined, 
    decimals: number = 18, 
    displayDecimals: number = 2, 
    useCommas: boolean = true
  ): string => {
    try {
      // Try to import the real formatAmount
      const realFormatAmount = require('../../lib/legacy').formatAmount;
      if (typeof realFormatAmount === 'function') {
        return realFormatAmount(amount, decimals, displayDecimals, useCommas);
      }
    } catch (error) {
      WorldLogger.debug('Original formatAmount not available, using fallback');
    }
    
    // Fallback implementation
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '0';
    }
    
    const amountStr = amount.toFixed(displayDecimals);
    
    if (!useCommas) {
      return amountStr;
    }
    
    // Add commas for thousands separators
    const parts = amountStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  },
  
  /**
   * Default USD decimals
   */
  USD_DECIMALS: 30
};

/**
 * Utilities for checking and warning about missing dependencies
 */
export const depCheck = {
  /**
   * Check if a module is available
   * @param modulePath Module path to check
   * @returns true if available, false otherwise
   */
  checkModule: (modulePath: string): boolean => {
    try {
      require(modulePath);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Log missing dependencies
   */
  logMissingDeps: (): void => {
    const criticalDeps = [
      { name: 'ethers', path: 'ethers' },
      { name: 'react', path: 'react' },
      { name: 'styled-components', path: 'styled-components' },
      { name: 'useWorldChainTrading', path: '../../context/WorldChainTradingContext/WorldChainTradingContext' }
    ];
    
    const missing = criticalDeps.filter(dep => !depCheck.checkModule(dep.path));
    
    if (missing.length > 0) {
      WorldLogger.error('Missing critical dependencies:', missing.map(d => d.name).join(', '));
    } else {
      WorldLogger.info('All critical dependencies available');
    }
  }
};
