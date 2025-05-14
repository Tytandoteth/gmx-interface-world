/**
 * World Chain Boot Logger
 * Logs environmental configuration on application startup
 * Helps identify environment/configuration-related issues
 */

import { WorldLogger } from '../debug';
import { reportConfigValidation } from './configurationValidator';

// Function to check if running in development or production
const isDevEnvironment = (): boolean => import.meta.env.DEV === true;

// Function to log the app environment
const logAppEnvironment = (): void => {
  const environment = isDevEnvironment() ? 'Development' : 'Production';
  
  WorldLogger.info(`Running in ${environment} mode`);
  WorldLogger.info(`Build date: ${new Date().toISOString()}`);
  WorldLogger.info(`Log level: ${import.meta.env.VITE_APP_LOG_LEVEL || 'default'}`);
};

// Function to check for existence of required global libraries
const checkGlobalLibraries = (): void => {
  // Check for ethers
  if (typeof window.ethers === 'undefined') {
    WorldLogger.warn('ethers library not found in global scope');
  } 
  
  // Check for React
  if (typeof window.React === 'undefined') {
    WorldLogger.debug('React not exposed in global scope (this is normal)');
  }
  
  // Check for wagmi
  try {
    // This will throw if wagmi is not properly initialized
    const wagmiCheck = window.__WAGMI_STORE;
    WorldLogger.debug('wagmi appears to be initialized');
  } catch (error) {
    WorldLogger.warn('wagmi store not initialized properly');
  }
};

// Function to log chain configuration
const logChainConfiguration = (): void => {
  const chainUrl = import.meta.env.VITE_APP_WORLD_CHAIN_URL || 'not set';
  const oracleUrl = import.meta.env.VITE_APP_ORACLE_KEEPER_URL || 'not set';
  const prodMode = import.meta.env.VITE_APP_USE_PRODUCTION_MODE === 'true';
  
  WorldLogger.info('World Chain Configuration:', {
    rpcUrl: chainUrl,
    oracleKeeperUrl: oracleUrl,
    productionMode: prodMode
  });
  
  // Log contract addresses in production mode
  if (prodMode) {
    WorldLogger.info('Contract Addresses:', {
      vault: import.meta.env.VITE_APP_WORLD_VAULT_ADDRESS || 'not set',
      router: import.meta.env.VITE_APP_WORLD_ROUTER_ADDRESS || 'not set',
      positionRouter: import.meta.env.VITE_APP_WORLD_POSITION_ROUTER_ADDRESS || 'not set',
      priceFeed: import.meta.env.VITE_APP_WORLD_VAULT_PRICE_FEED_ADDRESS || 'not set'
    });
    
    WorldLogger.info('Token Addresses:', {
      WLD: import.meta.env.VITE_APP_WORLD_WLD_TOKEN || 'not set',
      ETH: import.meta.env.VITE_APP_WORLD_ETH_TOKEN || 'not set',
      USDC: import.meta.env.VITE_APP_WORLD_USDC_TOKEN || 'not set'
    });
  }
};

// Function to log import issues
const logImportDiagnostics = (): void => {
  // Create a list of expected imports and check if they're available
  const criticalImports = [
    { name: 'ethers', check: () => typeof window.ethers !== 'undefined' },
    { name: 'react', check: () => typeof window.React !== 'undefined' },
    { name: 'wagmi', check: () => typeof window.__WAGMI_STORE !== 'undefined' }
  ];
  
  // Log results
  criticalImports.forEach(imp => {
    try {
      const available = imp.check();
      WorldLogger.debug(`Import diagnostic: ${imp.name} is ${available ? 'available' : 'unavailable'}`);
    } catch (error) {
      WorldLogger.warn(`Import diagnostic failed for ${imp.name}:`, error);
    }
  });
};

/**
 * Boot logger main function - call this during app initialization
 */
export const logStartupDiagnostics = (): void => {
  WorldLogger.info('============ WORLD CHAIN BOOT SEQUENCE ============');
  
  try {
    // Log application environment
    logAppEnvironment();
    
    // Check global libraries
    if (typeof window !== 'undefined') {
      checkGlobalLibraries();
    }
    
    // Log chain configuration
    logChainConfiguration();
    
    // Run configuration validation
    reportConfigValidation();
    
    // Log import diagnostics
    if (typeof window !== 'undefined') {
      logImportDiagnostics();
    }
    
    WorldLogger.info('Boot sequence completed successfully');
  } catch (error) {
    WorldLogger.error('Boot sequence failed with error:', error);
  }
  
  WorldLogger.info('===============================================');
};
